import { describe, expect, it } from 'vitest'
import { DISHES, DISH_MAP } from '../src/data/dishes/index'
import { computeTargets } from '../src/core/energy'
import { NO_ADJUST, analyze } from '../src/core/analysis'
import { planDay } from '../src/core/planner'
import type { PlanInput } from '../src/core/planner'
import { conditionExcludes, isAlcohol, isCaffeine, isPickledOrCured, isRaw, isSugary, isWholeGrain } from '../src/core/conditions'
import type { LogEntry, Profile } from '../src/core/types'
import { addDays } from '../src/core/dates'

const NOW = new Date(2026, 8, 4)
const date = '2026-09-04'
const base: Profile = {
  sex: 'female', birthYear: 1994, heightCm: 163, weightKg: 58, bodyFatPct: 26, activity: 'light', goal: 'lose',
  dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
}
function input(p: Profile, extra: Partial<PlanInput> = {}): PlanInput {
  return { profile: p, targets: computeTargets(p, NOW), dishes: DISHES, dishMap: DISH_MAP, date, seed: 0, recentEntries: [], adjustments: { ...NO_ADJUST }, ...extra }
}

describe('特殊人群模式 · 目标', () => {
  it('孕中期 +250 千卡 +15 g 蛋白，减脂目标被改为维持', () => {
    const t0 = computeTargets({ ...base, goal: 'maintain' }, NOW)
    const t = computeTargets({ ...base, conditions: ['pregnancy'], pregnancyTrimester: 2 }, NOW)
    expect(t.kcal).toBe(Math.round((t0.kcal + 250) / 10) * 10)
    expect(t.protein).toBe(t0.protein + 15)
    expect(t.dairyG).toBe(500)
    expect(t.notes.some((n) => n.includes('不建议减脂'))).toBe(true)
    const t3 = computeTargets({ ...base, conditions: ['pregnancy'], pregnancyTrimester: 3 }, NOW)
    expect(t3.kcal - t.kcal).toBe(150)
  })
  it('哺乳期 +400 千卡 +25 g 蛋白', () => {
    const t0 = computeTargets({ ...base, goal: 'maintain' }, NOW)
    const t = computeTargets({ ...base, goal: 'maintain', conditions: ['lactation'] }, NOW)
    expect(t.kcal).toBe(Math.round((t0.kcal + 400) / 10) * 10)
    expect(t.protein).toBe(t0.protein + 25)
  })
  it('高血压：钠 1500，蔬菜 5 份', () => {
    const t = computeTargets({ ...base, conditions: ['hypertension'] }, NOW)
    expect(t.sodiumMax).toBe(1500)
    expect(t.vegServings).toBe(5)
    expect(t.fruitG).toBe(300)
  })
  it('糖尿病：碳水 50%，蛋白 ≥18%，纤维 ≥30，按餐均分', () => {
    const t = computeTargets({ ...base, conditions: ['diabetes'] }, NOW)
    expect((t.carbs * 4) / t.kcal).toBeCloseTo(0.5, 1)
    expect((t.protein * 4) / t.kcal).toBeGreaterThanOrEqual(0.179)
    expect(t.fiber).toBeGreaterThanOrEqual(30)
    expect(t.evenCarbs).toBe(true)
  })
})

describe('特殊人群模式 · 判定', () => {
  it('酒精 / 咖啡因 / 生食 / 腌腊 / 含糖 / 粗粮 的识别', () => {
    const d = (id: string) => DISH_MAP.get(id)!
    expect(isAlcohol(d('dr_beer'))).toBe(true)
    expect(isCaffeine(d('dr_latte'))).toBe(true)
    expect(isCaffeine(d('dr_tea'))).toBe(true)
    expect(isRaw(d('to_sushi_10'))).toBe(true)
    expect(isPickledOrCured(DISHES.find((x) => x.parts.some((p) => p.ing === 'chinese_sausage'))!)).toBe(true)
    expect(isSugary(d('dr_cola'))).toBe(true)
    expect(isSugary(d('st_rice'))).toBe(false)
    expect(isWholeGrain(DISHES.find((x) => x.parts.some((p) => p.ing === 'brown_rice_cooked'))!)).toBe(true)
    expect(conditionExcludes(d('dr_beer'), { ...base, conditions: ['pregnancy'] })).toBe(true)
    expect(conditionExcludes(d('dr_cola'), { ...base, conditions: ['diabetes'] })).toBe(true)
    expect(conditionExcludes(d('dr_cola'), base)).toBe(false)
  })
})

describe('特殊人群模式 · 推荐', () => {
  it('孕期不推荐酒精、咖啡因、生食', () => {
    for (let s = 0; s < 8; s++) {
      const plan = planDay(input({ ...base, conditions: ['pregnancy'], pregnancyTrimester: 2 }, { seed: s }))
      for (const it of plan.meals.flatMap((m) => m.items)) {
        const d = DISH_MAP.get(it.dishId)!
        expect(isAlcohol(d) || isCaffeine(d) || isRaw(d), d.name).toBe(false)
      }
      expect(plan.notes.some((n) => n.includes('孕期模式'))).toBe(true)
    }
  })
  it('高血压不推荐腌腊，全天钠不高于普通模式且日均不超 2000', () => {
    let htn = 0
    let normal = 0
    for (let s = 0; s < 6; s++) {
      const a = planDay(input({ ...base, conditions: ['hypertension'] }, { seed: s }))
      const b = planDay(input(base, { seed: s }))
      for (const it of a.meals.flatMap((m) => m.items)) expect(isPickledOrCured(DISH_MAP.get(it.dishId)!)).toBe(false)
      htn += a.totals.sodium
      normal += b.totals.sodium
    }
    expect(htn).toBeLessThanOrEqual(normal)
    expect(htn / 6).toBeLessThanOrEqual(2000)
  })
  it('糖尿病不推荐含糖饮料与甜食，单餐碳水不超过上限', () => {
    for (let s = 0; s < 8; s++) {
      const p = { ...base, conditions: ['diabetes'] as Profile['conditions'] }
      const t = computeTargets(p, NOW)
      const plan = planDay(input(p, { seed: s }))
      for (const it of plan.meals.flatMap((m) => m.items)) expect(isSugary(DISH_MAP.get(it.dishId)!)).toBe(false)
      for (const m of plan.meals.filter((x) => x.slot === 'lunch' || x.slot === 'dinner')) {
        const cap = t.carbs * t.slotShare[m.slot] * 1.15
        expect(m.totals.carbs, `${m.slot} seed ${s}`).toBeLessThanOrEqual(cap * 1.1 + 1)
      }
    }
  })
})

describe('特殊人群模式 · 分析', () => {
  it('孕期一周没喝奶 → 奶类不够；糖尿病记了可乐 → 含糖提醒', () => {
    let entries: LogEntry[] = []
    for (let i = 0; i < 4; i++) {
      const d = addDays(date, -i)
      entries.push({ id: d + 'a', date: d, slot: 'breakfast', dishId: 'bf_egg_boiled', portion: 2 })
      entries.push({ id: d + 'b', date: d, slot: 'lunch', dishId: 'st_rice', portion: 1 })
      entries.push({ id: d + 'c', date: d, slot: 'lunch', dishId: 'cn_tomato_egg', portion: 1 })
      entries.push({ id: d + 'd', date: d, slot: 'dinner', dishId: 'dr_cola', portion: 1 })
    }
    const preg = { ...base, conditions: ['pregnancy'] as Profile['conditions'], pregnancyTrimester: 2 as const }
    const a = analyze(preg, computeTargets(preg, NOW), entries, [], DISH_MAP, date)
    expect(a.findings.some((f) => f.key === 'dairy_low')).toBe(true)
    const dm = { ...base, conditions: ['diabetes'] as Profile['conditions'] }
    const b = analyze(dm, computeTargets(dm, NOW), entries, [], DISH_MAP, date)
    expect(b.findings.some((f) => f.key === 'dm_sugar')).toBe(true)
  })
})

describe('特殊人群模式 · 脂肪肝 / 痛风 / 老年人', () => {
  it('目标：老年人蛋白 ≥1.2 g/kg 且奶类 400；脂肪肝碳水 48%；痛风水果 ≤200 减脂放缓', () => {
    const eld = computeTargets({ ...base, goal: 'maintain', conditions: ['elderly'] }, NOW)
    expect(eld.protein).toBeGreaterThanOrEqual(Math.round(base.weightKg * 1.2))
    expect(eld.dairyG).toBe(400)
    const fl = computeTargets({ ...base, conditions: ['fatty_liver'] }, NOW)
    expect((fl.carbs * 4) / fl.kcal).toBeCloseTo(0.48, 1)
    expect((fl.protein * 4) / fl.kcal).toBeGreaterThanOrEqual(0.199)
    const g = computeTargets({ ...base, conditions: ['gout'] }, NOW)
    expect(g.fruitG).toBe(200)
    const normalLose = computeTargets(base, NOW)
    expect(g.kcal).toBeGreaterThan(normalLose.kcal)
  })
  it('痛风不推荐高嘌啉、酒与含糖；脂肪肝不推荐酒与含糖', async () => {
    const { isHighPurine } = await import('../src/core/conditions')
    for (let s = 0; s < 8; s++) {
      const g = planDay(input({ ...base, conditions: ['gout'] }, { seed: s }))
      for (const it of g.meals.flatMap((m) => m.items)) {
        const d = DISH_MAP.get(it.dishId)!
        expect(isHighPurine(d) || isAlcohol(d) || isSugary(d), d.name).toBe(false)
      }
      expect(g.meals.filter((m) => m.slot !== 'snack').every((m) => m.items.length > 0)).toBe(true)
      const fl = planDay(input({ ...base, conditions: ['fatty_liver'] }, { seed: s }))
      for (const it of fl.meals.flatMap((m) => m.items)) {
        const d = DISH_MAP.get(it.dishId)!
        expect(isAlcohol(d) || isSugary(d), d.name).toBe(false)
      }
    }
  })
  it('老年人早餐必配蛋白，且不推荐油炸', () => {
    for (let s = 0; s < 8; s++) {
      const plan = planDay(input({ ...base, goal: 'maintain', conditions: ['elderly'] }, { seed: s }))
      const bf = plan.meals.find((m) => m.slot === 'breakfast')!
      expect(bf.totals.protein).toBeGreaterThanOrEqual(15)
      for (const it of plan.meals.flatMap((m) => m.items)) expect(DISH_MAP.get(it.dishId)!.cook).not.toBe('fried')
    }
  })
  it('分析：痛风记了小龙虾与啤酒 → 高嘌啉与酒的提醒', () => {
    const crayfish = DISHES.find((d) => d.parts.some((p) => p.ing === 'crayfish'))!
    let entries: LogEntry[] = []
    for (let i = 0; i < 3; i++) {
      const d = addDays(date, -i)
      entries.push({ id: d + 'a', date: d, slot: 'breakfast', dishId: 'bf_egg_boiled', portion: 2 })
      entries.push({ id: d + 'b', date: d, slot: 'lunch', dishId: 'st_rice', portion: 1 })
      entries.push({ id: d + 'c', date: d, slot: 'dinner', dishId: crayfish.id, portion: 1 })
      entries.push({ id: d + 'd', date: d, slot: 'dinner', dishId: 'dr_beer', portion: 1 })
    }
    const p = { ...base, conditions: ['gout'] as Profile['conditions'] }
    const a = analyze(p, computeTargets(p, NOW), entries, [], DISH_MAP, date)
    expect(a.findings.some((f) => f.key === 'gout_purine')).toBe(true)
    expect(a.findings.some((f) => f.key === 'gout_alcohol')).toBe(true)
  })
})
