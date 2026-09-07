import { describe, expect, it } from 'vitest'
import { bmrKatch, bmrMifflin, computeTargets, slotShares } from '../src/core/energy'
import type { Profile } from '../src/core/types'

const base: Profile = {
  sex: 'male', birthYear: 1996, heightCm: 175, weightKg: 70, activity: 'light', goal: 'maintain',
  dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
}
const NOW = new Date(2026, 8, 4)

describe('energy', () => {
  it('Mifflin-St Jeor', () => {
    expect(bmrMifflin('male', 70, 175, 30)).toBeCloseTo(1648.75, 2)
    expect(bmrMifflin('female', 55, 160, 30)).toBeCloseTo(1239, 2)
  })
  it('Katch-McArdle', () => {
    expect(bmrKatch(70, 20)).toBeCloseTo(1579.6, 1)
  })
  it('体脂率已知时用 Katch，否则 Mifflin', () => {
    expect(computeTargets(base, NOW).method).toBe('mifflin')
    expect(computeTargets({ ...base, bodyFatPct: 20 }, NOW).method).toBe('katch')
    expect(computeTargets({ ...base, bodyFatPct: 2 }, NOW).method).toBe('mifflin')
  })
  it('维持目标 = TDEE，三大宏量热量与目标接近', () => {
    const t = computeTargets(base, NOW)
    expect(t.kcal).toBe(Math.round((t.tdee) / 10) * 10)
    const macroKcal = t.protein * 4 + t.fat * 9 + t.carbs * 4
    expect(Math.abs(macroKcal - t.kcal)).toBeLessThan(15)
  })
  it('减脂不低于 BMR 与性别下限', () => {
    const t = computeTargets({ ...base, goal: 'lose', activity: 'sedentary', weightKg: 50, heightCm: 160 }, NOW)
    expect(t.kcal).toBeGreaterThanOrEqual(1500)
    const f = computeTargets({ ...base, sex: 'female', goal: 'lose', activity: 'sedentary', weightKg: 45, heightCm: 155 }, NOW)
    expect(f.kcal).toBeGreaterThanOrEqual(1200)
  })
  it('低碳风格碳水占 25%', () => {
    const t = computeTargets({ ...base, dietStyle: 'low_carb' }, NOW)
    expect(t.carbs * 4 / t.kcal).toBeCloseTo(0.25, 1)
  })
  it('高蛋白风格蛋白更高', () => {
    const a = computeTargets(base, NOW).protein
    const b = computeTargets({ ...base, dietStyle: 'high_protein' }, NOW).protein
    expect(b).toBeGreaterThan(a)
  })
  it('餐次占比之和为 1，16:8 不含早餐', () => {
    for (const style of ['chinese', 'if168', 'low_carb'] as const) {
      for (const m of [3, 4] as const) {
        const s = slotShares(style, m)
        const total = s.breakfast + s.lunch + s.dinner + s.snack
        expect(total).toBeCloseTo(1, 6)
      }
    }
    expect(slotShares('if168', 3).breakfast).toBe(0)
    expect(slotShares('chinese', 3).snack).toBe(0)
  })
  it('tdee 覆盖值生效', () => {
    const t = computeTargets(base, NOW, 2500)
    expect(t.tdee).toBe(2500)
    expect(t.kcal).toBe(2500)
  })
})
