import { describe, expect, it } from 'vitest'
import { cupCount, cupDueHours, cupsDueAt, fmtHour, thirst } from '../src/core/water'

describe('饮水杯与时间刻度', () => {
  it('目标折成 250 ml 的杯数，向上取整', () => {
    expect(cupCount(1700)).toBe(7)
    expect(cupCount(1500)).toBe(6)
    expect(cupCount(2100)).toBe(9)
    expect(cupCount(100)).toBe(1)
  })
  it('8~22 点均分给每一杯', () => {
    expect(cupDueHours(7)).toEqual([10, 12, 14, 16, 18, 20, 22])
    expect(cupDueHours(6)).toEqual([10.33, 12.67, 15, 17.33, 19.67, 22])
  })
  it('到点即算该喝的杯数；口渴 = 该喝 - 已喝', () => {
    expect(cupsDueAt(7.5, 7)).toBe(0)
    expect(cupsDueAt(10, 7)).toBe(1)
    expect(cupsDueAt(15.9, 7)).toBe(3)
    expect(cupsDueAt(23, 7)).toBe(7)
    expect(thirst(1, 15.9, 7)).toBe(2)
    expect(thirst(5, 15.9, 7)).toBe(0)
  })
  it('小时格式化', () => {
    expect(fmtHour(10)).toBe('10点')
    expect(fmtHour(12.67)).toBe('12:40')
  })
})
