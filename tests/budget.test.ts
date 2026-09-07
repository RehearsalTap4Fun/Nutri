import { describe, expect, it } from 'vitest'
import type { Profile } from '../src/core/types'
import { DISHES, DISH_MAP } from '../src/data/dishes/index'
import { INGREDIENTS } from '../src/data/ingredients'
import { suggestForBudget } from '../src/core/budget'
import { dishAllergens } from '../src/core/nutrition'
import { normalizeState } from '../src/store/storage'

const base: Profile = {
  sex: 'male', birthYear: 1990, heightCm: 175, weightKg: 72, activity: 'light', goal: 'lose', dietStyle: 'chinese', mealsPerDay: 3,
  dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
}

describe('食物库扩充', () => {
  it('食材与菜品数量达到扩充后的规模，且 id 不重复', () => {
    expect(INGREDIENTS.length).toBeGreaterThanOrEqual(360)
    expect(DISHES.length).toBeGreaterThanOrEqual(560)
    expect(new Set(DISHES.map((d) => d.id)).size).toBe(DISHES.length)
    expect(new Set(INGREDIENTS.map((i) => i.id)).size).toBe(INGREDIENTS.length)
  })
  it('USDA 来源的食材带 source 标记', () => {
    const usda = INGREDIENTS.filter((i) => i.source?.startsWith('usda:'))
    expect(usda.length).toBeGreaterThanOrEqual(120)
    expect(DISH_MAP.get('cn2_qingzheng_xueyu')?.parts.some((p) => p.ing === 'cod')).toBe(true)
  })
})

describe('剩余预算建议 suggestForBudget', () => {
  it('给出的每道菜都放得进剩余热量', () => {
    const picks = suggestForBudget({ remainKcal: 400, remainProtein: 30, slot: 'dinner', dishes: DISHES, profile: base })
    expect(picks.length).toBeGreaterThan(0)
    expect(picks.length).toBeLessThanOrEqual(6)
    for (const p of picks) expect(p.n.kcal).toBeLessThanOrEqual(400 * 1.0001)
  })
  it('剩余太少时不给建议', () => {
    expect(suggestForBudget({ remainKcal: 30, remainProtein: 0, slot: 'dinner', dishes: DISHES, profile: base })).toEqual([])
  })
  it('遵守过敏与不想吃', () => {
    const p = { ...base, allergens: ['seafood' as const], dislikedDishes: ['cn_tomato_egg'] }
    const picks = suggestForBudget({ remainKcal: 600, remainProtein: 40, slot: 'lunch', dishes: DISHES, profile: p, limit: 30 })
    for (const x of picks) {
      expect(dishAllergens(x.dish)).not.toContain('seafood')
      expect(x.dish.id).not.toBe('cn_tomato_egg')
    }
  })
  it('蛋白缺口大时优先高蛋白', () => {
    const picks = suggestForBudget({ remainKcal: 500, remainProtein: 60, slot: 'dinner', dishes: DISHES, profile: base, limit: 3 })
    expect(picks[0].n.protein).toBeGreaterThanOrEqual(15)
  })
  it('一份放不下时可以给半份', () => {
    const picks = suggestForBudget({ remainKcal: 200, remainProtein: 10, slot: 'lunch', dishes: DISHES, profile: base, limit: 30 })
    expect(picks.some((p) => p.portion === 0.5)).toBe(true)
  })
})

describe('血压血糖记录存储', () => {
  it('normalizeState 保留合法的 vitals 并补默认值', () => {
    const s = normalizeState({ profile: base, entries: [], vitals: [{ id: 'a', date: '2026-09-07', kind: 'bp', sys: 128, dia: 82 }, { id: 'b', date: '2026-09-07', kind: 'nope' }, 'junk'] })
    expect(s.vitals).toHaveLength(1)
    expect(s.vitals[0].sys).toBe(128)
    expect(normalizeState({ profile: null }).vitals).toEqual([])
  })
})
