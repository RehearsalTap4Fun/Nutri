import { describe, expect, it } from 'vitest'
import { decryptJson, deriveKeys, encryptJson, generateSyncCode, normalizeSyncCode } from '../src/sync/crypto'
import { applySyncState, fingerprint, mergeSync, toSyncState } from '../src/sync/merge'
import type { SyncState } from '../src/sync/merge'
import { syncOnce } from '../src/sync/client'
import { defaultState } from '../src/store/storage'
import type { AppState } from '../src/store/storage'
import type { LogEntry } from '../src/core/types'

const CODE = 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ'

describe('同步码与加密', () => {
  it('生成 6 组 4 位、可归一化、大小写与连字符无关', () => {
    const c = generateSyncCode()
    expect(c).toMatch(/^[2-9A-HJ-NP-Z]{4}(-[2-9A-HJ-NP-Z]{4}){5}$/)
    expect(normalizeSyncCode(c.toLowerCase().replace(/-/g, ' '))).toBe(c)
    expect(normalizeSyncCode('short')).toBeNull()
    expect(normalizeSyncCode(CODE)).toBe(CODE)
  })
  it('加解密往返，密钥与 id 由同步码决定，错码解不开', () => {
    const k = deriveKeys(CODE)
    expect(k.id).toMatch(/^[a-f0-9]{64}$/)
    expect(deriveKeys(CODE.toLowerCase()).id).toBe(k.id)
    const blob = encryptJson(k, { a: 1, 中文: '好' })
    expect(blob.startsWith('v1.')).toBe(true)
    expect(decryptJson(k, blob)).toEqual({ a: 1, 中文: '好' })
    const other = deriveKeys('ABCD-EFGH-JKLM-NPQR-STUV-WXY2')
    expect(other.id).not.toBe(k.id)
    expect(() => decryptJson(other, blob)).toThrow()
  })
})

function st(over: Partial<SyncState> = {}): SyncState {
  return { ...toSyncState(defaultState()), ...over }
}
const e = (id: string, updatedAt?: number): LogEntry => ({ id, date: '2026-09-07', slot: 'lunch', dishId: 'st_rice', portion: 1, ...(updatedAt ? { updatedAt } : {}) } as LogEntry)

const T = Date.now() - 3600_000

describe('合并', () => {
  it('按 id 取并集，同 id 取 updatedAt 大的，墓碑删除', () => {
    const local = st({ entries: [e('a', T + 10), e('b', T + 5)], tombstones: [{ coll: 'entries', id: 'c', at: T + 100 }] })
    const remote = st({ entries: [e('b', T + 9), e('c', T + 50), e('d')] })
    const m = mergeSync(local, remote)
    const ids = m.entries.map((x) => x.id).sort()
    expect(ids).toEqual(['a', 'b', 'd'])
    expect(m.entries.find((x) => x.id === 'b')!.updatedAt).toBe(T + 9)
    expect(m.tombstones).toEqual([{ coll: 'entries', id: 'c', at: T + 100 }])
  })
  it('墓碑早于记录的再次修改则记录保留；集合并集；档案按时间取新', () => {
    const local = st({ entries: [e('a', T + 200)], tombstones: [{ coll: 'entries', id: 'a', at: T + 100 }], favorites: ['x'], meta: { profileAt: 1, settingsAt: 5 }, settings: { useAdaptiveTdee: true, provider: 'deepseek' } })
    const remote = st({ favorites: ['y'], meta: { profileAt: 2, settingsAt: 3 }, profile: { ...defaultProfile(), heightCm: 180 }, settings: { useAdaptiveTdee: false, provider: 'anthropic' } })
    const m = mergeSync(local, remote)
    expect(m.entries.map((x) => x.id)).toEqual(['a'])
    expect(m.favorites.sort()).toEqual(['x', 'y'])
    expect(m.profile?.heightCm).toBe(180)
    expect(m.settings.provider).toBe('deepseek')
    expect(m.meta).toEqual({ profileAt: 2, settingsAt: 5 })
  })
  it('指纹忽略顺序', () => {
    expect(fingerprint(st({ entries: [e('a'), e('b')] }))).toBe(fingerprint(st({ entries: [e('b'), e('a')] })))
  })
})

function defaultProfile() {
  return { sex: 'male' as const, birthYear: 1990, heightCm: 172, weightKg: 68, activity: 'light' as const, goal: 'maintain' as const, dietStyle: 'chinese' as const, mealsPerDay: 3 as const, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [] }
}

/** 内存版同步服务，模拟真实接口与 409 */
function fakeServer() {
  const store = new Map<string, { version: number; blob: string | null; updatedAt: number }>()
  const f: typeof fetch = async (input, init) => {
    const url = String(input)
    const m = url.match(/\/sync\/([a-f0-9]{64})/)
    const id = m![1]
    const cur = store.get(id) || { version: 0, blob: null, updatedAt: 0 }
    if (!init || !init.method || init.method === 'GET') return new Response(JSON.stringify(cur), { status: 200 })
    if (init.method === 'PUT') {
      const j = JSON.parse(String(init.body))
      if (j.baseVersion !== cur.version) return new Response(JSON.stringify(cur), { status: 409 })
      const rec = { version: cur.version + 1, blob: j.blob, updatedAt: Date.now() }
      store.set(id, rec)
      return new Response(JSON.stringify({ version: rec.version, updatedAt: rec.updatedAt }), { status: 200 })
    }
    return new Response('{}', { status: 405 })
  }
  return { f, store }
}

describe('两台设备同步', () => {
  it('A 推送，B 拉到并合并自己的记录，A 再拉到 B 的', async () => {
    const { f } = fakeServer()
    let a: AppState = { ...defaultState(), profile: defaultProfile(), entries: [e('a1', 1)] }
    let b: AppState = { ...defaultState(), entries: [e('b1', 2)] }
    const r1 = await syncOnce(a, CODE, { fetchImpl: f, apiBase: 'http://x/api' })
    expect(r1.pushed).toBe(true)
    a = r1.state
    const r2 = await syncOnce(b, CODE, { fetchImpl: f, apiBase: 'http://x/api' })
    b = r2.state
    expect(r2.pushed).toBe(true)
    expect(b.entries.map((x) => x.id).sort()).toEqual(['a1', 'b1'])
    expect(b.profile?.heightCm).toBe(172)
    const r3 = await syncOnce(a, CODE, { fetchImpl: f, apiBase: 'http://x/api' })
    expect(r3.pulledChanges).toBe(true)
    expect(r3.pushed).toBe(false)
    expect(r3.state.entries.map((x) => x.id).sort()).toEqual(['a1', 'b1'])
    // 无变化时不推
    const r4 = await syncOnce(r3.state, CODE, { fetchImpl: f, apiBase: 'http://x/api' })
    expect(r4.pushed).toBe(false)
    expect(r4.pulledChanges).toBe(false)
    expect(applySyncState(r4.state, toSyncState(r4.state)).entries.length).toBe(2)
  })
})
