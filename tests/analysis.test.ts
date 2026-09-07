import { describe, expect, it } from 'vitest'
import { DISH_MAP } from '../src/data/dishes/index'
import { computeTargets } from '../src/core/energy'
import { adaptiveTdee, analyze, deriveAdjustments, windowStats } from '../src/core/analysis'
import type { LogEntry, Profile, WeightEntry } from '../src/core/types'
import { addDays } from '../src/core/dates'

const profile: Profile = {
  sex: 'male', birthYear: 1996, heightCm: 175, weightKg: 70, bodyFatPct: 18, activity: 'light', goal: 'maintain',
  dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
}
const NOW = new Date(2026, 8, 4)
const today = '2026-09-04'
const targets = computeTargets(profile, NOW)

function day(date: string, dishes: Array<[string, number]>, slot: LogEntry['slot'] = 'lunch'): LogEntry[] {
  return dishes.map(([dishId, portion], i) => ({ id: `${date}-${i}`, date, slot: i === 0 ? 'breakfast' : i === 1 ? 'lunch' : slot, dishId, portion }))
}

describe('analysis', () => {
  it('少于 2 天记录时不产生调整信号', () => {
    const entries = day(today, [['st_rice', 1], ['cn_tomato_egg', 1]])
    const w = windowStats(entries, DISH_MAP, today, 7, targets.kcal)
    const adj = deriveAdjustments(w, targets, profile)
    expect(adj.enough).toBe(false)
    expect(adj.proteinLow).toBe(false)
  })
  it('连续几天只吃米饭和青菜 → 蛋白低、热量低', () => {
    let entries: LogEntry[] = []
    for (let i = 0; i < 4; i++) entries = entries.concat(day(addDays(today, -i), [['st_rice', 1], ['st_rice', 1], ['cn_stirfry_bokchoy', 1]]))
    const a = analyze(profile, targets, entries, [], DISH_MAP, today)
    expect(a.adjustments.enough).toBe(true)
    expect(a.adjustments.proteinLow).toBe(true)
    expect(a.adjustments.kcalUnder).toBe(true)
    expect(a.findings.some((f) => f.key === 'protein_low')).toBe(true)
  })
  it('高钠外卖午餐连续 3 天 → 钠高 + 外卖午餐模式', () => {
    const takeout = [...DISH_MAP.values()].filter((d) => d.cuisine === 'takeout' && d.cat === 'combo').slice(0, 3)
    let entries: LogEntry[] = []
    for (let i = 0; i < 3; i++) {
      const d = addDays(today, -i)
      entries.push({ id: d + 'b', date: d, slot: 'breakfast', dishId: 'bf_egg_boiled', portion: 2 })
      entries.push({ id: d + 'l', date: d, slot: 'lunch', dishId: takeout[i].id, portion: 1 })
      entries.push({ id: d + 'd', date: d, slot: 'dinner', dishId: takeout[(i + 1) % 3].id, portion: 1 })
    }
    const a = analyze(profile, targets, entries, [], DISH_MAP, today)
    expect(a.adjustments.takeoutLunch).toBe(true)
    expect(a.adjustments.sodiumHigh).toBe(true)
  })
  it('自适应 TDEE：数据不足返回 null；足够时按体重斜率修正', () => {
    expect(adaptiveTdee([], [], DISH_MAP, today, 2200, 2200)).toBeNull()
    let entries: LogEntry[] = []
    const weights: WeightEntry[] = []
    for (let i = 0; i < 21; i++) {
      const d = addDays(today, -i)
      // 每天约 2000 kcal
      entries.push({ id: d + 'a', date: d, slot: 'breakfast', portion: 1, custom: { name: 'x', nutrients: { kcal: 600, protein: 30, fat: 20, carbs: 70, fiber: 5, sodium: 500 } } })
      entries.push({ id: d + 'b', date: d, slot: 'lunch', portion: 1, custom: { name: 'y', nutrients: { kcal: 700, protein: 40, fat: 25, carbs: 70, fiber: 5, sodium: 800 } } })
      entries.push({ id: d + 'c', date: d, slot: 'dinner', portion: 1, custom: { name: 'z', nutrients: { kcal: 700, protein: 40, fat: 25, carbs: 70, fiber: 5, sodium: 800 } } })
      // 体重每天掉 0.05 kg（约 385 kcal/天 缺口）
      if (i % 3 === 0) weights.push({ date: d, kg: 70 + i * 0.05 })
    }
    const r = adaptiveTdee(entries, weights, DISH_MAP, today, 2200, 2200)
    expect(r).not.toBeNull()
    expect(r!.intakeAvg).toBe(2000)
    expect(r!.tdee).toBeGreaterThan(2300)
    expect(r!.tdee).toBeLessThan(2450)
  })
})

describe('自定义食物的蔬菜水果份数', () => {
  it('成分表录入带蔬菜克数时计入当日蔬菜量；自建菜按食材算', async () => {
    const { dayStat } = await import('../src/core/analysis')
    const entries: LogEntry[] = [
      { id: 'a', date: today, slot: 'lunch', portion: 1.5, custom: { name: '四季豆炒肉', nutrients: { kcal: 260, protein: 16, fat: 15, carbs: 12, fiber: 4, sodium: 600 }, vegG: 150 } },
      { id: 'b', date: today, slot: 'dinner', portion: 1, dishId: 'custom_test', },
    ]
    const custom = { id: 'custom_test', name: '自建番茄炒蛋', cat: 'protein' as const, cuisine: 'cn' as const, cook: 'normal' as const, slots: ['lunch' as const, 'dinner' as const], serving: '1份', parts: [{ ing: 'tomato', g: 200 }, { ing: 'egg', g: 100 }, { ing: 'oil', g: 10 }, { ing: 'salt', g: 1.5 }] }
    const map = new Map(DISH_MAP)
    map.set(custom.id, custom)
    const st = dayStat(today, entries, map, 2000)
    expect(st.vegG).toBeCloseTo(150 * 1.5 + 200, 5)
    expect(st.n.kcal).toBeGreaterThan(260 * 1.5)
  })
})
