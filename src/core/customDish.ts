// 自建菜：用户按食材搭出一道库里没有的菜。营养由食材配比推导，和菜品库同一套算法，
// 所以自建菜能参与搜索、推荐、分析，也能被按食材判定的人群规则（痛风的嘌呤、高血压的腌制）看见——
// 「按成分表」录入的那种只有一组营养值，判不了这些。
// 这里只放规则，不放界面：网页版的抽屉与小程序的表单共用同一份。
import type { CookStyle, Dish, Ingredient, MealSlot } from './types'

/** 自建时让用户选的类别：比菜品库的 DishCategory 少几个，都是说得清的 */
export type CustomCat = 'protein' | 'veg' | 'staple' | 'soup' | 'breakfast' | 'snack'

export const CUSTOM_CATS: Array<[CustomCat, string]> = [
  ['protein', '荤菜/蛋白'],
  ['veg', '素菜'],
  ['staple', '主食'],
  ['soup', '汤'],
  ['breakfast', '早餐'],
  ['snack', '小食'],
]

/** 这一类菜通常出现在哪几餐，决定它以后会被推荐到哪里 */
export const SLOTS_BY_CAT: Record<CustomCat, MealSlot[]> = {
  protein: ['lunch', 'dinner'],
  veg: ['lunch', 'dinner'],
  staple: ['breakfast', 'lunch', 'dinner'],
  soup: ['lunch', 'dinner'],
  breakfast: ['breakfast'],
  snack: ['snack', 'breakfast'],
}

/** 加一样食材时给的默认克重（一人份），省得每样都从 0 开始调 */
export function defaultGrams(ing: Ingredient): number {
  switch (ing.cat) {
    case 'vegetable': case 'mushroom': return 150
    case 'meat': case 'poultry': case 'seafood': return 100
    case 'egg': return 50
    case 'soy': case 'tuber': return 100
    case 'grain': return 100
    case 'dairy': case 'beverage': return 200
    case 'fruit': return 150
    case 'oil': return 10
    case 'condiment': return ing.id === 'salt' ? 1.5 : 10
    case 'sugar': return 5
    case 'nut': return 15
    case 'legume': return 50
    default: return 50
  }
}

export interface DishDraft {
  name: string
  cat: CustomCat
  cook: CookStyle
  parts: Array<{ ing: string; g: number }>
}

/**
 * 把草稿拼成一道菜。没有食材就没有菜，返回 null。
 * id 以 `custom_` 开头是存档校验的要求（`normalizeState` 只收这个前缀的自建菜）。
 */
export function draftDish(d: DishDraft, id = 'custom_draft'): Dish | null {
  if (!d.parts.length) return null
  const grams = Math.round(d.parts.reduce((s, p) => s + p.g, 0))
  return {
    id,
    name: d.name.trim() || '自定义',
    cat: d.cat,
    cuisine: 'cn',
    cook: d.cook,
    slots: SLOTS_BY_CAT[d.cat],
    serving: `1份(约${grams}g)`,
    parts: d.parts,
  }
}

/** 自建菜是否可以存：得有名字、有食材，且每样都填了克重 */
export function draftReady(d: DishDraft): boolean {
  return !!d.name.trim() && d.parts.length > 0 && d.parts.every((p) => p.g > 0)
}

/**
 * 成分表录入时热量那格空着：按三大宏量折算（蛋白 4、脂肪 9、碳水 4 千卡/克）。
 * 包装上的热量与宏量本来就常对不齐，以用户填的为准，没填才折算。
 */
export function kcalFromMacros(protein: number, fat: number, carbs: number): number {
  return protein * 4 + fat * 9 + carbs * 4
}
