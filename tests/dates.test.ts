import { describe, expect, it } from 'vitest'
import { minutesAgoTimeStr } from '../src/core/dates'

describe('minutesAgoTimeStr：记录时「N 分钟前」快捷时间', () => {
  it('0 分钟前就是现在', () => {
    expect(minutesAgoTimeStr(0, new Date(2026, 8, 8, 14, 30))).toBe('14:30')
  })
  it('同一小时内往前推', () => {
    expect(minutesAgoTimeStr(15, new Date(2026, 8, 8, 14, 30))).toBe('14:15')
  })
  it('跨小时往前推', () => {
    expect(minutesAgoTimeStr(60, new Date(2026, 8, 8, 14, 30))).toBe('13:30')
    expect(minutesAgoTimeStr(120, new Date(2026, 8, 8, 1, 10))).toBe('00:00')
  })
  it('跨零点夹到 00:00，不会绕到前一天', () => {
    expect(minutesAgoTimeStr(60, new Date(2026, 8, 8, 0, 30))).toBe('00:00')
  })
})
