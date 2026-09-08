import { describe, expect, it } from 'vitest'
import { VAR_LIMIT, bandFor, devLabel, varX, varianceOf } from '../src/core/variance'

describe('日均 vs 目标 偏差图计算', () => {
  it('偏差 = (实际 − 目标) / 目标，超出 ±60% 夹住并标记 capped', () => {
    expect(varianceOf(1510, 1850, 'near').dev).toBeCloseTo(-0.184, 3)
    const v = varianceOf(0, 26, 'atLeast')
    expect(v.dev).toBe(-1); expect(v.shown).toBe(-VAR_LIMIT); expect(v.capped).toBe(true)
    expect(varianceOf(100, 0, 'near').dev).toBe(0)
  })
  it('三种口径的合适区间', () => {
    expect(bandFor('near', 0.1)).toEqual([-0.1, 0.1])
    expect(bandFor('atLeast', 0.15)).toEqual([-0.15, VAR_LIMIT])
    expect(bandFor('atMost', 0.05)).toEqual([-VAR_LIMIT, 0.05])
    expect(bandFor('near', [0.3, 0.1])).toEqual([-0.3, 0.1])      // 不对称：低到基础代谢才算少，高 10% 就算多
    expect(bandFor('atLeast', [0.9, 0])).toEqual([-VAR_LIMIT, VAR_LIMIT]) // 超出刻度的容忍度夹到刻度边
    expect(varianceOf(186, 217, 'atMost', 0.1).within).toBe(true)   // 碳水少吃是好事
    expect(varianceOf(68, 115, 'atLeast', 0.15).within).toBe(false) // 蛋白 −41% 不够
    expect(varianceOf(57, 58, 'atMost', 0.1).within).toBe(true)
    expect(varianceOf(1700, 1850, 'near', 0.1).within).toBe(true)
    expect(varianceOf(1500, 1850, 'near', 0.1).within).toBe(false)
  })
  it('刻度位置与文案', () => {
    expect(varX(0)).toBe(50); expect(varX(-VAR_LIMIT)).toBe(0); expect(varX(VAR_LIMIT)).toBe(100)
    expect(devLabel(-0.184)).toBe('−18%'); expect(devLabel(0.204)).toBe('+20%'); expect(devLabel(0.001)).toBe('±0%')
  })
})
