import type { ActivityLevel, Allergen, Condition, Cuisine, DietStyle, Dish, DishCategory, Goal, LogEntry, MealSlot, Sex } from '../core/types'
import { servingGrams } from '../core/nutrition'

export const SEX_LABEL: Record<Sex, string> = { male: '男', female: '女' }
export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: '久坐(基本不动)', light: '轻度(每周1~3次运动或步行较多)', moderate: '中度(每周3~5次运动)', active: '活跃(每周6~7次)', very_active: '非常活跃(体力工作或每天高强度)',
}
export const ACTIVITY_SHORT: Record<ActivityLevel, string> = { sedentary: '久坐', light: '轻度', moderate: '中度', active: '活跃', very_active: '非常活跃' }
export const GOAL_LABEL: Record<Goal, string> = { lose: '减脂', maintain: '维持', gain: '增肌' }
export const STYLE_LABEL: Record<DietStyle, string> = {
  chinese: '中式均衡', low_carb: '低碳水', high_protein: '高蛋白', mediterranean: '地中海', vegetarian: '蛋奶素', vegan: '纯素', if168: '16:8 轻断食',
}
export const STYLE_DESC: Record<DietStyle, string> = {
  chinese: '米面为主食、荤素搭配，最贴近日常饮食',
  low_carb: '碳水占 25%，主食减到小半碗，多蔬菜与蛋白',
  high_protein: '蛋白目标上调 15%，适合增肌或减脂保肌',
  mediterranean: '多鱼、豆类、全谷、橄榄油，少红肉',
  vegetarian: '不含肉禽水产，蛋奶豆制品供蛋白',
  vegan: '不含任何动物性食物，蛋白靶上调 10%，靶钙来自豆制品与深绿叶菜；需另行补充维生素 B12',
  if168: '不吃早餐，12:00~20:00 进食窗口',
}
export const SLOT_LABEL: Record<MealSlot, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }
export const ALLERGEN_LABEL: Record<Allergen, string> = { seafood: '海鲜', peanut: '花生', nuts: '坚果', dairy: '奶制品', gluten: '麸质', egg: '蛋', soy: '大豆' }
export const CAT_LABEL: Record<DishCategory, string> = {
  staple: '主食', protein: '荤菜/蛋白', veg: '素菜', soup: '汤', breakfast: '早餐', snack: '小食', drink: '饮品', fruit: '水果', combo: '一份一餐',
}
export const CUISINE_LABEL: Record<Cuisine, string> = { cn: '家常', west: '西式', takeout: '外卖', convenience: '便利店' }
export const COOK_LABEL = { light: '清淡', normal: '常规', heavy: '重油盐', fried: '油炸' } as const

export function r0(v: number): string {
  return String(Math.round(v))
}
export function r1(v: number): string {
  return (Math.round(v * 10) / 10).toFixed(1)
}
export function portionLabel(p: number): string {
  const whole = Math.floor(p)
  const frac = p - whole
  const fracStr = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : frac ? frac.toFixed(2).slice(1) : ''
  if (whole === 0) return fracStr + '份'
  return whole + fracStr + '份'
}
/** 「约 N g」的取整：≥30 g 取到 5 的倍数，读起来像估算而不是秤出来的 */
export function roundGrams(g: number): number {
  return g >= 30 ? Math.round(g / 5) * 5 : Math.round(g)
}
/**
 * 份量的文案：整份写「N份」，非整份换算成克写「约 N g」（半份、¾份这类分数不直观）；
 * 不知道一份多重时才退回分数写法。
 */
export function portionText(p: number, grams?: number): string {
  if (Number.isInteger(p)) return `${p}份`
  if (grams && grams > 0) return `约 ${roundGrams(p * grams)} g`
  return portionLabel(p)
}
/** 记录条目的份量文案：目录菜按成品重量换算，自定义条目不知道重量、保留分数写法 */
export function entryPortionText(e: LogEntry, dishMap: Map<string, Dish>): string {
  const d = e.dishId ? dishMap.get(e.dishId) : undefined
  return portionText(e.portion, d ? servingGrams(d) : undefined)
}
export function defaultTimeForSlot(slot: MealSlot): string {
  return { breakfast: '08:00', lunch: '12:30', dinner: '18:30', snack: '15:30' }[slot]
}
export function guessSlot(time: string): MealSlot {
  if (time < '10:30') return 'breakfast'
  if (time < '14:00') return 'lunch'
  if (time < '17:00') return 'snack'
  if (time < '21:30') return 'dinner'
  return 'snack'
}

/**
 * 钠是按「每道家常菜 1.5~2 g 盐」估出来的，几乎天天超上限，当成日常指标只会一直红。
 * 所以默认不显示；只有高血压模式下钠上限是核心指标，才显示钠与含钠数字的提醒。
 */
export function showsSodium(conditions: Condition[] | undefined): boolean {
  return !!conditions?.includes('hypertension')
}
/** 不显示钠时，把带钠数字的提醒句过滤掉；「近期盐偏多」这类做法说明保留 */
export function withoutSodiumNotes(notes: string[], show: boolean): string[] {
  return show ? notes : notes.filter((t) => !/钠/.test(t))
}
