import { describe, expect, it } from 'vitest'
import { INGREDIENT_MAP, INGREDIENTS } from '../src/data/ingredients'
import { CUSTOM_CATS, SLOTS_BY_CAT, defaultGrams, draftDish, draftReady, kcalFromMacros } from '../src/core/customDish'
import { guessDishFromName } from '../src/core/dishGuess'
import { dishNutrients } from '../src/core/nutrition'
import { normalizeState, defaultState } from '../src/store/storage'

describe('自建菜', () => {
  it('每个类别都有默认餐次，不会建出一道哪一餐都不推荐的菜', () => {
    for (const [c] of CUSTOM_CATS) {
      expect(SLOTS_BY_CAT[c].length, c).toBeGreaterThan(0)
    }
  })

  it('默认克重是一人份的量级，不会给出 0 或离谱的数', () => {
    for (const ing of INGREDIENTS) {
      const g = defaultGrams(ing)
      expect(g, ing.name).toBeGreaterThan(0)
      expect(g, ing.name).toBeLessThanOrEqual(200)
    }
    // 油盐是调料，给的是调料的量，不是一盘菜的量
    expect(defaultGrams(INGREDIENT_MAP.get('salt')!)).toBeLessThan(5)
    expect(defaultGrams(INGREDIENT_MAP.get('oil')!)).toBeLessThan(20)
  })

  it('没有食材就不成菜；有了就带上总克重与餐次', () => {
    expect(draftDish({ name: '空的', cat: 'protein', cook: 'normal', parts: [] })).toBeNull()
    const d = draftDish({ name: ' 四季豆炒肉 ', cat: 'protein', cook: 'normal', parts: [{ ing: 'green_beans', g: 150 }, { ing: 'pork_lean', g: 80 }] })!
    expect(d.name).toBe('四季豆炒肉')
    expect(d.serving).toBe('1份(约230g)')
    expect(d.slots).toEqual(SLOTS_BY_CAT.protein)
    expect(dishNutrients(d).kcal).toBeGreaterThan(0)
  })

  it('存下来的 id 能过存档校验：换设备导入、云同步都不会把它丢掉', () => {
    const d = draftDish({ name: '秋葵炒虾仁', cat: 'protein', cook: 'normal', parts: [{ ing: 'okra', g: 150 }, { ing: 'shrimp', g: 100 }] }, 'custom_abc123')!
    const s = { ...defaultState(), customDishes: [d] }
    expect(normalizeState(JSON.parse(JSON.stringify(s))).customDishes).toHaveLength(1)
    // 前缀不对的会被存档丢掉，所以 draftDish 的默认 id 也得带前缀
    expect(draftDish({ name: 'x', cat: 'veg', cook: 'light', parts: [{ ing: 'okra', g: 10 }] })!.id.startsWith('custom_')).toBe(true)
  })

  it('名字空着、克重为 0 时存不了', () => {
    const parts = [{ ing: 'okra', g: 150 }]
    expect(draftReady({ name: '  ', cat: 'veg', cook: 'light', parts })).toBe(false)
    expect(draftReady({ name: '秋葵', cat: 'veg', cook: 'light', parts: [] })).toBe(false)
    expect(draftReady({ name: '秋葵', cat: 'veg', cook: 'light', parts: [{ ing: 'okra', g: 0 }] })).toBe(false)
    expect(draftReady({ name: '秋葵', cat: 'veg', cook: 'light', parts })).toBe(true)
  })

  it('热量那格空着时按 4/9/4 折算', () => {
    expect(kcalFromMacros(20, 0, 0)).toBe(80)
    expect(kcalFromMacros(10, 5, 20)).toBe(165)
    expect(kcalFromMacros(0, 0, 0)).toBe(0)
  })

  it('猜出来的食材直接就能存：搜不到时用户只需要改克重', () => {
    const g = guessDishFromName('秋葵炒虾仁', INGREDIENTS)!
    expect(g.matched.length).toBeGreaterThan(0)
    expect(draftReady({ name: g.name, cat: g.cat, cook: g.cook, parts: g.parts })).toBe(true)
    const d = draftDish({ name: g.name, cat: g.cat, cook: g.cook, parts: g.parts }, 'custom_x')!
    expect(dishNutrients(d).protein).toBeGreaterThan(10)
  })
})
