/**
 * 写操作层（store/actions.ts）：每个操作盖对时间戳，两台设备各改一次、互相同步后能收敛。
 *
 * 起因：两端各写一套写操作时漏盖时间戳——网页记体重不写 updatedAt、拉黑菜品不动 profileAt、
 * 小程序接入已有同步码时反而把 settingsAt 盖成现在——都会让一端的改动在合并时被另一端顶掉。
 */
import { describe, expect, it } from 'vitest'
import * as act from '../src/store/actions'
import { defaultState } from '../src/store/storage'
import type { AppState } from '../src/store/storage'
import { adoptSynced, mergeSync, toSyncState } from '../src/sync/merge'
import type { LogEntry, Profile } from '../src/core/types'

const profile = { sex: 'female', age: 30, heightCm: 165, weightKg: 60, activity: 'light', goal: 'maintain', dislikedDishes: [], conditions: [] } as unknown as Profile
const base = (): AppState => ({ ...defaultState(), profile, meta: { profileAt: 1, settingsAt: 1 } })
const entry = (id: string): LogEntry => ({ id, date: '2026-09-24', slot: 'lunch', dishId: 'd1', portion: 1 })

/** A 和 B 互相同步一轮：各自拿对方的状态合并 */
function syncBoth(a: AppState, b: AppState): [AppState, AppState] {
  const merged = mergeSync(toSyncState(a), toSyncState(b))
  const merged2 = mergeSync(toSyncState(b), toSyncState(a))
  return [adoptSynced(a, fromSync(a, merged)), adoptSynced(b, fromSync(b, merged2))]
}
const fromSync = (s: AppState, st: ReturnType<typeof mergeSync>): AppState => ({ ...s, settings: { ...s.settings, ...st.settings }, profile: st.profile, entries: st.entries, water: st.water, weights: st.weights, vitals: st.vitals as unknown as AppState['vitals'], customFoods: st.customFoods, customDishes: st.customDishes, favorites: st.favorites, trainingDays: st.trainingDays, planSeeds: st.planSeeds, tombstones: st.tombstones, meta: st.meta })

describe('写操作都盖时间戳', () => {
  it('记录的增、改、删、恢复', () => {
    let s = act.addEntries(base(), [entry('e1')], 100)
    expect(s.entries[0].updatedAt).toBe(100)
    s = act.saveEntry(s, { ...entry('e1'), portion: 2 }, 200)
    expect(s.entries).toHaveLength(1)
    expect(s.entries[0]).toMatchObject({ portion: 2, updatedAt: 200 })
    s = act.removeEntries(s, ['e1'], 300)
    expect(s.entries).toHaveLength(0)
    expect(s.tombstones).toEqual([{ coll: 'entries', id: 'e1', at: 300 }])
    s = act.addEntries(s, [entry('e1')], 400)
    expect(s.entries[0].updatedAt).toBe(400)
    expect(s.tombstones).toHaveLength(0)
  })
  it('体重带 updatedAt；记的是最近一天才改档案体重', () => {
    let s = act.setWeight(base(), '2026-09-24', 59, 100)
    expect(s.weights[0].updatedAt).toBe(100)
    expect(s.profile!.weightKg).toBe(59)
    expect(s.meta.profileAt).toBe(100)
    s = act.setWeight(s, '2026-09-01', 62, 200)
    expect(s.profile!.weightKg).toBe(59)
    expect(s.meta.profileAt).toBe(100)
  })
  it('拉黑 / 取消拉黑动 profileAt，重复拉黑不产生改动', () => {
    let s = act.dislikeDish(base(), 'd1', 100)
    expect(s.profile!.dislikedDishes).toEqual(['d1'])
    expect(s.meta.profileAt).toBe(100)
    expect(act.dislikeDish(s, 'd1', 200)).toBe(s)
    s = act.undislikeDish(s, 'd1', 300)
    expect(s.profile!.dislikedDishes).toEqual([])
    expect(s.meta.profileAt).toBe(300)
  })
  it('血压血糖、自定义食物、自建菜都带 updatedAt', () => {
    const s = act.addVital(base(), { id: 'v1', date: '2026-09-24', kind: 'bp', sys: 120, dia: 80 }, 100)
    expect(s.vitals[0].updatedAt).toBe(100)
    const f = act.saveCustomFoods(base(), [{ id: 'f1', name: 'x', serving: '1份', nutrients: { kcal: 1, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 } }], 100)
    expect(f.customFoods[0].updatedAt).toBe(100)
    const d = act.saveCustomDish(base(), { id: 'custom_1', name: 'x', cat: 'main', cuisine: 'cn', cook: 'stir', slots: ['lunch'], parts: [], serving: '1份' } as never, 100)
    expect(d.customDishes[0].updatedAt).toBe(100)
  })
  it('饮水：改总量再撤销，回到原来那条且没有残留墓碑', () => {
    let s = act.setWater(base(), '2026-09-24', 500, 100, 'w1')
    const prev = s.water
    s = act.setWater(s, '2026-09-24', 750, 200, 'w2')
    expect(s.water.map((w) => w.id)).toEqual(['w2'])
    s = act.restoreWater(s, '2026-09-24', prev, 'w2', 300)
    expect(s.water.map((w) => [w.id, w.ml])).toEqual([['w1', 500]])
    expect(s.tombstones).toEqual([{ coll: 'water', id: 'w2', at: 300 }])
  })
})

describe('换一换', () => {
  it('清掉那天的沿用缓存，否则新种子又被旧推荐顶回去', () => {
    const s = { ...base(), planPicks: { '2026-09-24': { lunch: [] }, '2026-09-25': { lunch: [] } } }
    const day = act.reroll(s, ['2026-09-24'])
    expect(day.planSeeds['2026-09-24']).toEqual({ day: 1, meals: {} })
    expect(day.planPicks).toEqual({ '2026-09-25': { lunch: [] } })
    const meal = act.reroll(day, ['2026-09-24'], 'lunch')
    expect(meal.planSeeds['2026-09-24']).toEqual({ day: 1, meals: { lunch: 1 } })
  })
})

describe('两台设备互相同步后收敛', () => {
  it('两边改同一天的体重：后改的那边胜出，两边一致', () => {
    const [a, b] = [act.setWeight(base(), '2026-09-24', 60, 100), act.setWeight(base(), '2026-09-24', 61, 200)]
    const [a2, b2] = syncBoth(a, b)
    expect(a2.weights).toEqual(b2.weights)
    expect(a2.weights[0].kg).toBe(61)
  })
  it('一台拉黑的菜会传到另一台，而不是被另一台的旧档案顶回去', () => {
    const a = act.dislikeDish(base(), 'd1', 100)
    const [, b2] = syncBoth(a, base())
    expect(b2.profile!.dislikedDishes).toEqual(['d1'])
  })
  it('用已有同步码接入的设备，不会用自己的档案和设置盖掉云端的', () => {
    const cloud = act.patchSettings(act.patchProfile(base(), { heightCm: 170 }, 500), { useAdaptiveTdee: true }, 500)
    const joiner = act.enableSync(act.patchProfile(base(), { heightCm: 180 }, 900), 'CODE', 'join', 1000)
    const [j2] = syncBoth(joiner, cloud)
    expect(j2.profile!.heightCm).toBe(170)
    expect(j2.settings.useAdaptiveTdee).toBe(true)
    expect(j2.settings.sync).toEqual({ code: 'CODE', enabled: true })
  })
  it('同步期间新记的一笔，合并同步结果时保留', () => {
    const before = base()
    const synced = act.addEntries(before, [entry('remote')], 100)
    const now = act.addEntries(before, [entry('local-new')], 150)
    expect(adoptSynced(now, synced).entries.map((e) => e.id).sort()).toEqual(['local-new', 'remote'])
  })
})
