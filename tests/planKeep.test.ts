import { describe, expect, it } from 'vitest'
import type { LogEntry, MealSlot, Profile } from '../src/core/types'
import { computeTargets } from '../src/core/energy'
import { NO_ADJUST } from '../src/core/analysis'
import { DISHES, DISH_MAP } from '../src/data/dishes/index'
import { keptPlanFits, planDay } from '../src/core/planner'
import type { PlanItem } from '../src/core/planner'
import { entryNutrients } from '../src/core/nutrition'

const profile: Profile = {
  sex: 'male', birthYear: 1990, heightCm: 172, weightKg: 68,
  activity: 'light', goal: 'maintain', dietStyle: 'chinese', mealsPerDay: 3,
  dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
}
const targets = computeTargets(profile, new Date('2026-09-20T09:00:00'))
const date = '2026-09-20'
const ZERO = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 }

const base = {
  profile, targets, dishes: DISHES, dishMap: DISH_MAP, date, seed: 0,
  recentEntries: [] as LogEntry[], adjustments: NO_ADJUST,
}

/** 把一餐的推荐变成「已吃」的记录 */
function asEntries(items: PlanItem[], slot: MealSlot): LogEntry[] {
  return items.map((it, i) => ({ id: `${slot}${i}`, date, slot, dishId: it.dishId, portion: it.portion }))
}

describe('按推荐吃就不重排', () => {
  const first = planDay(base)
  const keep: Partial<Record<MealSlot, PlanItem[]>> = {}
  for (const m of first.meals) keep[m.slot] = m.items

  it('照推荐吃了早餐，午晚餐原样保留', () => {
    const bf = first.meals.find((m) => m.slot === 'breakfast')!
    const eatenEntries = asEntries(bf.items, 'breakfast')
    const eatenN = eatenEntries.reduce(
      (a, e) => { const n = entryNutrients(e, DISH_MAP); return { ...a, kcal: a.kcal + n.kcal, protein: a.protein + n.protein, fat: a.fat + n.fat, carbs: a.carbs + n.carbs, fiber: a.fiber + n.fiber, sodium: a.sodium + n.sodium } },
      { ...ZERO },
    )
    const next = planDay({ ...base, eatenToday: { breakfast: eatenN }, recentEntries: eatenEntries, keep })

    expect(next.eatenSlots).toContain('breakfast')
    for (const slot of ['lunch', 'dinner'] as MealSlot[]) {
      const before = keep[slot]!.map((i) => i.dishId)
      const after = next.meals.find((m) => m.slot === slot)!.items.map((i) => i.dishId)
      expect(after).toEqual(before)
    }
    expect(next.notes).toContain('按上次的推荐保留，没有重排')
  })

  it('没传 keep 就照常重排', () => {
    const next = planDay({ ...base, seed: 1 })
    expect(next.notes).not.toContain('按上次的推荐保留，没有重排')
  })

  it('吃了额外的高热量食物，沿用就不满足，于是重排', () => {
    // 凭空加 1200 千卡，剩下的推荐照原样一定会超
    const blown = { ...ZERO, kcal: 1200, protein: 20 }
    const fits = keptPlanFits(keep, blown, targets, DISH_MAP)
    expect(fits).toBe(false)
    const next = planDay({ ...base, eatenToday: { breakfast: blown }, keep })
    expect(next.notes).not.toContain('按上次的推荐保留，没有重排')
  })

  it('缺任何一餐的历史就整体重排，不做半留半换', () => {
    const partial = { lunch: keep.lunch }
    expect(planDay({ ...base, keep: partial }).notes).not.toContain('按上次的推荐保留，没有重排')
  })
})

describe('keptPlanFits 的判定口径', () => {
  const plan = planDay(base)
  const keep: Partial<Record<MealSlot, PlanItem[]>> = {}
  for (const m of plan.meals) keep[m.slot] = m.items

  it('什么都没吃时，整份推荐本身是满足的', () => {
    expect(keptPlanFits(keep, { ...ZERO }, targets, DISH_MAP)).toBe(true)
  })

  it('热量差 10% 以内算满足，超出就不算', () => {
    expect(keptPlanFits({}, { ...ZERO, kcal: targets.kcal, protein: targets.protein }, targets, DISH_MAP)).toBe(true)
    expect(keptPlanFits({}, { ...ZERO, kcal: targets.kcal * 1.2, protein: targets.protein }, targets, DISH_MAP)).toBe(false)
  })

  it('蛋白低于 85% 不算满足，即便热量正好', () => {
    const n = { ...ZERO, kcal: targets.kcal, protein: targets.protein * 0.5 }
    expect(keptPlanFits({}, n, targets, DISH_MAP)).toBe(false)
  })
})
