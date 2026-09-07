import { describe, expect, it } from 'vitest'
import { DISH_MAP } from '../src/data/dishes/index'
import { computeTargets } from '../src/core/energy'
import { analyze } from '../src/core/analysis'
import { avgWater, cups, fluidFromDrinks, waterOnDate } from '../src/core/water'
import type { LogEntry, Profile, WaterEntry } from '../src/core/types'
import { addDays } from '../src/core/dates'

const NOW = new Date(2026, 8, 7)
const date = '2026-09-07'
const base: Profile = {
  sex: 'male', birthYear: 1990, heightCm: 175, weightKg: 72, activity: 'light', goal: 'maintain',
  dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
}

describe('饮水', () => {
  it('目标：男 1700 女 1500，哺乳 2100，痛风 ≥2000，训练日 +500', () => {
    expect(computeTargets(base, NOW).waterMl).toBe(1700)
    expect(computeTargets({ ...base, sex: 'female' }, NOW).waterMl).toBe(1500)
    expect(computeTargets({ ...base, sex: 'female', conditions: ['lactation'] }, NOW).waterMl).toBe(2100)
    expect(computeTargets({ ...base, sex: 'female', conditions: ['gout'] }, NOW).waterMl).toBe(2000)
    expect(computeTargets({ ...base, conditions: ['training'] }, NOW, undefined, { trainingDay: true }).waterMl).toBe(2200)
  })
  it('按日汇总、饮品液体量、杯格', () => {
    const water: WaterEntry[] = [{ id: 'a', date, ml: 300 }, { id: 'b', date, ml: 250 }, { id: 'c', date: addDays(date, -1), ml: 1000 }]
    expect(waterOnDate(water, date)).toBe(550)
    const logs: LogEntry[] = [{ id: 'l', date, slot: 'breakfast', dishId: 'dr_latte', portion: 1 }, { id: 'm', date, slot: 'lunch', dishId: 'st_rice', portion: 1 }]
    expect(fluidFromDrinks(logs, DISH_MAP, date)).toBe(250)
    expect(cups(550, 1700)).toEqual(['full', 'full', 'half', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'])
    expect(avgWater(water, [date, addDays(date, -1), addDays(date, -2)])).toEqual({ avg: 775, days: 2 })
  })
  it('分析：记满 3 天且不足七成 → 提醒；够了 → 达标', () => {
    const t = computeTargets(base, NOW)
    const low: WaterEntry[] = [0, 1, 2].map((i) => ({ id: String(i), date: addDays(date, -i), ml: 800 }))
    const a = analyze(base, t, [], [], DISH_MAP, date, low)
    expect(a.findings.some((f) => f.key === 'water_low')).toBe(true)
    const ok: WaterEntry[] = [0, 1, 2].map((i) => ({ id: String(i), date: addDays(date, -i), ml: 1800 }))
    const b = analyze(base, t, [], [], DISH_MAP, date, ok)
    expect(b.findings.some((f) => f.key === 'water_ok')).toBe(true)
    expect(analyze(base, t, [], [], DISH_MAP, date, low.slice(0, 2)).findings.some((f) => f.key.startsWith('water'))).toBe(false)
  })
})
