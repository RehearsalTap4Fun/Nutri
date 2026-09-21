import { describe, expect, it } from 'vitest'
import { cupCount, cupDueHours, cupsDueAt, fmtHour, thirst, waterStatus } from '../src/core/water'

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

describe('饮水卡那句话', () => {
  it('今天：按刻度说落后多少、下一杯什么时候', () => {
    expect(waterStatus({ when: 'today', lit: 3, n: 7, hour: 19 })).toBe('现在该喝到第 5 杯了，还差 2 杯')
    expect(waterStatus({ when: 'today', lit: 0, n: 7, hour: 9 })).toBe('第 1 杯 10点 前')
    expect(waterStatus({ when: 'today', lit: 3, n: 7, hour: 13 })).toBe('比刻度快 1 杯，下一杯 16点 前')
    expect(waterStatus({ when: 'today', lit: 7, n: 7, hour: 19 })).toBe('今天喝够了')
  })
  it('将来的日子不催你喝水', () => {
    expect(waterStatus({ when: 'future', lit: 0, n: 7, hour: 19 })).toBe('还没到这天，目标 7 杯')
    expect(waterStatus({ when: 'future', lit: 2, n: 7, hour: 19 })).not.toContain('现在')
  })
  it('过去的日子只说结果，不说「现在该喝到第几杯」', () => {
    expect(waterStatus({ when: 'past', lit: 0, n: 7, hour: 19 })).toBe('这天没记饮水')
    expect(waterStatus({ when: 'past', lit: 4, n: 7, hour: 19 })).toBe('这天记了 4 杯，差 3 杯')
    expect(waterStatus({ when: 'past', lit: 7, n: 7, hour: 19 })).toBe('这天喝够了')
  })
})
