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

let cloudReady = false

function initCloud(): void {
  if (cloudReady) return
  const cloud = (Taro as unknown as { cloud?: { init: (o?: unknown) => void } }).cloud
  if (!cloud) throw new SyncError('这个基础库版本不支持云开发', 'network')
  // 不指定 env 就用默认环境；有多个环境时在这里填 env id
  cloud.init({ traceUser: false })
  cloudReady = true
}

/** fetch 形状的适配器。syncOnce 只用到 ok / status / json() 三样 */
const cloudFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  initCloud()
  const path = String(input)
  const method = (init && init.method) || 'GET'
  const body = init && typeof init.body === 'string' ? JSON.parse(init.body) : undefined

  const cloud = (Taro as unknown as {
    cloud: { callFunction: (o: unknown) => Promise<{ result: unknown }> }
  }).cloud

  let result: { status: number; text: string; error?: string }
  try {
    const r = await cloud.callFunction({ name: CLOUD_FN, data: { method, path, body } })
    result = r.result as { status: number; text: string; error?: string }
  } catch (e) {
    throw new SyncError('调不通云函数：' + (e instanceof Error ? e.message : String(e)), 'network')
  }
  if (!result || result.status === 0) {
    throw new SyncError(result && result.error ? result.error : '连不上同步服务', 'network')
  }

  return {
    ok: result.status >= 200 && result.status < 300,
    status: result.status,
    json: async () => JSON.parse(result.text),
    text: async () => result.text,
  } as unknown as Response
}) as typeof fetch

/** apiBase 留空，路径就是 `/sync/<id>`，正好是云函数放行的形状 */
const OPTS = { fetchImpl: cloudFetch, apiBase: '' }

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
