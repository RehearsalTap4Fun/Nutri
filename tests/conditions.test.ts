import { describe, expect, it } from 'vitest'
import { DISHES, DISH_MAP } from '../src/data/dishes/index'
import { computeTargets } from '../src/core/energy'
import { NO_ADJUST, analyze } from '../src/core/analysis'
import { planDay } from '../src/core/planner'
import type { PlanInput } from '../src/core/planner'
import { conditionExcludes, conditionPlanNotes, isAlcohol, isCaffeine, isPickledOrCured, isRaw, isSugary, isWholeGrain } from '../src/core/conditions'
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
  it('高血压：蔬菜 5 份补钾；不再给钠设量化上限（2026-09-20）', () => {
    const t = computeTargets({ ...base, conditions: ['hypertension'] }, NOW)
    expect(t.vegServings).toBe(5)
    expect(t.fruitG).toBe(300)
    expect('sodiumMax' in t, '钠上限应已从目标里移除').toBe(false)
    expect(t.notes.some((n) => n.includes('不再逐日算钠'))).toBe(true)
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
  // 2026-09-20 起不再比较钠总量：家常菜普遍超线，按钠打分推不出正常中餐。
  // 高血压模式改为「避开腌腊 + 优先清淡做法 + 一句静态少盐提醒」。
  it('高血压不推荐腌腊，且给出少盐提醒', () => {
    const p: Profile = { ...base, conditions: ['hypertension'] }
    for (let s = 0; s < 6; s++) {
      const plan = planDay(input(p, { seed: s }))
      for (const it of plan.meals.flatMap((m) => m.items)) expect(isPickledOrCured(DISH_MAP.get(it.dishId)!)).toBe(false)
    }
    const t = computeTargets(p, NOW)
    expect(conditionPlanNotes(p, t).some((n) => n.includes('限盐勺'))).toBe(true)
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

describe('balanceDay 的按餐次约束（2026-09-20 修复）', () => {
  // balanceDay 全程按「全天」预算压份量与换菜，没有任何按餐次的约束，会把 planBreakfast 里
  // 保证过的老年人早餐蛋白再压回去（实测：玉米面窝头 1.5→1.25 份，早餐蛋白 16.2→14.7 g）。
  // 原来的用例只跑 seed 0~7 覆盖不到，这里拉宽到 60。
  it('老年人早餐蛋白在 60 个 seed 下都不掉出 15 g', () => {
    const p: Profile = { ...base, goal: 'maintain', conditions: ['elderly'] }
    let min = Infinity
    const bad: string[] = []
    for (let s = 0; s < 60; s++) {
      const plan = planDay(input(p, { seed: s }))
      const bf = plan.meals.find((m) => m.slot === 'breakfast')!
      min = Math.min(min, bf.totals.protein)
      if (bf.totals.protein < 15) bad.push(`s${s}:${bf.totals.protein.toFixed(1)}g(${bf.items.map((i) => DISH_MAP.get(i.dishId)?.name).join('+')})`)
    }
    expect(bad, bad.join(', ')).toEqual([])
    expect(min).toBeGreaterThanOrEqual(15)
  })

  it('守住早餐蛋白没有把全天热量顶爆', () => {
    const p: Profile = { ...base, goal: 'maintain', conditions: ['elderly'] }
    const t = computeTargets(p, NOW)
    for (let s = 0; s < 40; s++) {
      const plan = planDay(input(p, { seed: s }))
      expect(plan.totals.kcal, `seed ${s}`).toBeLessThan(t.kcal * 1.15)
    }
  })

  it('不带老年人模式时不受影响（这段只在 elderly 下生效）', () => {
    for (let s = 0; s < 20; s++) {
      const plan = planDay(input({ ...base, goal: 'maintain' }, { seed: s }))
      expect(plan.meals.find((m) => m.slot === 'breakfast')!.items.length).toBeGreaterThan(0)
    }
  })
})
