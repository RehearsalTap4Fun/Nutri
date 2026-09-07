import type { Dish, MealSlot, Nutrients, Profile } from './types'
import { dishAllergens, dishNutrients, isVegan, isVegetarian, scale } from './nutrition'
import { conditionExcludes, conditionWeight } from './conditions'

export interface BudgetPick {
  dish: Dish
  portion: number
  n: Nutrients
  /** 一句话理由，给界面直接显示 */
  why: string
}

/**
 * 「用剩下的预算还能吃什么」：按剩余热量与蛋白缺口挑几道放得下的菜。
 * 遵守过敏、营养模式排除、不想吃、素食风格；一份放不下且可分的菜按半份给；油炸降权，常吃与收藏加分。
 */
export function suggestForBudget(opts: {
  remainKcal: number
  remainProtein: number
  slot: MealSlot
  dishes: Dish[]
  profile: Profile
  favorites?: string[]
  recentIds?: string[]
  limit?: number
}): BudgetPick[] {
  const { remainKcal, remainProtein, slot, dishes, profile, favorites = [], recentIds = [], limit = 6 } = opts
  if (remainKcal < 50) return []
  const allergens = new Set(profile.allergens || [])
  const disliked = new Set(profile.dislikedDishes || [])
  const scored: Array<{ score: number; pick: BudgetPick }> = []
  for (const d of dishes) {
    if (!d.slots.includes(slot) && !d.slots.includes('snack')) continue
    if (disliked.has(d.id)) continue
    if (dishAllergens(d).some((a) => allergens.has(a))) continue
    if (profile.dietStyle === 'vegetarian' && !isVegetarian(d)) continue
    if (profile.dietStyle === 'vegan' && !isVegan(d)) continue
    if (conditionExcludes(d, profile)) continue
    const base = dishNutrients(d)
    if (base.kcal < 30) continue
    let portion = 1
    if (base.kcal > remainKcal) {
      if (d.cat !== 'drink' && base.kcal * 0.5 <= remainKcal) portion = 0.5
      else continue
    }
    const n = scale(base, portion)
    const fill = n.kcal / remainKcal
    // 目标：一次吃掉剩余预算的七成左右，蛋白缺口大时优先高蛋白
    let score = 1 - Math.abs(0.7 - fill)
    if (remainProtein > 10) score += Math.min(1, n.protein / remainProtein) * 0.8
    if (d.cook === 'fried') score -= 0.3
    if (d.cook === 'heavy') score -= 0.1
    if (favorites.includes(d.id)) score += 0.4
    if (recentIds.includes(d.id)) score += 0.2
    score *= conditionWeight(d, d.cat, profile).w
    const why = remainProtein > 10 && n.protein >= 15
      ? `补蛋白 ${Math.round(n.protein)} g`
      : fill > 0.6 ? '正好吃满今天的量' : '小份，留点余地'
    scored.push({ score, pick: { dish: d, portion, n, why } })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.pick)
}
