import { describe, expect, it } from 'vitest'
import { DISHES, DISH_MAP } from '../src/data/dishes/index'
import { computeTargets } from '../src/core/energy'
import { NO_ADJUST } from '../src/core/analysis'
import { planDay, shoppingList } from '../src/core/planner'
import type { PlanInput } from '../src/core/planner'
import { dishAllergens, isVegetarian } from '../src/core/nutrition'
import type { Profile } from '../src/core/types'

const profile: Profile = {
  sex: 'female', birthYear: 1994, heightCm: 163, weightKg: 58, bodyFatPct: 26, activity: 'light', goal: 'lose',
  dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
}
const NOW = new Date(2026, 8, 4)
const date = '2026-09-04'

function input(p: Profile = profile, extra: Partial<PlanInput> = {}): PlanInput {
  return {
    profile: p, targets: computeTargets(p, NOW), dishes: DISHES, dishMap: DISH_MAP, date, seed: 0,
    recentEntries: [], adjustments: { ...NO_ADJUST }, ...extra,
  }
}

describe('planner', () => {
  it('三餐都有菜，且全天热量接近目标', () => {
    const plan = planDay(input())
    expect(plan.meals.map((m) => m.slot)).toEqual(['breakfast', 'lunch', 'dinner'])
    for (const m of plan.meals) expect(m.items.length).toBeGreaterThan(0)
    const t = computeTargets(profile, NOW).kcal
    expect(plan.totals.kcal).toBeGreaterThan(t * 0.8)
    expect(plan.totals.kcal).toBeLessThan(t * 1.2)
  })
  it('午晚餐结构：主食 + 蛋白菜 + 素菜', () => {
    const plan = planDay(input())
    for (const m of plan.meals.filter((x) => x.slot !== 'breakfast')) {
      const roles = m.items.map((i) => i.role)
      expect(roles).toContain('staple')
      expect(roles).toContain('protein')
      expect(roles).toContain('veg')
    }
  })
  it('同 seed 可复现，不同 seed 有变化', () => {
    const a = planDay(input())
    const b = planDay(input())
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    let differs = false
    for (let s = 1; s <= 3 && !differs; s++) {
      const c = planDay(input(profile, { seed: s }))
      differs = JSON.stringify(c.meals) !== JSON.stringify(a.meals)
    }
    expect(differs).toBe(true)
  })
  it('一天内不重复同一道菜', () => {
    for (let s = 0; s < 10; s++) {
      const plan = planDay(input(profile, { seed: s }))
      const ids = plan.meals.flatMap((m) => m.items.map((i) => i.dishId))
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
  it('素食风格只出素菜；海鲜过敏不出海鲜', () => {
    for (let s = 0; s < 8; s++) {
      const veg = planDay(input({ ...profile, dietStyle: 'vegetarian' }, { seed: s }))
      for (const it of veg.meals.flatMap((m) => m.items)) expect(isVegetarian(DISH_MAP.get(it.dishId)!)).toBe(true)
      const noSea = planDay(input({ ...profile, allergens: ['seafood'] }, { seed: s }))
      for (const it of noSea.meals.flatMap((m) => m.items)) expect(dishAllergens(DISH_MAP.get(it.dishId)!)).not.toContain('seafood')
    }
  })
  it('不喜欢的菜不会出现', () => {
    const first = planDay(input())
    const banned = first.meals.flatMap((m) => m.items.map((i) => i.dishId))
    const p2 = { ...profile, dislikedDishes: banned }
    for (let s = 0; s < 6; s++) {
      const plan = planDay(input(p2, { seed: s }))
      for (const it of plan.meals.flatMap((m) => m.items)) expect(banned).not.toContain(it.dishId)
    }
  })
  it('16:8 不安排早餐；四餐含加餐', () => {
    const p = planDay(input({ ...profile, dietStyle: 'if168' }))
    expect(p.meals.map((m) => m.slot)).toEqual(['lunch', 'dinner'])
    const q = planDay(input({ ...profile, mealsPerDay: 4 }))
    expect(q.meals.map((m) => m.slot)).toContain('snack')
  })
  it('已吃过的餐次不再规划，其余餐按剩余预算', () => {
    const t = computeTargets(profile, NOW)
    const eaten = { breakfast: { kcal: 500, protein: 20, fat: 15, carbs: 60, fiber: 3, sodium: 400 }, lunch: { kcal: 900, protein: 40, fat: 30, carbs: 100, fiber: 5, sodium: 1500 } }
    const plan = planDay(input(profile, { eatenToday: eaten }))
    expect(plan.eatenSlots).toEqual(['breakfast', 'lunch'])
    expect(plan.meals.map((m) => m.slot)).toEqual(['dinner'])
    const dinner = plan.meals[0]
    expect(dinner.targetKcal).toBeLessThanOrEqual(Math.round(t.kcal * t.slotShare.dinner))
    expect(dinner.targetKcal).toBeGreaterThanOrEqual(Math.round(t.kcal * t.slotShare.dinner * 0.5) - 1)
  })
  it('外卖午餐模式下午餐给一份外卖套餐', () => {
    const plan = planDay(input(profile, { adjustments: { ...NO_ADJUST, enough: true, takeoutLunch: true } }))
    const lunch = plan.meals.find((m) => m.slot === 'lunch')!
    expect(lunch.items[0].role).toBe('combo')
    const d = DISH_MAP.get(lunch.items[0].dishId)!
    expect(['takeout', 'convenience', 'west', 'cn']).toContain(d.cuisine)
    expect(d.cook).not.toBe('fried')
  })
  it('蛋白偏低时午晚餐蛋白菜份量足，且带说明', () => {
    const plan = planDay(input(profile, { adjustments: { ...NO_ADJUST, enough: true, proteinLow: true } }))
    expect(plan.notes.some((n) => n.includes('蛋白'))).toBe(true)
    expect(plan.totals.protein).toBeGreaterThan(computeTargets(profile, NOW).protein * 0.85)
  })
  it('购物清单汇总食材且不含盐油水', () => {
    const plan = planDay(input())
    const list = shoppingList(plan, DISH_MAP)
    expect(list.length).toBeGreaterThan(3)
    expect(list.find((x) => x.ing === 'salt')).toBeUndefined()
    expect(list.find((x) => x.ing === 'oil')).toBeUndefined()
  })
  it('各种风格与目标下全天热量都在目标 ±25% 内', () => {
    const styles = ['chinese', 'low_carb', 'high_protein', 'mediterranean', 'vegetarian', 'if168'] as const
    for (const style of styles) {
      for (const goal of ['lose', 'maintain', 'gain'] as const) {
        for (let s = 0; s < 3; s++) {
          const p = { ...profile, dietStyle: style, goal }
          const t = computeTargets(p, NOW)
          const plan = planDay(input(p, { seed: s }))
          expect(plan.totals.kcal, `${style}/${goal}/${s}`).toBeGreaterThan(t.kcal * 0.75)
          expect(plan.totals.kcal, `${style}/${goal}/${s}`).toBeLessThan(t.kcal * 1.25)
        }
      }
    }
  })
})

describe('全天收敛', () => {
  it('减脂档案照推荐吃：热量 ±8%，脂肪不超目标 15%，蛋白不低于 85%，钠不超 2600', () => {
    const p: Profile = { sex: 'male', birthYear: 1990, heightCm: 175, weightKg: 72, bodyFatPct: 20, activity: 'light', goal: 'lose', dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [] }
    const t = computeTargets(p, NOW)
    let okFat = 0, okNa = 0, okKcal = 0, okProt = 0
    const N = 12
    for (let s = 0; s < N; s++) {
      const plan = planDay(input(p, { seed: s }))
      if (plan.totals.fat <= t.fat * 1.15) okFat++
      if (plan.totals.sodium <= 2600) okNa++
      if (Math.abs(plan.totals.kcal - t.kcal) <= t.kcal * 0.08) okKcal++
      if (plan.totals.protein >= t.protein * 0.85) okProt++
      // 钠压不进上限时必须如实写在说明里
      if (plan.totals.sodium > t.sodiumMax * 1.1) expect(plan.notes.some((n) => n.includes('仍高于上限'))).toBe(true)
    }
    expect(okKcal, 'kcal').toBeGreaterThanOrEqual(10)
    expect(okFat, 'fat').toBeGreaterThanOrEqual(10)
    expect(okProt, 'protein').toBeGreaterThanOrEqual(10)
    expect(okNa, 'sodium').toBeGreaterThanOrEqual(10)
  })
})
