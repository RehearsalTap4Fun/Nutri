/**
 * 小程序自动同步的竞态：同步往返那几秒里新记的一笔不能丢。
 *
 * 起因：同步回来后直接用「发起那一刻的快照算出的结果」替换整份状态，中途记的一餐被冲掉；
 * 紧接着指纹又记成了同步结果的，之后也不会再触发同步，这一笔就永久没了。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppState } from '../src/store/storage'
import type { LogEntry } from '../src/core/types'

const store = new Map<string, string>()
vi.mock('../miniprogram/node_modules/@tarojs/taro', () => ({
  default: {
    getStorageSync: (k: string) => store.get(k) || '',
    setStorageSync: (k: string, v: string) => { store.set(k, v) },
  },
}))

// runSync 换成手动放行的假实现：记下被调用时拿到的状态，由测试决定返回什么
let pending: { state: AppState; resolve: (r: { state: AppState; pulledChanges: boolean; pushed: boolean; version: number }) => void }[] = []
vi.mock('../miniprogram/src/shared/sync', () => ({
  runSync: (state: AppState) => new Promise((resolve) => { pending.push({ state, resolve }) }),
}))

const entry = (id: string, date = '2026-09-24'): LogEntry => ({ id, updatedAt: 1, date, slot: 'lunch', dishId: 'd1', portion: 1 } as unknown as LogEntry)

beforeEach(() => {
  store.clear()
  pending = []
  vi.resetModules()
  vi.useFakeTimers()
})

async function load() {
  const state = await import('../miniprogram/src/shared/state')
  const auto = await import('../miniprogram/src/shared/autoSync')
  state.setState((s) => ({ ...s, settings: { ...s.settings, sync: { code: 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ', enabled: true } } }))
  auto.startAutoSync()
  return { ...state, ...auto }
}

describe('小程序自动同步', () => {
  it('拉到云端改动时，与同步期间新记的一笔合并，而不是覆盖', async () => {
    const m = await load()
    const run = m.autoSyncNow()
    expect(pending).toHaveLength(1)
    // 同步在路上，用户又记了一笔
    m.setState((s) => ({ ...s, entries: [...s.entries, entry('local-new')] }))
    // 云端带回另一台设备的一笔
    pending[0].resolve({ state: { ...pending[0].state, entries: [entry('remote')] }, pulledChanges: true, pushed: false, version: 2 })
    await run
    expect(m.getState().entries.map((e: { id: string }) => e.id).sort()).toEqual(['local-new', 'remote'])
  })

  it('没拉到改动时，同步期间的新记录保留，并补排一次上传', async () => {
    const m = await load()
    const run = m.autoSyncNow()
    m.setState((s) => ({ ...s, entries: [...s.entries, entry('local-new')] }))
    // 这时订阅排的同步到点会撞上 running 被丢掉
    await vi.advanceTimersByTimeAsync(5000)
    pending[0].resolve({ state: pending[0].state, pulledChanges: false, pushed: true, version: 2 })
    await run
    expect(m.getState().entries.map((e: { id: string }) => e.id)).toEqual(['local-new'])
    await vi.advanceTimersByTimeAsync(5000)
    expect(pending).toHaveLength(2)
    expect(pending[1].state.entries.map((e: { id: string }) => e.id)).toEqual(['local-new'])
  })
})
