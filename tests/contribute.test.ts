import { describe, expect, it } from 'vitest'
import { contributionText, draftForCustomDish, draftForCustomFood } from '../src/core/contribute'
import { ContributeError, submitContribution } from '../src/sync/contribute'
import type { Dish } from '../src/core/types'
import type { CustomFood } from '../src/store/storage'
import { dishNutrients } from '../src/core/nutrition'

const customDish: Dish = {
  id: 'custom_abc123',
  name: '四季豆炒肉',
  cat: 'protein',
  cuisine: 'cn',
  cook: 'normal',
  slots: ['lunch', 'dinner'],
  serving: '1份(约270g)',
  parts: [{ ing: 'green_beans', g: 200 }, { ing: 'pork_lean', g: 60 }, { ing: 'oil', g: 10 }],
}

const customFood: CustomFood = {
  id: 'food_xyz789',
  name: '自制蛋糕',
  serving: '1块',
  nutrients: { kcal: 320.4, protein: 5.2, fat: 14.1, carbs: 44.3, fiber: 0.9, sodium: 180 },
  vegG: 0,
  barcode: '6912345678901',
}

describe('贡献草稿：自建菜（有食材构成）', () => {
  it('营养值等于食材推导出来的值，带 parts 与匿名标记', () => {
    const d = draftForCustomDish(customDish)
    expect(d.name).toBe('四季豆炒肉')
    expect(d.source).toBe('anonymous')
    expect(d.parts).toEqual([['green_beans', 200], ['pork_lean', 60], ['oil', 10]])
    const n = dishNutrients(customDish)
    expect(d.perServing.kcal).toBe(Math.round(n.kcal))
    expect(d.perServing.protein).toBeCloseTo(n.protein, 1)
  })
  it('没有蔬菜/水果时不带这两个字段', () => {
    const d = draftForCustomDish({ ...customDish, parts: [{ ing: 'pork_lean', g: 100 }] })
    expect(d.vegG).toBeUndefined()
    expect(d.fruitG).toBeUndefined()
  })
})

describe('贡献草稿：自定义食物（只有成分表）', () => {
  it('直接带用户填写的营养值与条码，没有 parts', () => {
    const d = draftForCustomFood(customFood)
    expect(d.parts).toBeUndefined()
    expect(d.perServing).toEqual({ kcal: 320, protein: 5.2, fat: 14.1, carbs: 44.3, fiber: 0.9, sodium: 180 })
    expect(d.barcode).toBe('6912345678901')
    expect(d.source).toBe('anonymous')
  })
  it('vegG 为 0 时不带这个字段（没有蔬菜就不必声明）', () => {
    const d = draftForCustomFood(customFood)
    expect(d.vegG).toBeUndefined()
  })
})

describe('contributionText：生成可读 JSON', () => {
  it('是合法 JSON，且能还原出同样的字段', () => {
    const draft = draftForCustomFood(customFood)
    const text = contributionText(draft)
    expect(JSON.parse(text)).toEqual(draft)
  })
})

describe('submitContribution：直接提交给 /contribute', () => {
  it('成功时不抛错，请求体是草稿本身', async () => {
    const draft = draftForCustomFood(customFood)
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetchMock = async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return { ok: true, status: 200 } as Response
    }
    await submitContribution(draft, { fetchImpl: fetchMock as typeof fetch, apiBase: '/api' })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/contribute')
    expect(JSON.parse(calls[0].init.body as string)).toEqual(draft)
  })
  it('服务器返回非 2xx 时抛 ContributeError', async () => {
    const fetchMock = async () => ({ ok: false, status: 413 } as Response)
    await expect(submitContribution(draftForCustomFood(customFood), { fetchImpl: fetchMock as typeof fetch })).rejects.toThrow(ContributeError)
  })
  it('网络异常时抛 ContributeError', async () => {
    const fetchMock = async () => { throw new Error('offline') }
    await expect(submitContribution(draftForCustomFood(customFood), { fetchImpl: fetchMock as typeof fetch })).rejects.toThrow('提交失败')
  })
})
