import type { LogEntry, MealSlot, Nutrients, Profile, VitalEntry, WeightEntry, WaterEntry } from '../core/types'

export interface CustomFood {
  id: string
  name: string
  serving: string
  nutrients: Nutrients
  /** 包装食品条码（扫码或手动录入时记住，下次直接命中） */
  barcode?: string
}

export interface PlanSeed {
  day: number
  meals: Partial<Record<MealSlot, number>>
}

export interface AppState {
  version: 1
  profile: Profile | null
  entries: LogEntry[]
  weights: WeightEntry[]
  water: WaterEntry[]
  customFoods: CustomFood[]
  /** 按日期保存换一换计数，保证刷新后推荐不变 */
  planSeeds: Record<string, PlanSeed>
  favorites: string[]
  /** 标记为训练日的日期（健身增肌模式） */
  trainingDays: string[]
  /** 血压 / 血糖记录 */
  vitals: VitalEntry[]
  settings: { useAdaptiveTdee: boolean; provider: 'anthropic' | 'deepseek'; anthropicKey: string; deepseekKey: string }
}

export const STORAGE_KEY = 'nutri.v1'

export function defaultState(): AppState {
  return { version: 1, profile: null, entries: [], weights: [], water: [], customFoods: [], planSeeds: {}, favorites: [], trainingDays: [], vitals: [], settings: { useAdaptiveTdee: false, provider: 'anthropic', anthropicKey: '', deepseekKey: '' } }
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

/** 宽松校验并补齐缺省字段；非法输入抛错 */
export function normalizeState(raw: unknown): AppState {
  if (!isObj(raw)) throw new Error('数据格式不正确')
  const s = defaultState()
  if (isObj(raw.profile)) s.profile = raw.profile as unknown as Profile
  if (Array.isArray(raw.entries)) s.entries = raw.entries.filter((e) => isObj(e) && typeof e.date === 'string' && typeof e.slot === 'string') as LogEntry[]
  if (Array.isArray(raw.weights)) s.weights = raw.weights.filter((w) => isObj(w) && typeof w.date === 'string' && typeof w.kg === 'number') as WeightEntry[]
  if (Array.isArray(raw.water)) s.water = raw.water.filter((w) => isObj(w) && typeof w.date === 'string' && typeof w.ml === 'number') as WaterEntry[]
  if (Array.isArray(raw.customFoods)) s.customFoods = raw.customFoods.filter((c) => isObj(c) && typeof c.name === 'string' && isObj(c.nutrients)) as CustomFood[]
  if (isObj(raw.planSeeds)) s.planSeeds = raw.planSeeds as Record<string, PlanSeed>
  if (Array.isArray(raw.favorites)) s.favorites = raw.favorites.filter((x) => typeof x === 'string') as string[]
  if (Array.isArray(raw.trainingDays)) s.trainingDays = raw.trainingDays.filter((x) => typeof x === 'string') as string[]
  if (Array.isArray(raw.vitals)) s.vitals = raw.vitals.filter((v) => isObj(v) && typeof v.date === 'string' && (v.kind === 'bp' || v.kind === 'glucose')) as VitalEntry[]
  if (isObj(raw.settings)) {
    const st = raw.settings
    s.settings = {
      useAdaptiveTdee: !!st.useAdaptiveTdee,
      provider: st.provider === 'deepseek' ? 'deepseek' : 'anthropic',
      anthropicKey: typeof st.anthropicKey === 'string' ? st.anthropicKey : '',
      deepseekKey: typeof st.deepseekKey === 'string' ? st.deepseekKey : '',
    }
  }
  if (s.profile) {
    s.profile.dislikedDishes ||= []
    s.profile.dislikedIngredients ||= []
    s.profile.allergens ||= []
    s.profile.conditions ||= []
    s.profile.mealsPerDay ||= 3
  }
  return s
}

export function loadState(): AppState {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (!text) return defaultState()
    return normalizeState(JSON.parse(text))
  } catch {
    return defaultState()
  }
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // 存储满或被禁用时静默失败，界面仍可用
  }
}

/** 导出不含 API key */
export function exportJson(s: AppState): string {
  return JSON.stringify({ ...s, settings: { ...s.settings, anthropicKey: '', deepseekKey: '' }, exportedAt: new Date().toISOString() }, null, 2)
}

export function importJson(text: string): AppState {
  return normalizeState(JSON.parse(text))
}
