import { describe, expect, it } from 'vitest'
import type { Profile } from '../src/core/types'
import { isProfileValid, profileProblems } from '../src/core/profile'

const base: Profile = {
  sex: 'male', birthYear: 1990, heightCm: 172, weightKg: 68,
  activity: 'light', goal: 'maintain', dietStyle: 'chinese', mealsPerDay: 3,
  dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
}
const now = new Date('2026-09-20T00:00:00')

describe('档案校验', () => {
  it('正常档案可以保存', () => {
    expect(profileProblems(base, now)).toEqual([])
    expect(isProfileValid(base, now)).toBe(true)
  })

  it('身高越界会被指出来，而且说得出范围', () => {
    // 小程序那边曾经只校验 > 0，输入过程中的 17 会被存下来，网页版就救不回来了
    const p = profileProblems({ ...base, heightCm: 17 }, now)
    expect(p).toHaveLength(1)
    expect(p[0].field).toBe('heightCm')
    expect(p[0].message).toContain('120')
  })

  it('体重越界', () => {
    expect(profileProblems({ ...base, weightKg: 6 }, now)[0].field).toBe('weightKg')
    expect(profileProblems({ ...base, weightKg: 300 }, now)[0].field).toBe('weightKg')
  })

  it('出生年份要满 10 岁', () => {
    expect(isProfileValid({ ...base, birthYear: 2016 }, now)).toBe(true)
    expect(profileProblems({ ...base, birthYear: 2017 }, now)[0].field).toBe('birthYear')
    expect(profileProblems({ ...base, birthYear: 1919 }, now)[0].field).toBe('birthYear')
  })

  it('体脂率留空可以，填了就要在范围内', () => {
    expect(isProfileValid({ ...base, bodyFatPct: undefined }, now)).toBe(true)
    expect(isProfileValid({ ...base, bodyFatPct: 20 }, now)).toBe(true)
    expect(profileProblems({ ...base, bodyFatPct: 90 }, now)[0].field).toBe('bodyFatPct')
  })

  it('NaN 不当成合法值', () => {
    expect(isProfileValid({ ...base, heightCm: Number.NaN }, now)).toBe(false)
  })

  it('多处越界会全部列出来', () => {
    const p = profileProblems({ ...base, heightCm: 5, weightKg: 5, birthYear: 3000 }, now)
    expect(p.map((x) => x.field).sort()).toEqual(['birthYear', 'heightCm', 'weightKg'])
  })
})
