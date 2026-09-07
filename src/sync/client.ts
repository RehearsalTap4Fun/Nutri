// 同步客户端：拉取 → 合并 → 需要时推送（版本冲突就再拉再合并再推）。
import type { AppState } from '../store/storage'
import { decryptJson, deriveKeys, encryptJson } from './crypto'
import type { SyncKeys } from './crypto'
import { applySyncState, fingerprint, mergeSync, toSyncState } from './merge'
import type { SyncState } from './merge'

export interface RemoteRec {
  version: number
  blob: string | null
  updatedAt: number
}

export interface SyncResult {
  state: AppState
  version: number
  pushed: boolean
  pulledChanges: boolean
}

export class SyncError extends Error {
  constructor(message: string, public readonly kind: 'network' | 'server' | 'decrypt' | 'conflict') {
    super(message)
  }
}

async function getRemote(base: string, id: string, f: typeof fetch): Promise<RemoteRec> {
  let res: Response
  try { res = await f(`${base}/sync/${id}?t=${Date.now()}`, { cache: 'no-store' }) } catch (e) { throw new SyncError('连不上同步服务：' + (e instanceof Error ? e.message : String(e)), 'network') }
  if (!res.ok) throw new SyncError(`同步服务返回 ${res.status}`, 'server')
  return (await res.json()) as RemoteRec
}

async function putRemote(base: string, id: string, blob: string, baseVersion: number, f: typeof fetch): Promise<{ ok: true; version: number } | { ok: false; current: RemoteRec }> {
  let res: Response
  try { res = await f(`${base}/sync/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blob, baseVersion }) }) } catch (e) { throw new SyncError('推送失败：' + (e instanceof Error ? e.message : String(e)), 'network') }
  if (res.status === 409) return { ok: false, current: (await res.json()) as RemoteRec }
  if (!res.ok) throw new SyncError(`同步服务返回 ${res.status}`, 'server')
  const j = (await res.json()) as { version: number }
  return { ok: true, version: j.version }
}

function decode(keys: SyncKeys, rec: RemoteRec): SyncState | null {
  if (!rec.blob) return null
  try { return decryptJson<SyncState>(keys, rec.blob) } catch { throw new SyncError('云端数据解不开：同步码不对，或数据已损坏', 'decrypt') }
}

/**
 * 跑一轮同步。fetchImpl 便于测试注入；apiBase 默认相对当前页面（/nutri/ → /nutri/api）。
 */
export async function syncOnce(state: AppState, code: string, opts: { fetchImpl?: typeof fetch; apiBase?: string } = {}): Promise<SyncResult> {
  const f = opts.fetchImpl || fetch
  const base = (opts.apiBase || './api').replace(/\/$/, '')
  const keys = deriveKeys(code)
  const local = toSyncState(state)
  let remoteRec = await getRemote(base, keys.id, f)
  let pushed = false
  for (let attempt = 0; attempt < 4; attempt++) {
    const remote = decode(keys, remoteRec)
    const merged = remote ? mergeSync(local, remote) : local
    const mergedFp = fingerprint(merged)
    const needPush = !remote || mergedFp !== fingerprint(remote)
    const pulledChanges = mergedFp !== fingerprint(local)
    if (!needPush) return { state: pulledChanges ? applySyncState(state, merged) : state, version: remoteRec.version, pushed, pulledChanges }
    const r = await putRemote(base, keys.id, encryptJson(keys, merged), remoteRec.version, f)
    if (r.ok) { pushed = true; return { state: pulledChanges ? applySyncState(state, merged) : state, version: r.version, pushed, pulledChanges } }
    remoteRec = r.current
  }
  throw new SyncError('多次版本冲突，稍后再试', 'conflict')
}

/** 关闭同步时可选择删除云端副本 */
export async function deleteRemote(code: string, opts: { fetchImpl?: typeof fetch; apiBase?: string } = {}): Promise<void> {
  const f = opts.fetchImpl || fetch
  const base = (opts.apiBase || './api').replace(/\/$/, '')
  const keys = deriveKeys(code)
  await f(`${base}/sync/${keys.id}`, { method: 'DELETE' })
}
