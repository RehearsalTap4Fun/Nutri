import { describe, expect, it } from 'vitest'
import { DISH_MAP } from '../src/data/dishes/index'
import { computeTargets } from '../src/core/energy'
import { foodVerdictForDish, foodVerdictForNutrients } from '../src/core/verdict'
import { ZERO } from '../src/core/types'
import type { Profile } from '../src/core/types'

const NOW = new Date(2026, 8, 4, 12)
const base: Profile = {
  sex: 'female', birthYear: 1994, heightCm: 163, weightKg: 58, bodyFatPct: 26, activity: 'light', goal: 'lose',
  dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
}
const pineapple = DISH_MAP.get('cv2_pineapple')!
const pickledCongee = DISH_MAP.get('bf_congee_pickle_egg')!
const crab = DISH_MAP.get('cn2_zheng_xie')!
const cola = DISH_MAP.get('dr_cola')!

describe('能不能吃 · 按人群模式', () => {
  it('没有设置模式：只看预算，干净的菜给 ok', () => {
    const p: Profile = { ...base, conditions: [] }
    const t = computeTargets(p, NOW)
    const r = foodVerdictForDish(pineapple, p, t, ZERO)
    expect(r.verdict).toBe('ok')
    expect(r.reasons).toEqual([])
  })

  it('高血压：腌菜直接不建议，理由提到腌', () => {
    const p: Profile = { ...base, conditions: ['hypertension'] }
    const t = computeTargets(p, NOW)
    const r = foodVerdictForDish(pickledCongee, p, t, ZERO)
    expect(r.verdict).toBe('avoid')
    expect(r.reasons.some((x) => x.includes('腌'))).toBe(true)
  })

  it('高血压：低钠水果给 ok', () => {
    const p: Profile = { ...base, conditions: ['hypertension'] }
    const t = computeTargets(p, NOW)
    const r = foodVerdictForDish(pineapple, p, t, ZERO)
    expect(r.verdict).toBe('ok')
  })

  it('痛风：清蒸螃蟹高嘌呤，不建议', () => {
    const p: Profile = { ...base, conditions: ['gout'] }
    const t = computeTargets(p, NOW)
    const r = foodVerdictForDish(crab, p, t, ZERO)
    expect(r.verdict).toBe('avoid')
    expect(r.reasons.some((x) => x.includes('嘌呤'))).toBe(true)
  })

  it('糖尿病：可乐含糖，不建议', () => {
    const p: Profile = { ...base, conditions: ['diabetes'] }
    const t = computeTargets(p, NOW)
    const r = foodVerdictForDish(cola, p, t, ZERO)
    expect(r.verdict).toBe('avoid')
    expect(r.reasons.some((x) => x.includes('糖'))).toBe(true)
  })

  it('同时选中糖尿病与痛风：可乐两条理由都给', () => {
    const p: Profile = { ...base, conditions: ['diabetes', 'gout'] }
    const t = computeTargets(p, NOW)
    const r = foodVerdictForDish(cola, p, t, ZERO)
    expect(r.verdict).toBe('avoid')
    expect(r.reasons.filter((x) => x.includes('糖')).length).toBeGreaterThanOrEqual(2)
  })
})

describe('能不能吃 · 基于今天已吃的预算', () => {
  it('今天热量已经到量：干净的菜也变成少吃点', () => {
    const p: Profile = { ...base, conditions: [] }
    const t = computeTargets(p, NOW)
    const eaten = { ...ZERO, kcal: t.kcal + 100 }
    const r = foodVerdictForDish(pineapple, p, t, eaten)
    expect(r.verdict).toBe('caution')
    expect(r.reasons.some((x) => x.includes('千卡'))).toBe(true)
  })

  it('高血压：今天钠已经超上限，加一份就是不建议', () => {
    const p: Profile = { ...base, conditions: ['hypertension'] }
    const t = computeTargets(p, NOW)
    const eaten = { ...ZERO, sodium: t.sodiumMax + 1 }
    const r = foodVerdictForDish(pineapple, p, t, eaten)
    expect(r.verdict).toBe('avoid')
    expect(r.reasons.some((x) => x.includes('钠'))).toBe(true)
  })

  it('糖尿病：今天碳水已经到量，会提醒血糖', () => {
    const p: Profile = { ...base, conditions: ['diabetes'] }
    const t = computeTargets(p, NOW)
    const eaten = { ...ZERO, carbs: t.carbs + 5 }
    const r = foodVerdictForDish(pineapple, p, t, eaten)
    expect(r.verdict).toBe('caution')
    expect(r.reasons.some((x) => x.includes('碳水已经到量'))).toBe(true)
  })
})

describe('能不能吃 · 自定义食物（只有营养数值）', () => {
  it('高血压模式下标注局限性', () => {
    const p: Profile = { ...base, conditions: ['hypertension'] }
    const t = computeTargets(p, NOW)
    const r = foodVerdictForNutrients({ ...ZERO, kcal: 200, sodium: 900 }, p, t, ZERO)
    expect(r.limited).toBe(true)
    expect(r.verdict).toBe('avoid')
  })

  it('没有模式时不标注局限性', () => {
    const p: Profile = { ...base, conditions: [] }
    const t = computeTargets(p, NOW)
    const r = foodVerdictForNutrients({ ...ZERO, kcal: 200 }, p, t, ZERO)
    expect(r.limited).toBe(false)
  })
})
