import { describe, expect, it } from 'vitest'
import type { LogEntry, MealSlot } from '../src/core/types'
import { frequentBySlot, frequentDishes } from '../src/core/recent'

const T = '2026-09-08'
let n = 0
const e = (date: string, slot: MealSlot, dishId: string, time?: string): LogEntry => ({ id: 'e' + n++, date, slot, dishId, portion: 1, time })
const days = (k: number) => new Date(Date.UTC(2026, 8, 8 - k)).toISOString().slice(0, 10)

describe('常吃列表 frequentBySlot / frequentDishes', () => {
  const entries: LogEntry[] = [
    ...[1, 2, 3, 5, 8].map((k) => e(days(k), 'breakfast', 'bf_mantou_soymilk')),
    ...[1, 4].map((k) => e(days(k), 'breakfast', 'bf_egg')),
    ...[1, 2, 3].map((k) => e(days(k), 'lunch', 'st_rice')),
    ...[1, 2, 3].map((k) => e(days(k), 'lunch', 'cn_tomato_egg')),
    e(days(2), 'dinner', 'cn_qingzheng_luyu'),
    e(days(40), 'dinner', 'cn_disanxian'), // 超出 30 天窗口
    e(days(1), 'dinner', 'cn_disanxian'),
    { id: 'c', date: days(1), slot: 'snack', portion: 1, custom: { name: '自定义', nutrients: { kcal: 1, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 } } },
  ]
  it('按餐次分开，次数多的在前', () => {
    const f = frequentBySlot(entries, T)
    expect(f.breakfast).toEqual(['bf_mantou_soymilk', 'bf_egg'])
    expect(f.lunch.slice(0, 2).sort()).toEqual(['cn_tomato_egg', 'st_rice'])
    expect(f.breakfast).not.toContain('st_rice')
    expect(f.snack).toEqual([])
  })
  it('次数相同的，最近吃过的排前面；超出窗口的不计', () => {
    const f = frequentBySlot(entries, T)
    expect(f.dinner).toEqual(['cn_disanxian', 'cn_qingzheng_luyu'])
    expect(frequentBySlot(entries, T, { days: 1 }).dinner).toEqual(['cn_disanxian'])
  })
  it('总榜按总次数排，可限数量', () => {
    expect(frequentDishes(entries, T)[0]).toBe('bf_mantou_soymilk')
    expect(frequentDishes(entries, T, { limit: 2 })).toHaveLength(2)
  })
  it('没有记录时四个餐次都是空数组', () => {
    expect(frequentBySlot([], T)).toEqual({ breakfast: [], lunch: [], dinner: [], snack: [] })
  })
})
