/**
 * 自动同步：回到前台拉一次，状态变化后防抖上传。口径与网页版一致。
 *
 * 两个要点：
 *  - **不能一变就传**，否则每敲一下都在发请求。用指纹判断「同步相关的数据」是否真的变了，
 *    再防抖 4 秒。改主题、切 tab 这类不进 SyncState 的变化不会触发。
 *  - **同步自己会写状态**，写完又会触发订阅。所以推送成功后先记下新指纹，
 *    再写状态；订阅回调看到指纹没变就不会再排一次，避免自激。
 */
import { adoptSynced, fingerprint, toSyncState } from '@sync/merge'
import type { AppState } from './state'
import { getState, setState, subscribe } from './state'
import { runSync } from './sync'

const DEBOUNCE_MS = 4000

let timer: ReturnType<typeof setTimeout> | null = null
let lastFp = ''
let running = false
let started = false

/** 最近一次自动同步的结果，给界面显示用 */
export interface AutoSyncStatus {
  at: number
  ok: boolean
  detail: string
}
let status: AutoSyncStatus | null = null
const watchers = new Set<(s: AutoSyncStatus) => void>()

export function getAutoSyncStatus(): AutoSyncStatus | null {
  return status
}

export function watchAutoSync(fn: (s: AutoSyncStatus) => void): () => void {
  watchers.add(fn)
  return () => {
    watchers.delete(fn)
  }
}

function report(ok: boolean, detail: string): void {
  status = { at: Date.now(), ok, detail }
  for (const w of watchers) w(status)
}

function syncable(s: AppState): string | null {
  const { code, enabled } = s.settings.sync
  return enabled && code ? code : null
}

/** 跑一轮。自动触发时失败只记录不打扰，手动入口自己弹窗 */
export async function autoSyncNow(): Promise<void> {
  if (running) return
  const before = getState()
  const code = syncable(before)
  if (!code) return

  running = true
  try {
    const r = await runSync(before, code)
    // 先记指纹再写状态，避免写状态触发订阅又排一次同步
    lastFp = fingerprint(toSyncState(r.state))
    // r.state 是按发起时的快照算的，不能直接替换：往返这几秒里新记的会被冲掉
    if (r.pulledChanges) setState((s) => adoptSynced(s, r.state))
    // 这期间的改动排的那次同步被 running 挡掉了；和刚同步的不一样就补排一次
    schedule(getState())
    report(true, r.pulledChanges ? '已拉到云端改动' : r.pushed ? '已上传' : '已是最新')
  } catch (e) {
    report(false, e instanceof Error ? e.message : String(e))
  } finally {
    running = false
  }
}

function schedule(s: AppState): void {
  if (!syncable(s)) return
  const fp = fingerprint(toSyncState(s))
  if (fp === lastFp) return
  lastFp = fp
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void autoSyncNow()
  }, DEBOUNCE_MS)
}

/** 应用启动时调一次 */
export function startAutoSync(): void {
  if (started) return
  started = true
  lastFp = fingerprint(toSyncState(getState()))
  subscribe(schedule)
}

/** 回到前台时调 */
export function autoSyncOnShow(): void {
  if (!syncable(getState())) return
  void autoSyncNow()
}

/** 手动改了同步设置后，让下一次变化一定会触发 */
export function resetAutoSyncFingerprint(): void {
  lastFp = ''
}
