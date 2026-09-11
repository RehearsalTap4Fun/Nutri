import { describe, expect, it } from 'vitest'
import type { Profile } from '../src/core/types'
import { DISHES, DISH_MAP } from '../src/data/dishes/index'
import { INGREDIENTS } from '../src/data/ingredients'
import { budgetFocus, remainOf, suggestForBudget } from '../src/core/budget'
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

// 一个普通减脂日的目标；剩余值按「目标 − 已吃」给
const T = { kcal: 1850, protein: 115, fat: 58, carbs: 217, fiber: 25 }
const R = (o: Partial<typeof T>) => ({ kcal: 500, protein: 30, fat: 20, carbs: 80, fiber: 8, ...o })
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)

describe('剩余预算建议 suggestForBudget', () => {
  it('给出的每道菜都放得进剩余热量', () => {
    const picks = suggestForBudget({ remain: R({ kcal: 400 }), targets: T, slot: 'dinner', dishes: DISHES, profile: base })
    expect(picks.length).toBeGreaterThan(0)
    expect(picks.length).toBeLessThanOrEqual(6)
    for (const p of picks) expect(p.n.kcal).toBeLessThanOrEqual(400 * 1.0001)
  })
  it('剩余太少时不给建议', () => {
    expect(suggestForBudget({ remain: R({ kcal: 30 }), targets: T, slot: 'dinner', dishes: DISHES, profile: base })).toEqual([])
  })
  it('遵守过敏与不想吃', () => {
    const p = { ...base, allergens: ['seafood' as const], dislikedDishes: ['cn_tomato_egg'] }
    const picks = suggestForBudget({ remain: R({ kcal: 600, protein: 40 }), targets: T, slot: 'lunch', dishes: DISHES, profile: p, limit: 30 })
    for (const x of picks) {
      expect(dishAllergens(x.dish)).not.toContain('seafood')
      expect(x.dish.id).not.toBe('cn_tomato_egg')
    }
  })
  it('蛋白缺口大时优先高蛋白，理由写补蛋白', () => {
    const picks = suggestForBudget({ remain: R({ protein: 60 }), targets: T, slot: 'dinner', dishes: DISHES, profile: base, limit: 3 })
    expect(picks[0].n.protein).toBeGreaterThanOrEqual(15)
    expect(picks[0].why).toMatch(/补蛋白/)
  })
  it('脂肪已超时，同样的热量下挑出的菜整体更少油', () => {
    const fatOk = suggestForBudget({ remain: R({ fat: 30 }), targets: T, slot: 'dinner', dishes: DISHES, profile: base })
    const fatOver = suggestForBudget({ remain: R({ fat: -10 }), targets: T, slot: 'dinner', dishes: DISHES, profile: base })
    expect(mean(fatOver.map((p) => p.n.fat))).toBeLessThan(mean(fatOk.map((p) => p.n.fat)))
    expect(fatOver[0].n.fat).toBeLessThanOrEqual(20)
  })
  it('碳水已超时避开主食类，理由能说出低碳', () => {
    const normal = suggestForBudget({ remain: R({ protein: 10 }), targets: T, slot: 'dinner', dishes: DISHES, profile: base })
    const picks = suggestForBudget({ remain: R({ carbs: -20, protein: 10 }), targets: T, slot: 'dinner', dishes: DISHES, profile: base })
    expect(mean(picks.map((p) => p.n.carbs))).toBeLessThan(mean(normal.map((p) => p.n.carbs)))
    expect(picks[0].n.carbs).toBeLessThan(30)
    expect(picks.some((p) => /低碳/.test(p.why))).toBe(true)
  })
  it('纤维缺口大、蛋白已够时，有菜的理由是补纤维', () => {
    const picks = suggestForBudget({ remain: R({ protein: 5, fiber: 18 }), targets: T, slot: 'dinner', dishes: DISHES, profile: base })
    expect(picks.some((p) => /补纤维/.test(p.why))).toBe(true)
  })
  it('不喜欢一道后，列表补上下一个候选、其余顺序不变', () => {
    const a = suggestForBudget({ remain: R({}), targets: T, slot: 'dinner', dishes: DISHES, profile: base })
    const b = suggestForBudget({ remain: R({}), targets: T, slot: 'dinner', dishes: DISHES, profile: { ...base, dislikedDishes: [a[0].dish.id] } })
    expect(b).toHaveLength(a.length)
    expect(b.map((p) => p.dish.id)).not.toContain(a[0].dish.id)
    expect(b.slice(0, a.length - 1).map((p) => p.dish.id)).toEqual(a.slice(1).map((p) => p.dish.id))
  })
  it('一份放不下时可以给半份', () => {
    const picks = suggestForBudget({ remain: R({ kcal: 200, protein: 10 }), targets: T, slot: 'lunch', dishes: DISHES, profile: base, limit: 30 })
    expect(picks.some((p) => p.portion === 0.5)).toBe(true)
  })
})

describe('挑菜依据 budgetFocus', () => {
  it('已超的排前面，缺口按相对目标的幅度排，脂肪缺口不提', () => {
    const f = budgetFocus({ kcal: 1500, protein: 99, fat: 30, carbs: 120, fiber: 20 }, T)
    expect(f.map((x) => x.label)).toEqual(['还差蛋白 99 g', '还差纤维 20 g', '还差碳水 120 g'])
    const g = budgetFocus({ kcal: 900, protein: 40, fat: -6, carbs: 30, fiber: 10 }, T)
    expect(g[0]).toMatchObject({ key: 'fat', kind: 'over', label: '脂肪已超 6 g' })
    expect(g.map((x) => x.key)).toEqual(['fat', 'protein', 'fiber'])
  })
  it('remainOf 是目标减已吃', () => {
    expect(remainOf(T, { kcal: 1000, protein: 50, fat: 70, carbs: 100, fiber: 5, sodium: 0 })).toEqual({ kcal: 850, protein: 65, fat: -12, carbs: 117, fiber: 20 })
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

describe('健康小管家存储：性格字段是后加的，老数据要能兼容', () => {
  const traits = { body: 'round', color: 'sage', pattern: 'none', eyes: 'dot', mouth: 'smile', extra: 'none' }
  it('老数据没有 personality，读出来会稳定补一个合法值', () => {
    const old = { id: 'pet-1', traits, bornAt: 1, lastMutatedAt: 1, mutations: 0 }
    const s1 = normalizeState({ profile: base, entries: [], creature: old })
    const s2 = normalizeState({ profile: base, entries: [], creature: old })
    expect(['energetic', 'gentle', 'bossy', 'cool']).toContain(s1.creature?.personality)
    expect(s1.creature?.personality).toBe(s2.creature?.personality)
  })
  it('新数据自带合法 personality 就原样保留', () => {
    const c = { id: 'pet-2', traits, personality: 'bossy', bornAt: 1, lastMutatedAt: 1, mutations: 0 }
    const s = normalizeState({ profile: base, entries: [], creature: c })
    expect(s.creature?.personality).toBe('bossy')
  })
})
