// 多设备合并：有 id 的集合按 id 取并集、同 id 取 updatedAt 大的、墓碑标记删除；
// 饮水一天一条（总量），取新的；收藏与训练日按「加入时间 vs 墓碑时间」判断去留；
// 档案与设置按修改时间取新的。
import type { Dish, LogEntry, Profile, WaterEntry, WeightEntry } from '../core/types'
import type { AppState, CustomFood, PlanSeed } from '../store/storage'

export type Coll = 'entries' | 'water' | 'weights' | 'vitals' | 'customFoods' | 'customDishes' | 'favorites' | 'trainingDays'

export interface Tombstone {
  coll: Coll
  id: string
  at: number
}

export interface SyncMeta {
  profileAt: number
  settingsAt: number
  /**
   * 收藏与训练日这类「只是一串 id」的集合，每一项最后一次被加入的时间，键是 `favorites:<id>` / `trainingDays:<date>`。
   * 光取并集的话，一台设备取消收藏，另一台一同步又加回来；有了加入时间才能和墓碑比先后。
   */
  addedAt?: Record<string, number>
}

/** 一天的饮水只有一条，id 由日期定：两台设备改同一天写的是同一条，合并取新的，不会加倍 */
export const waterId = (date: string) => `water_${date}`
export type MarkColl = 'favorites' | 'trainingDays'
export const markKey = (coll: MarkColl, id: string) => `${coll}:${id}`

/** 参与同步的部分（不含 API key、同步码这类设备本地信息） */
export interface SyncState {
  v: 1
  profile: Profile | null
  entries: LogEntry[]
  water: WaterEntry[]
  weights: WeightEntry[]
  vitals: Array<{ id: string; updatedAt?: number; [k: string]: unknown }>
  customFoods: CustomFood[]
  customDishes: Dish[]
  favorites: string[]
  trainingDays: string[]
  planSeeds: Record<string, PlanSeed>
  settings: { useAdaptiveTdee: boolean; provider: 'anthropic' | 'deepseek' }
  tombstones: Tombstone[]
  meta: SyncMeta
}

type Rec = { updatedAt?: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ID_OF: Record<Exclude<Coll, MarkColl>, (r: any) => string> = {
  entries: (r) => String(r.id),
  water: (r) => String(r.id),
  weights: (r) => String(r.date),
  vitals: (r) => String(r.id),
  customFoods: (r) => String(r.id),
  customDishes: (r) => String(r.id),
}

export const COLLECTIONS = ['entries', 'water', 'weights', 'vitals', 'customFoods', 'customDishes'] as const

function mergeColl<T>(coll: Exclude<Coll, MarkColl>, a: T[], b: T[], tomb: Map<string, number>): T[] {
  const ts = (r: T) => (r as Rec).updatedAt || 0
  const idOf = ID_OF[coll]
  const out = new Map<string, T>()
  for (const list of [a, b]) {
    for (const r of list) {
      const id = idOf(r)
      const cur = out.get(id)
      if (!cur || ts(r) > ts(cur)) out.set(id, r)
    }
  }
  for (const [id, r] of [...out]) {
    const t = tomb.get(`${coll}:${id}`)
    if (t !== undefined && t >= ts(r)) out.delete(id)
  }
  return [...out.values()]
}

export function mergeSync(local: SyncState, remote: SyncState): SyncState {
  // 墓碑并集，同键取最晚
  const tomb = new Map<string, number>()
  for (const t of [...local.tombstones, ...remote.tombstones]) {
    const k = `${t.coll}:${t.id}`
    tomb.set(k, Math.max(tomb.get(k) || 0, t.at))
  }
  const tombstones: Tombstone[] = [...tomb].map(([k, at]) => { const i = k.indexOf(':'); return { coll: k.slice(0, i) as Coll, id: k.slice(i + 1), at } })
  // 墓碑不过期：以前三个月一清，离线更久的设备回来就会把删掉的记录带回来。
  // 一条墓碑几十字节，删除又不频繁，留着的代价很小。
  // 唯一的例外是旧版饮水留下的墓碑（每点一杯就打一条，量最大）：饮水改成一天一条之后已经用不上了，
  // 只在过渡期拿来筛旧记录，三个月后可以丢。
  const cutoff = Date.now() - 90 * 86400000
  const keptTomb = tombstones.filter((t) => t.coll !== 'water' || t.at >= cutoff)

  const addedAt: Record<string, number> = { ...(remote.meta.addedAt || {}) }
  for (const [k, t] of Object.entries(local.meta.addedAt || {})) addedAt[k] = Math.max(addedAt[k] || 0, t)

  const planSeeds: Record<string, PlanSeed> = { ...remote.planSeeds }
  for (const [d, s] of Object.entries(local.planSeeds)) {
    const r = planSeeds[d]
    planSeeds[d] = r ? { day: Math.max(r.day, s.day), meals: { ...r.meals, ...Object.fromEntries(Object.entries(s.meals).map(([k, v]) => [k, Math.max(v || 0, r.meals[k as keyof typeof r.meals] || 0)])) } } : s
  }

  const profile = local.meta.profileAt >= remote.meta.profileAt ? local.profile : remote.profile
  const settings = local.meta.settingsAt >= remote.meta.settingsAt ? local.settings : remote.settings

  return {
    v: 1,
    profile: profile ?? local.profile ?? remote.profile,
    entries: mergeColl<LogEntry>('entries', local.entries, remote.entries, tomb),
    water: mergeColl<WaterEntry>('water', canonicalWater(local.water, tomb), canonicalWater(remote.water, tomb), new Map()),
    weights: mergeColl<WeightEntry>('weights', local.weights, remote.weights, tomb),
    vitals: mergeColl<SyncState['vitals'][number]>('vitals', local.vitals, remote.vitals, tomb),
    customFoods: mergeColl<CustomFood>('customFoods', local.customFoods, remote.customFoods, tomb),
    customDishes: mergeColl<Dish>('customDishes', local.customDishes, remote.customDishes, tomb),
    favorites: mergeMarks('favorites', local.favorites, remote.favorites, tomb, addedAt),
    trainingDays: mergeMarks('trainingDays', local.trainingDays, remote.trainingDays, tomb, addedAt),
    planSeeds,
    settings,
    tombstones: keptTomb,
    meta: { profileAt: Math.max(local.meta.profileAt, remote.meta.profileAt), settingsAt: Math.max(local.meta.settingsAt, remote.meta.settingsAt), ...(Object.keys(addedAt).length ? { addedAt } : {}) },
  }
}

/**
 * 把一边的饮水整理成一天一条（id = waterId(date)）。
 *
 * 新版每次改的都是那天的总量，一天本来就只有一条，取最新的即可。旧版留下的记录 id 是随机的：
 * 先按墓碑筛掉已删的；某天若已经有新版那条，旧记录一律当作被它取代（旧版也是「设总量」，取最新）；
 * 只有旧记录时才相加——那是更早「+100 ml」快捷加水时代一次一条的记法。
 */
function canonicalWater(list: WaterEntry[], tomb: Map<string, number>): WaterEntry[] {
  const byDate = new Map<string, WaterEntry[]>()
  for (const w of list) {
    if (w.id !== waterId(w.date)) {
      const t = tomb.get(`water:${w.id}`)
      if (t !== undefined && t >= (w.updatedAt || 0)) continue
    }
    byDate.set(w.date, [...(byDate.get(w.date) || []), w])
  }
  const out: WaterEntry[] = []
  for (const [date, ws] of byDate) {
    const newest = ws.reduce((a, b) => ((b.updatedAt || 0) > (a.updatedAt || 0) ? b : a))
    const hasCanonical = ws.some((w) => w.id === waterId(date))
    const ml = hasCanonical || ws.length === 1 ? newest.ml : ws.reduce((s, w) => s + w.ml, 0)
    out.push({ ...newest, id: waterId(date), ml })
  }
  return out
}

/** 收藏 / 训练日：任一边有、且最后一次加入晚于墓碑的留下。旧数据没有加入时间，当作 0，碰上墓碑就算删了 */
function mergeMarks(coll: MarkColl, a: string[], b: string[], tomb: Map<string, number>, addedAt: Record<string, number>): string[] {
  return [...new Set([...a, ...b])].filter((id) => {
    const t = tomb.get(`${coll}:${id}`)
    return t === undefined || (addedAt[markKey(coll, id)] || 0) > t
  })
}

/** 从 AppState 抽出参与同步的部分 */
export function toSyncState(s: AppState): SyncState {
  const st = s as AppState & { vitals?: SyncState['vitals']; tombstones?: Tombstone[]; meta?: SyncMeta }
  return {
    v: 1,
    profile: s.profile,
    entries: s.entries,
    water: s.water,
    weights: s.weights,
    vitals: st.vitals || [],
    customFoods: s.customFoods,
    customDishes: s.customDishes,
    favorites: s.favorites,
    trainingDays: s.trainingDays,
    planSeeds: s.planSeeds,
    settings: { useAdaptiveTdee: s.settings.useAdaptiveTdee, provider: s.settings.provider },
    tombstones: st.tombstones || [],
    meta: st.meta || { profileAt: 0, settingsAt: 0 },
  }
}

/**
 * 同步回来后该写进界面的状态。同步要往返几秒，`synced` 是按**发起那一刻**的快照算的，
 * 这期间用户可能又记了一笔；所以不能直接用 `synced` 替换，要和**此刻**的状态再合一次。
 */
export function adoptSynced(current: AppState, synced: AppState): AppState {
  return applySyncState(current, mergeSync(toSyncState(current), toSyncState(synced)))
}

/** 把合并结果写回 AppState，保留设备本地的 key 与同步配置 */
export function applySyncState(s: AppState, st: SyncState): AppState {
  return {
    ...s,
    profile: st.profile,
    entries: st.entries,
    water: st.water,
    weights: st.weights,
    ...({ vitals: st.vitals } as object),
    customFoods: st.customFoods,
    customDishes: st.customDishes,
    favorites: st.favorites,
    trainingDays: st.trainingDays,
    planSeeds: st.planSeeds,
    settings: { ...s.settings, useAdaptiveTdee: st.settings.useAdaptiveTdee, provider: st.settings.provider },
    ...({ tombstones: st.tombstones, meta: st.meta } as object),
  }
}

/** 稳定序列化用于比较两份状态是否相同 */
export function fingerprint(st: SyncState): string {
  const sortArr = <T>(arr: T[], key: (x: T) => string) => [...arr].sort((a, b) => key(a).localeCompare(key(b)))
  const norm = {
    ...st,
    entries: sortArr(st.entries, (e) => e.id),
    water: sortArr(st.water, (e) => e.id),
    weights: sortArr(st.weights, (e) => e.date),
    vitals: sortArr(st.vitals, (e) => String(e.id)),
    customFoods: sortArr(st.customFoods, (e) => e.id),
    customDishes: sortArr(st.customDishes, (e) => e.id),
    favorites: [...st.favorites].sort(),
    trainingDays: [...st.trainingDays].sort(),
    tombstones: sortArr(st.tombstones, (t) => `${t.coll}:${t.id}`),
    // 键的顺序取决于合并时谁先谁后，不排序的话同样的内容指纹也会不同，每次同步都白推一次
    meta: { ...st.meta, addedAt: Object.fromEntries(Object.entries(st.meta.addedAt || {}).sort(([x], [y]) => x.localeCompare(y))) },
  }
  return JSON.stringify(norm)
}
