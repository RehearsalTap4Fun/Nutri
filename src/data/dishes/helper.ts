import type { CookStyle, Cuisine, Dish, DishCategory, MealSlot } from '../../core/types'

/** 餐次简写：B 早餐 / L 午餐 / D 晚餐 / S 加餐 */
export type SlotCode = string

const SLOT_OF: Record<string, MealSlot> = { B: 'breakfast', L: 'lunch', D: 'dinner', S: 'snack' }

export function slotsOf(code: SlotCode): MealSlot[] {
  return [...code].map((c) => {
    const s = SLOT_OF[c]
    if (!s) throw new Error(`bad slot code ${code}`)
    return s
  })
}

export type Parts = Array<[string, number]>

export interface Extra {
  tags?: string[]
  aliases?: string[]
}

/**
 * 定义一道菜。parts 为「一人份标准份量」的食材克重。
 * 用油参考：清淡 3~5 g / 常规 8~12 g / 重油 15~25 g / 油炸按食材 10~15% 吸油
 * 用盐参考：一道菜 1~2 g 盐（或等量酱油、蚝油等换算）
 */
export function D(
  id: string,
  name: string,
  cat: DishCategory,
  cuisine: Cuisine,
  cook: CookStyle,
  slots: SlotCode,
  serving: string,
  parts: Parts,
  extra?: Extra,
): Dish {
  const dish: Dish = {
    id,
    name,
    cat,
    cuisine,
    cook,
    slots: slotsOf(slots),
    serving,
    parts: parts.map(([ing, g]) => ({ ing, g })),
  }
  if (extra?.tags) dish.tags = extra.tags
  if (extra?.aliases) dish.aliases = extra.aliases
  return dish
}
