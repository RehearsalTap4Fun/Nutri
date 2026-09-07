// 多设备合并：有 id 的集合按 id 取并集、同 id 取 updatedAt 大的、墓碑标记删除；
// 集合型字段取并集；档案与设置按修改时间取新的。
import type { Dish, LogEntry, Profile, WaterEntry, WeightEntry } from '../core/types'
import type { AppState, CustomFood, PlanSeed } from '../store/storage'

export type Coll = 'entries' | 'water' | 'weights' | 'vitals' | 'customFoods' | 'customDishes'

export interface Tombstone {
  coll: Coll
  id: string
  at: number
}

export interface SyncMeta {
  profileAt: number
  settingsAt: number
}

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
const ID_OF: Record<Coll, (r: any) => string> = {
  entries: (r) => String(r.id),
  water: (r) => String(r.id),
  weights: (r) => String(r.date),
  vitals: (r) => String(r.id),
  customFoods: (r) => String(r.id),
  customDishes: (r) => String(r.id),
}

export const COLLECTIONS: Coll[] = ['entries', 'water', 'weights', 'vitals', 'customFoods', 'customDishes']

function mergeColl<T>(coll: Coll, a: T[], b: T[], tomb: Map<string, number>): T[] {
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
  // 三个月前的墓碑可以丢，避免无限增长（此时所有设备都早已同步过）
  const cutoff = Date.now() - 90 * 86400000
  const keptTomb = tombstones.filter((t) => t.at >= cutoff)

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
    water: mergeColl<WaterEntry>('water', local.water, remote.water, tomb),
    weights: mergeColl<WeightEntry>('weights', local.weights, remote.weights, tomb),
    vitals: mergeColl<SyncState['vitals'][number]>('vitals', local.vitals, remote.vitals, tomb),
    customFoods: mergeColl<CustomFood>('customFoods', local.customFoods, remote.customFoods, tomb),
    customDishes: mergeColl<Dish>('customDishes', local.customDishes, remote.customDishes, tomb),
    favorites: [...new Set([...local.favorites, ...remote.favorites])],
    trainingDays: [...new Set([...local.trainingDays, ...remote.trainingDays])],
    planSeeds,
    settings,
    tombstones: keptTomb,
    meta: { profileAt: Math.max(local.meta.profileAt, remote.meta.profileAt), settingsAt: Math.max(local.meta.settingsAt, remote.meta.settingsAt) },
  }
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
  }
  return JSON.stringify(norm)
}
