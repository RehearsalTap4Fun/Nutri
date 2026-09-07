import { describe, expect, it } from 'vitest'
import { DISHES, DISH_MAP } from '../src/data/dishes/index'
import { computeTargets } from '../src/core/energy'
import { NO_ADJUST, analyze } from '../src/core/analysis'
import { planDay } from '../src/core/planner'
import type { PlanInput } from '../src/core/planner'
import { isAlcohol, isCaffeine, isRaw, isSugary } from '../src/core/conditions'
import { isVegan } from '../src/core/nutrition'
import type { LogEntry, Profile } from '../src/core/types'
import { addDays } from '../src/core/dates'

const NOW = new Date(2026, 8, 4)
const date = '2026-09-04'
const base: Profile = {
  sex: 'male', birthYear: 1994, heightCm: 176, weightKg: 72, bodyFatPct: 18, activity: 'moderate', goal: 'maintain',
  dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
}
function input(p: Profile, extra: Partial<PlanInput> = {}): PlanInput {
  return { profile: p, targets: computeTargets(p, NOW), dishes: DISHES, dishMap: DISH_MAP, date, seed: 0, recentEntries: [], adjustments: { ...NO_ADJUST }, ...extra }
}

describe('反流 / 备孕 / 增肌 / 纯素 · 目标', () => {
  it('反流脂肪 25%；备孕碳水 45% 蛋白 ≥20%；增肌蛋白 2 g/kg 且训练日 +300', () => {
    const g = computeTargets({ ...base, conditions: ['gerd'] }, NOW)
    expect((g.fat * 9) / g.kcal).toBeCloseTo(0.25, 1)
    const pc = computeTargets({ ...base, sex: 'female', conditions: ['preconception'] }, NOW)
    expect((pc.carbs * 4) / pc.kcal).toBeCloseTo(0.45, 1)
    expect((pc.protein * 4) / pc.kcal).toBeGreaterThanOrEqual(0.199)
    const tr = computeTargets({ ...base, conditions: ['training'] }, NOW)
    expect(tr.protein).toBeGreaterThanOrEqual(144)
    const trDay = computeTargets({ ...base, conditions: ['training'] }, NOW, undefined, { trainingDay: true })
    expect(trDay.kcal - tr.kcal).toBe(300)
    expect(trDay.carbs).toBeGreaterThan(tr.carbs)
    expect(trDay.notes.some((n) => n.startsWith('训练日'))).toBe(true)
  })
  it('纯素：蛋白 +10%，奶类目标 0，带 B12 提醒', () => {
    const t0 = computeTargets(base, NOW)
    const v = computeTargets({ ...base, dietStyle: 'vegan' }, NOW)
    expect(v.protein).toBe(Math.round(t0.protein * 1.1))
    expect(v.dairyG).toBe(0)
    expect(v.notes.some((n) => n.includes('B12'))).toBe(true)
  })
})

describe('反流 / 备孕 / 增肌 / 纯素 · 推荐', () => {
  it('反流不推荐辛辣、油炸、咖啡因、酒、碳酸', () => {
    for (let s = 0; s < 8; s++) {
      const plan = planDay(input({ ...base, conditions: ['gerd'] }, { seed: s }))
      for (const it of plan.meals.flatMap((m) => m.items)) {
        const d = DISH_MAP.get(it.dishId)!
        expect(d.tags?.includes('spicy') || d.cook === 'fried' || isCaffeine(d) || isAlcohol(d), d.name).toBe(false)
      }
      expect(plan.meals.every((m) => m.items.length > 0)).toBe(true)
    }
  })
  it('备孕不推荐酒、生食、含糖', () => {
    for (let s = 0; s < 8; s++) {
      const plan = planDay(input({ ...base, sex: 'female', conditions: ['preconception'] }, { seed: s }))
      for (const it of plan.meals.flatMap((m) => m.items)) {
        const d = DISH_MAP.get(it.dishId)!
        expect(isAlcohol(d) || isRaw(d) || isSugary(d), d.name).toBe(false)
      }
    }
  })
  it('增肌模式全天蛋白接近 2 g/kg 目标', () => {
    let hit = 0
    for (let s = 0; s < 8; s++) {
      const p = { ...base, conditions: ['training'] as Profile['conditions'] }
      const t = computeTargets(p, NOW)
      const plan = planDay(input(p, { seed: s }))
      if (plan.totals.protein >= t.protein * 0.8) hit++
    }
    expect(hit).toBeGreaterThanOrEqual(6)
  })
  it('纯素只出不含蛋奶肉的菜，且三餐都有菜', () => {
    for (let s = 0; s < 8; s++) {
      const plan = planDay(input({ ...base, dietStyle: 'vegan' }, { seed: s }))
      for (const it of plan.meals.flatMap((m) => m.items)) expect(isVegan(DISH_MAP.get(it.dishId)!), DISH_MAP.get(it.dishId)!.name).toBe(true)
      expect(plan.meals.every((m) => m.items.length > 0)).toBe(true)
    }
    expect(isVegan(DISH_MAP.get('cn_tomato_egg')!)).toBe(false)
    expect(isVegan(DISH_MAP.get('st_rice')!)).toBe(true)
  })
})

describe('反流 / 增肌 · 分析', () => {
  it('反流：连续夜间进食 → 睡前进食提醒；增肌：蛋白不够 → 提醒', () => {
    let entries: LogEntry[] = []
    for (let i = 0; i < 3; i++) {
      const d = addDays(date, -i)
      entries.push({ id: d + 'a', date: d, slot: 'breakfast', time: '08:00', dishId: 'st_rice', portion: 1 })
      entries.push({ id: d + 'b', date: d, slot: 'lunch', time: '12:30', dishId: 'cn_stirfry_bokchoy', portion: 1 })
      entries.push({ id: d + 'c', date: d, slot: 'dinner', time: '22:00', dishId: 'st_rice', portion: 1.5 })
    }
    const g = { ...base, conditions: ['gerd'] as Profile['conditions'] }
    const a = analyze(g, computeTargets(g, NOW), entries, [], DISH_MAP, date)
    expect(a.findings.some((f) => f.key === 'gerd_late')).toBe(true)
    const tr = { ...base, conditions: ['training'] as Profile['conditions'] }
    const b = analyze(tr, computeTargets(tr, NOW), entries, [], DISH_MAP, date)
    expect(b.findings.some((f) => f.key === 'tr_protein')).toBe(true)
  })
})
