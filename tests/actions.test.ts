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
import { adoptSynced, applySyncState, fingerprint, mergeSync, toSyncState } from '../src/sync/merge'
import type { LogEntry, Profile } from '../src/core/types'

const profile = { sex: 'female', age: 30, heightCm: 165, weightKg: 60, activity: 'light', goal: 'maintain', dislikedDishes: [], conditions: [] } as unknown as Profile
const base = (): AppState => ({ ...defaultState(), profile, meta: { profileAt: 1, settingsAt: 1 } })
const entry = (id: string): LogEntry => ({ id, date: '2026-09-24', slot: 'lunch', dishId: 'd1', portion: 1 })

/** A 和 B 互相同步一轮：各自把对方的数据合并进来（和 syncOnce 拉到改动后做的一样） */
function syncBoth(a: AppState, b: AppState): [AppState, AppState] {
  return [
    applySyncState(a, mergeSync(toSyncState(a), toSyncState(b))),
    applySyncState(b, mergeSync(toSyncState(b), toSyncState(a))),
  ]
}

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
  it('饮水：一天一条、id 由日期定；清零写 0 而不是删', () => {
    let s = act.setWater(base(), '2026-09-24', 500, 100)
    s = act.setWater(s, '2026-09-24', 750, 200)
    expect(s.water).toEqual([{ id: 'water_2026-09-24', date: '2026-09-24', ml: 750, updatedAt: 200 }])
    s = act.setWater(s, '2026-09-24', 0, 300)
    expect(s.water).toEqual([{ id: 'water_2026-09-24', date: '2026-09-24', ml: 0, updatedAt: 300 }])
    expect(s.tombstones).toEqual([])
  })
  it('收藏：取消打墓碑，再加入撤墓碑并记加入时间', () => {
    let s = act.toggleFavorite(base(), 'd1', 100)
    expect(s.favorites).toEqual(['d1'])
    expect(s.meta.addedAt).toEqual({ 'favorites:d1': 100 })
    s = act.toggleFavorite(s, 'd1', 200)
    expect(s.favorites).toEqual([])
    expect(s.tombstones).toEqual([{ coll: 'favorites', id: 'd1', at: 200 }])
    s = act.toggleFavorite(s, 'd1', 300)
    expect(s.tombstones).toEqual([])
    expect(s.meta.addedAt).toEqual({ 'favorites:d1': 300 })
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

describe('饮水两台设备同时改', () => {
  it('同一天各设一次总量：取后设的那个，不相加', () => {
    const [a, b] = [act.setWater(base(), '2026-09-24', 500, 100), act.setWater(base(), '2026-09-24', 750, 200)]
    const [a2, b2] = syncBoth(a, b)
    expect(a2.water).toEqual(b2.water)
    expect(a2.water.map((w) => w.ml)).toEqual([750])
  })
  it('一边清零、一边后来又加：后做的算数', () => {
    const a = act.setWater(act.setWater(base(), '2026-09-24', 500, 100), '2026-09-24', 0, 200)
    const b = act.setWater(base(), '2026-09-24', 250, 300)
    expect(syncBoth(a, b)[0].water.map((w) => w.ml)).toEqual([250])
    expect(syncBoth(a, { ...b, water: [{ ...b.water[0], updatedAt: 150 }] })[0].water.map((w) => w.ml)).toEqual([0])
  })
  it('旧版数据：随机 id 的总量记录被新版那条取代；只有旧记录的一天（快捷加水时代）相加；已删的旧记录不复活', () => {
    const old = { ...base(), water: [
      { id: 'x1', date: '2026-09-24', ml: 500, updatedAt: 100 },
      { id: 'q1', date: '2026-09-01', ml: 100, updatedAt: 10 },
      { id: 'q2', date: '2026-09-01', ml: 200, updatedAt: 20 },
      { id: 'gone', date: '2026-09-02', ml: 300, updatedAt: 30 },
    ] }
    const neu = { ...act.setWater(base(), '2026-09-24', 750, 200), tombstones: [{ coll: 'water' as const, id: 'gone', at: 40 }] }
    const [o2, n2] = syncBoth(old, neu)
    expect(o2.water).toEqual(n2.water)
    const byDate = Object.fromEntries(o2.water.map((w) => [w.date, [w.id, w.ml]]))
    expect(byDate).toEqual({ '2026-09-24': ['water_2026-09-24', 750], '2026-09-01': ['water_2026-09-01', 300] })
  })
})

describe('收藏与训练日：取消也能同步', () => {
  it('一台取消收藏，另一台不会再把它加回来', () => {
    const both = act.toggleFavorite(base(), 'd1', 100)
    const a = act.toggleFavorite(both, 'd1', 200)
    const [a2, b2] = syncBoth(a, both)
    expect(a2.favorites).toEqual([])
    expect(b2.favorites).toEqual([])
  })
  it('取消之后另一台又重新收藏：以后做的为准', () => {
    const both = act.toggleFavorite(base(), 'd1', 100)
    const a = act.toggleFavorite(both, 'd1', 200)
    const b = act.toggleFavorite(act.toggleFavorite(both, 'd1', 250), 'd1', 300)
    const [a2, b2] = syncBoth(a, b)
    expect(a2.favorites).toEqual(['d1'])
    expect(b2.favorites).toEqual(['d1'])
  })
  it('没有加入时间的旧收藏，碰上墓碑算删了；训练日同理', () => {
    const legacy = { ...base(), favorites: ['d1'], trainingDays: ['2026-09-24'] }
    const a = act.toggleTrainingDay(act.toggleFavorite(legacy, 'd1', 100), '2026-09-24', 100)
    const [, b2] = syncBoth(a, legacy)
    expect(b2.favorites).toEqual([])
    expect(b2.trainingDays).toEqual([])
  })
})

describe('墓碑不过期', () => {
  it('离线半年的设备回来，不会把早就删掉的记录带回来', () => {
    const longAgo = Date.now() - 200 * 86400000
    const offline = act.addEntries(base(), [entry('e1')], longAgo)
    const online = act.removeEntries(offline, ['e1'], longAgo + 1000)
    const [o2, n2] = syncBoth(offline, online)
    expect(o2.entries).toEqual([])
    expect(n2.entries).toEqual([])
    expect(n2.tombstones.map((t) => t.id)).toEqual(['e1'])
  })
  it('旧版饮水墓碑三个月后照样清掉（量最大，新版已用不上）', () => {
    const s = { ...base(), tombstones: [{ coll: 'water' as const, id: 'x', at: Date.now() - 100 * 86400000 }] }
    expect(syncBoth(s, base())[0].tombstones).toEqual([])
  })
})

describe('指纹', () => {
  it('addedAt 键的顺序不影响指纹，否则每次同步都白推一次', () => {
    const a = { ...base(), meta: { profileAt: 1, settingsAt: 1, addedAt: { 'favorites:a': 1, 'favorites:b': 2 } } }
    const b = { ...base(), meta: { profileAt: 1, settingsAt: 1, addedAt: { 'favorites:b': 2, 'favorites:a': 1 } } }
    expect(fingerprint(toSyncState(a))).toBe(fingerprint(toSyncState(b)))
  })
})
