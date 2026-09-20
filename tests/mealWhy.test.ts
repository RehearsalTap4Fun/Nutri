import { describe, expect, it } from 'vitest'
import type { MealPlan } from '../src/core/planner'
import type { Adjustments } from '../src/core/analysis'
import type { Profile, Targets } from '../src/core/types'
import { computeTargets } from '../src/core/energy'
import { mealWhy } from '../src/core/mealWhy'

const profile: Profile = {
  sex: 'male', birthYear: 1990, heightCm: 172, weightKg: 68,
  activity: 'light', goal: 'maintain', dietStyle: 'chinese', mealsPerDay: 3,
  dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
}
const targets: Targets = computeTargets(profile, new Date('2026-09-20T09:00:00'))
const ZERO = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 }
const none: Adjustments = {
  enough: false, proteinLow: false, sodiumHigh: false, fatHigh: false, fiberLow: false,
  vegLow: false, fruitLow: false, kcalOver: false, kcalUnder: false, processedHigh: false,
  takeoutLunch: false, breakfastSkipped: false, lateEating: false, breakfastProteinLow: false,
}
const meal = (items: MealPlan['items']): MealPlan => ({
  slot: 'lunch', targetKcal: 800, targetProtein: 40, items, totals: { ...ZERO }, notes: [],
})
const it1 = (role: MealPlan['items'][number]['role']) => ({ dishId: 'x_' + role, portion: 1, role })

describe('这一餐为什么长这样', () => {
  it('先说预算，再说怎么配的', () => {
    const r = mealWhy({ meal: meal([it1('protein'), it1('veg'), it1('staple')]), targets, adjustments: none, profile })
    expect(r[0]).toContain('午餐占全天')
    expect(r[0]).toContain('800 千卡')
    expect(r[1]).toBe('一道荤菜配一道素菜配主食')
  })

  it('预算被重分配时说清楚', () => {
    const r = mealWhy({ meal: meal([it1('protein')]), targets, adjustments: none, profile, redistributed: true })
    expect(r[0]).toContain('前面的餐已记录')
    expect(r[0]).not.toContain('占全天')
  })

  it('外卖那条单独说', () => {
    const r = mealWhy({ meal: meal([it1('combo')]), targets, adjustments: none, profile })
    expect(r).toContain('外卖里挑了相对清淡的一份')
  })

  it('记录不足时不援引近 7 天结论', () => {
    const a: Adjustments = { ...none, enough: false, proteinLow: true, sodiumHigh: true }
    const r = mealWhy({ meal: meal([it1('protein')]), targets, adjustments: a, profile })
    expect(r.join('')).not.toContain('近期')
  })

  it('结论要真的和这一餐相关才说', () => {
    const a: Adjustments = { ...none, enough: true, proteinLow: true }
    // 只有素菜的一餐，不该说「往高蛋白的菜上挑」
    const veg = mealWhy({ meal: meal([it1('veg')]), targets, adjustments: a, profile })
    expect(veg.join('')).not.toContain('高蛋白')
    const prot = mealWhy({ meal: meal([it1('protein')]), targets, adjustments: a, profile })
    expect(prot.join('')).toContain('高蛋白')
  })

  it('两道素菜才说多加了一道', () => {
    const a: Adjustments = { ...none, enough: true, vegLow: true }
    expect(mealWhy({ meal: meal([it1('veg')]), targets, adjustments: a, profile }).join('')).not.toContain('多加了一道')
    expect(mealWhy({ meal: meal([it1('veg'), it1('veg')]), targets, adjustments: a, profile }).join('')).toContain('多加了一道')
  })

  it('人群模式列在最后', () => {
    const p2: Profile = { ...profile, conditions: ['hypertension', 'gout'] }
    const r = mealWhy({ meal: meal([it1('protein')]), targets, adjustments: none, profile: p2 })
    expect(r[r.length - 1]).toBe('按高血压、痛风/高尿酸模式的规则筛过')
  })
})
