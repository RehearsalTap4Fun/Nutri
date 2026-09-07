import { describe, expect, it } from 'vitest'
import { CONDITIONS } from '../src/core/types'
import type { Profile } from '../src/core/types'
import { computeTargets } from '../src/core/energy'
import { CONDITION_SOURCES, SOURCE_MAP, targetBasis } from '../src/core/sources'

const base: Profile = {
  sex: 'female', birthYear: 1994, heightCm: 163, weightKg: 58, bodyFatPct: 26, activity: 'light', goal: 'lose',
  dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
}

describe('目标依据与参考文献', () => {
  it('每个模式都有出处，且所有引用的文献 id 都存在', () => {
    for (const c of CONDITIONS) {
      expect(CONDITION_SOURCES[c].length, c).toBeGreaterThan(0)
      for (const id of CONDITION_SOURCES[c]) expect(SOURCE_MAP.has(id), `${c} -> ${id}`).toBe(true)
    }
  })
  it('依据表覆盖每一项目标，数值与目标一致，引用有效', () => {
    for (const conds of [[], ['pregnancy'], ['hypertension', 'diabetes'], ['gout'], ['training']] as Profile['conditions'][]) {
      const p = { ...base, conditions: conds, pregnancyTrimester: 3 as const }
      const t = computeTargets(p, new Date(2026, 8, 7))
      const rows = targetBasis(p, t)
      const metrics = rows.map((r) => r.metric)
      for (const m of ['基础代谢', '每日消耗', '目标热量', '蛋白质', '膳食纤维', '钠上限', '蔬菜', '水果', '奶类', '饮水', '三餐占比']) expect(metrics, conds.join()).toContain(m)
      expect(rows.find((r) => r.metric === '目标热量')!.value).toBe(`${t.kcal} 千卡`)
      expect(rows.find((r) => r.metric === '蛋白质')!.value).toBe(`${t.protein} g`)
      expect(rows.find((r) => r.metric === '钠上限')!.value).toBe(`${t.sodiumMax} mg`)
      for (const r of rows) {
        expect(r.rule.length).toBeGreaterThan(5)
        for (const id of r.sources) expect(SOURCE_MAP.has(id), `${r.metric} -> ${id}`).toBe(true)
      }
    }
  })
})
