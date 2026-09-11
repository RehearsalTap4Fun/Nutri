import { describe, expect, it } from 'vitest'
import { creatureLine } from '../src/core/creatureTalk'
import { ZERO } from '../src/core/types'
import type { Targets } from '../src/core/types'

const targets: Targets = {
  method: 'mifflin', bmr: 1400, tdee: 1800, kcal: 1800, protein: 90, fat: 55, carbs: 220, fiber: 25,
  sodiumMax: 2000, vegServings: 4, fruitG: 200, dairyG: 300, waterMl: 1500, evenCarbs: false,
  slotShare: { breakfast: 0.25, lunch: 0.4, dinner: 0.35, snack: 0 }, notes: [],
}
const meal = (slot: 'breakfast' | 'lunch' | 'dinner') => ({ id: slot, date: '2026-09-11', slot, portion: 1, dishId: 'x' })
const allMealsLogged = [meal('breakfast'), meal('lunch'), meal('dinner')]
const base = { isToday: true, now: '08:00', date: '2026-09-11', entries: [], n: { ...ZERO }, targets, waterMl: 0, showSodium: false, focus: [] }

describe('creatureLine：按优先级挑一句最要紧的话', () => {
  it('看别的日期只给轻松话，不提醒任何进度', () => {
    const line = creatureLine({ ...base, isToday: false, now: '23:00' })
    expect(line.length).toBeGreaterThan(0)
  })

  it('喝水明显落后（差 2 杯以上）优先提醒', () => {
    const line = creatureLine({ ...base, now: '15:00', waterMl: 0 })
    expect(line).toContain('喝')
  })

  it('喝水只差 1 杯时不念叨，看别的信号', () => {
    // 8~22 点排 6 杯，15:00 时应喝到的杯数与只差 1 杯时不该触发喝水提醒
    const line = creatureLine({ ...base, now: '10:00', waterMl: 250 })
    expect(line).not.toContain('喝')
  })

  it('到了饭点但那一餐没记，按早中晚顺序提醒', () => {
    const lunchLine = creatureLine({ ...base, now: '14:00', waterMl: 2000, entries: [meal('breakfast')] })
    expect(lunchLine).toContain('午饭')
    const dinnerLine = creatureLine({ ...base, now: '20:30', waterMl: 2000, entries: [meal('breakfast'), meal('lunch')] })
    expect(dinnerLine).toContain('晚饭')
  })

  it('那一餐已经记过就不会再提醒', () => {
    const line = creatureLine({ ...base, now: '14:00', waterMl: 2000, entries: [meal('breakfast'), meal('lunch')] })
    expect(line).not.toContain('午饭')
  })

  it('高血压模式钠超标会提醒', () => {
    const line = creatureLine({ ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, showSodium: true, n: { ...ZERO, sodium: 2500 } })
    expect(line).toContain('钠')
  })

  it('没开高血压模式时钠超标不提（看不到这个指标）', () => {
    const line = creatureLine({ ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, showSodium: false, n: { ...ZERO, sodium: 2500 } })
    expect(line).not.toContain('钠')
  })

  it('营养超额比缺口优先提', () => {
    const line = creatureLine({
      ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged,
      focus: [{ key: 'fat', kind: 'over', amount: 12, label: '脂肪已超 12 g' }, { key: 'fiber', kind: 'gap', amount: 5, label: '还差纤维 5 g' }],
    })
    expect(line).toContain('脂肪已超 12 g')
  })

  it('只有缺口信号时提缺口', () => {
    const line = creatureLine({
      ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged,
      focus: [{ key: 'fiber', kind: 'gap', amount: 5, label: '还差纤维 5 g' }],
    })
    expect(line).toContain('还差纤维 5 g')
  })

  it('什么都正常时给一句轻松话，同一天结果稳定', () => {
    const a = creatureLine({ ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged })
    const b = creatureLine({ ...base, now: '21:05', waterMl: 2000, entries: allMealsLogged })
    expect(a).toBe(b)
    expect(a.length).toBeGreaterThan(0)
  })
})
