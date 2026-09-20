/**
 * 小程序侧的云同步。
 *
 * 加密、合并、冲突重试全部复用网页版的 `src/sync/`，这里只做两件事：
 *  1. 补上小程序缺的几个全局（见 cryptoPolyfill）
 *  2. 给 `syncOnce` 喂一个 fetch 形状的适配器，把请求转给云函数
 *
 * 云函数在服务端出网，不受小程序域名白名单限制，所以能直接读写现有那台同步服务，
 * 也就是说**小程序和网页版是同一份数据**，用同一个同步码就能对上。
 */
import Taro from '@tarojs/taro'
import { syncOnce, deleteRemote, SyncError } from '@sync/client'
import { generateSyncCode, normalizeSyncCode } from '@sync/crypto'
import type { AppState } from './state'
import { ensureEntropy, installCryptoPolyfill } from './cryptoPolyfill'

export { generateSyncCode, normalizeSyncCode, SyncError }

const CLOUD_FN = 'sync'

interface CloudApi {
  init: (o?: unknown) => void
  callFunction: (o: unknown) => Promise<{ result: unknown }>
}

/**
 * 云开发的入口是宿主的 `wx.cloud`。
 * 注意 **Taro 4 并没有把它代理成 `Taro.cloud`**，取那个会是 undefined，
 * 第一版就栽在这里，报「调不通云函数」。
 */
function getCloud(): CloudApi | null {
  const g = globalThis as unknown as { wx?: { cloud?: CloudApi } }
  if (g.wx && g.wx.cloud) return g.wx.cloud
  const viaTaro = (Taro as unknown as { cloud?: CloudApi }).cloud
  return viaTaro || null
}

let cloudReady = false

function initCloud(): CloudApi {
  const cloud = getCloud()
  if (!cloud) {
    throw new SyncError('这个环境没有 wx.cloud：小程序后台要先开通云开发，基础库也要够新', 'network')
  }
  if (!cloudReady) {
    // 不指定 env 就用默认环境；有多个环境时在这里填 env id
    cloud.init({ traceUser: false })
    cloudReady = true
  }
  return cloud
}

/** 把 callFunction 的错误翻译成能照着办的话 */
function explainCallError(e: unknown): string {
  const err = e as { errCode?: number; errMsg?: string; message?: string }
  const msg = err.errMsg || err.message || String(e)
  if (/not found|FUNCTION_NOT_FOUND|404/i.test(msg)) {
    return `云函数 ${CLOUD_FN} 还没部署。在开发者工具里右键 cloud/sync → 上传并部署（云端安装依赖）。原文：${msg}`
  }
  if (/env|environment/i.test(msg)) {
    return `云环境没选对。小程序有多个云环境时要在 src/shared/sync.ts 的 cloud.init 里指定 env。原文：${msg}`
  }
  return `调不通云函数：${msg}`
}

async function callCloud(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; text: string; error?: string }> {
  const cloud = initCloud()
  try {
    const r = await cloud.callFunction({ name: CLOUD_FN, data: { method, path, body } })
    return r.result as { status: number; text: string; error?: string }
  } catch (e) {
    throw new SyncError(explainCallError(e), 'network')
  }
}

/** fetch 形状的适配器。syncOnce 只用到 ok / status / json() 三样 */
const cloudFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const path = String(input)
  const method = (init && init.method) || 'GET'
  const body = init && typeof init.body === 'string' ? JSON.parse(init.body) : undefined

  const result = await callCloud(method, path, body)
  if (!result || result.status === 0) {
    const detail = result && result.error ? result.error : '未知原因'
    throw new SyncError(
      `云函数连不上同步服务（${detail}）。服务器可能没开，或证书过期了。`,
      'network',
    )
  }

  const ok = result.status >= 200 && result.status < 300
  // 409 是版本冲突，客户端要靠它走「再拉一次再合并」的分支，不能在这里抛。
  // 其余错误状态只给一个状态码不够查，把服务端正文一起带出来。
  if (!ok && result.status !== 409) {
    throw new SyncError(`同步服务返回 ${result.status}：${result.text || '（无正文）'}`, 'server')
  }
  return {
    ok,
    status: result.status,
    json: async () => JSON.parse(result.text),
    text: async () => result.text,
  } as unknown as Response
}) as typeof fetch

/**
 * 传 `'/'` 而不是 `''`。
 * `syncOnce` 里写的是 `opts.apiBase || './api'`，空字符串是 falsy，会被当成没传，
 * 路径就成了 `./api/sync/<id>`，云函数的白名单正则不认，直接回 400。
 * `'/'` 是 truthy，末尾斜杠又会被 `replace(/\/$/, '')` 去掉，最终正好是 `/sync/<id>`。
 */
const OPTS = { fetchImpl: cloudFetch, apiBase: '/' }

export interface SyncOutcome {
  state: AppState
  pushed: boolean
  pulledChanges: boolean
}

export async function runSync(state: AppState, code: string): Promise<SyncOutcome> {
  installCryptoPolyfill()
  // noble 取随机数是同步的，而微信只给了异步接口，所以先把熵池灌满
  await ensureEntropy()
  const r = await syncOnce(state, code, OPTS)
  return { state: r.state, pushed: r.pushed, pulledChanges: r.pulledChanges }
}

export async function dropRemote(code: string): Promise<void> {
  installCryptoPolyfill()
  await ensureEntropy()
  await deleteRemote(code, OPTS)
}

/** 生成新同步码也要用真随机 */
export async function newSyncCode(): Promise<string> {
  installCryptoPolyfill()
  await ensureEntropy()
  return generateSyncCode()
}

export interface DiagnoseStep {
  name: string
  ok: boolean
  detail: string
}

/** 逐环节自检，出问题时能一眼看出卡在哪一步 */
export async function diagnose(code: string): Promise<DiagnoseStep[]> {
  const steps: DiagnoseStep[] = []

  const cloud = getCloud()
  steps.push({
    name: '宿主有 wx.cloud',
    ok: !!cloud,
    detail: cloud ? '有' : '没有。小程序后台要先开通云开发',
  })
  if (!cloud) return steps

  try {
    initCloud()
    steps.push({ name: '云开发初始化', ok: true, detail: '成功' })
  } catch (e) {
    steps.push({ name: '云开发初始化', ok: false, detail: String(e) })
    return steps
  }

  try {
    installCryptoPolyfill()
    await ensureEntropy()
    steps.push({ name: '随机数与加密垫片', ok: true, detail: '可用' })
  } catch (e) {
    steps.push({ name: '随机数与加密垫片', ok: false, detail: String(e) })
    return steps
  }

  let id = ''
  try {
    const { deriveKeys } = await import('@sync/crypto')
    id = deriveKeys(code).id
    steps.push({ name: '同步码派生', ok: true, detail: `记录 id ${id.slice(0, 12)}…` })
  } catch (e) {
    steps.push({ name: '同步码派生', ok: false, detail: String(e) })
    return steps
  }

  try {
    const r = await callCloud('GET', `/sync/${id}?t=${Date.now()}`)
    if (r.status === 0) {
      steps.push({
        name: '云函数访问同步服务',
        ok: false,
        detail: `云函数跑起来了，但连不上服务器：${r.error || '未知原因'}`,
      })
    } else {
      steps.push({ name: '云函数访问同步服务', ok: true, detail: `服务器返回 ${r.status}` })
    }
  } catch (e) {
    steps.push({
      name: '调用云函数',
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    })
  }

  return steps
}
