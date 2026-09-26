/**
 * 所有「改数据」的操作，网页版与小程序共用这一份。
 *
 * 为什么要收到一起：多设备合并（sync/merge.ts）全靠写入时自己盖对时间戳——
 * 记录按 updatedAt 取新、档案按 meta.profileAt、设置按 meta.settingsAt、删除靠墓碑。
 * 以前两端各写一套，漏盖一处就是一个静默 bug：网页记体重不写 updatedAt，
 * 两台设备改同一天就互相覆盖、永远对不上；网页拉黑菜品不动 profileAt，
 * 另一台设备一同步就把它推回去。放在一处、每个操作都有测试，才守得住。
 *
 * 约定：全是纯函数 `(state, …参数, now) => state`。`now` 由调用方给，
 * 新记录的 id 也由调用方给（撤销提示要拿着它），这样测试里结果是确定的。
 */
import type { Dish, LogEntry, MealSlot, Profile, VitalEntry, WaterEntry } from '../core/types'
import type { AppState, CustomFood } from './storage'
import { markKey, waterId } from '../sync/merge'
import type { MarkColl } from '../sync/merge'

type Coll = AppState['tombstones'][number]['coll']

const tombs = (coll: Coll, ids: string[], now: number) => ids.map((id) => ({ coll, id, at: now }))
/** 恢复被删的记录时，把它们的墓碑一并撤掉 */
const dropTombs = (s: AppState, coll: Coll, ids: string[]) => s.tombstones.filter((t) => !(t.coll === coll && ids.includes(t.id)))

// ── 餐食记录 ──

/** 新增或恢复记录（撤销删除也走这里）：盖新时间戳，撤掉同 id 的墓碑 */
export function addEntries(s: AppState, list: LogEntry[], now: number): AppState {
  const ids = list.map((e) => e.id)
  return {
    ...s,
    entries: [...s.entries.filter((e) => !ids.includes(e.id)), ...list.map((e) => ({ ...e, updatedAt: now }))],
    tombstones: dropTombs(s, 'entries', ids),
  }
}

/** 修改一条已有记录；id 不存在时等同新增 */
export function saveEntry(s: AppState, entry: LogEntry, now: number): AppState {
  if (!s.entries.some((e) => e.id === entry.id)) return addEntries(s, [entry], now)
  return { ...s, entries: s.entries.map((e) => (e.id === entry.id ? { ...entry, updatedAt: now } : e)) }
}

export function removeEntries(s: AppState, ids: string[], now: number): AppState {
  return { ...s, entries: s.entries.filter((e) => !ids.includes(e.id)), tombstones: [...s.tombstones, ...tombs('entries', ids, now)] }
}

// ── 饮水：一天一条总量记录，id 由日期定（见 merge.ts 的 waterId）──

/**
 * 把这一天的饮水总量设成 ml。清零也写一条 0 ml，而不是删掉打墓碑：
 * 两台设备改的是同一条，合并时按 updatedAt 取新的，清零和加水谁后做谁算数。
 * 撤销也就是再设一次原来的总量。
 */
export function setWater(s: AppState, date: string, ml: number, now: number, time?: string): AppState {
  const rec: WaterEntry = { id: waterId(date), date, ...(time ? { time } : {}), ml: Math.max(0, Math.round(ml)), updatedAt: now }
  return { ...s, water: [...s.water.filter((w) => w.date !== date), rec] }
}

// ── 体重：按日期一条 ──

/**
 * 记体重。只有记的是**最近的一天**时才顺带更新档案体重（目标跟着新体重走）；
 * 补记以前某天的体重不该把当前档案改回旧值。
 */
export function setWeight(s: AppState, date: string, kg: number, now: number): AppState {
  const weights = [...s.weights.filter((x) => x.date !== date), { date, kg, updatedAt: now }].sort((a, b) => a.date.localeCompare(b.date))
  const isLatest = weights[weights.length - 1].date === date
  if (!isLatest || !s.profile) return { ...s, weights }
  return { ...s, weights, profile: { ...s.profile, weightKg: kg }, meta: { ...s.meta, profileAt: now } }
}

// ── 血压血糖 ──

export function addVital(s: AppState, v: VitalEntry, now: number): AppState {
  return { ...s, vitals: [...s.vitals.filter((x) => x.id !== v.id), { ...v, updatedAt: now }], tombstones: dropTombs(s, 'vitals', [v.id]) }
}

export function removeVital(s: AppState, id: string, now: number): AppState {
  return { ...s, vitals: s.vitals.filter((x) => x.id !== id), tombstones: [...s.tombstones, ...tombs('vitals', [id], now)] }
}

// ── 自定义食物 / 自建菜：同 id 覆盖，盖时间戳才能在另一台设备上胜出 ──

const MAX_CUSTOM_FOODS = 200

export function saveCustomFoods(s: AppState, foods: CustomFood[], now: number): AppState {
  const ids = foods.map((f) => f.id)
  return { ...s, customFoods: [...foods.map((f) => ({ ...f, updatedAt: now })), ...s.customFoods.filter((x) => !ids.includes(x.id))].slice(0, MAX_CUSTOM_FOODS) }
}

export function saveCustomDish(s: AppState, d: Dish, now: number): AppState {
  return { ...s, customDishes: [...s.customDishes.filter((x) => x.id !== d.id), { ...d, updatedAt: now }] }
}

// ── 档案：任何改动都要动 profileAt ──

export function patchProfile(s: AppState, patch: Partial<Profile>, now: number, base?: Profile): AppState {
  const cur = s.profile || base
  if (!cur) return s
  return { ...s, profile: { ...cur, ...patch }, meta: { ...s.meta, profileAt: now } }
}

export function dislikeDish(s: AppState, id: string, now: number): AppState {
  if (!s.profile || s.profile.dislikedDishes.includes(id)) return s
  return patchProfile(s, { dislikedDishes: [...s.profile.dislikedDishes, id] }, now)
}

export function undislikeDish(s: AppState, id: string, now: number): AppState {
  if (!s.profile || !s.profile.dislikedDishes.includes(id)) return s
  return patchProfile(s, { dislikedDishes: s.profile.dislikedDishes.filter((x) => x !== id) }, now)
}

// ── 参与同步的设置：任何改动都要动 settingsAt ──

type SyncedSettings = Pick<AppState['settings'], 'useAdaptiveTdee' | 'provider' | 'contributedFoodIds'>

export function patchSettings(s: AppState, patch: Partial<SyncedSettings>, now: number): AppState {
  return { ...s, settings: { ...s.settings, ...patch }, meta: { ...s.meta, settingsAt: now } }
}

// ── 收藏 / 训练日：只是一串 id，加入记时间、取消打墓碑，合并时比先后（见 merge.ts 的 mergeMarks）──

function toggleMark(s: AppState, coll: MarkColl, id: string, now: number): AppState {
  const list = s[coll]
  if (list.includes(id)) {
    return { ...s, [coll]: list.filter((x) => x !== id), tombstones: [...s.tombstones, ...tombs(coll, [id], now)] }
  }
  return {
    ...s,
    [coll]: [...list, id],
    tombstones: dropTombs(s, coll, [id]),
    meta: { ...s.meta, addedAt: { ...(s.meta.addedAt || {}), [markKey(coll, id)]: now } },
  }
}

export const toggleFavorite = (s: AppState, dishId: string, now: number) => toggleMark(s, 'favorites', dishId, now)
export const toggleTrainingDay = (s: AppState, date: string, now: number) => toggleMark(s, 'trainingDays', date, now)

// ── 推荐：换一换 ──

/**
 * 换一换：整天或单餐。种子记在 planSeeds 里，刷新后推荐不变。
 * 同时清掉这些天的沿用缓存（planPicks）——planner 拿到沿用记录会先原样留着，
 * 不清的话新种子算出来的推荐又被旧选择顶回去，点了等于没点。
 */
export function reroll(s: AppState, dates: string[], slot?: MealSlot): AppState {
  const seeds = { ...s.planSeeds }
  const picks = { ...s.planPicks }
  for (const d of dates) {
    const cur = seeds[d] || { day: 0, meals: {} }
    seeds[d] = slot ? { ...cur, meals: { ...cur.meals, [slot]: (cur.meals[slot] || 0) + 1 } } : { day: cur.day + 1, meals: {} }
    delete picks[d]
  }
  return { ...s, planSeeds: seeds, planPicks: picks }
}

// ── 开关云同步：同步码是设备本地的，不进 settingsAt ──

/**
 * - 'new'（首台设备、新码）：给档案与设置盖上时间，免得被后加入设备的默认档案盖掉
 * - 'join'（输入已有的码）：清零，让云端的档案与设置优先；本机的记录照样并进去
 */
export function enableSync(s: AppState, code: string, mode: 'new' | 'join', now: number): AppState {
  return {
    ...s,
    settings: { ...s.settings, sync: { code, enabled: true } },
    meta: mode === 'new' ? { profileAt: s.meta.profileAt || now, settingsAt: s.meta.settingsAt || now } : { profileAt: 0, settingsAt: 0 },
  }
}

/** keepCode：只在本机关闭时留着码（小程序的做法，方便再打开）；删了云端副本就没必要留 */
export function disableSync(s: AppState, keepCode = false): AppState {
  return { ...s, settings: { ...s.settings, sync: { code: keepCode ? s.settings.sync.code : '', enabled: false } } }
}
