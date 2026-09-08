import { describe, expect, it } from 'vitest'
import { DISHES } from '../src/data/dishes/index'
import { dishWeight, servingGrams, servingGramsFromText } from '../src/core/nutrition'
import { portionText, roundGrams } from '../src/ui/format'

const byName = (n: string) => DISHES.find((d) => d.name === n)!

describe('成品重量 servingGrams', () => {
  it('读份量描述：可食 > 约 N g/ml > 唯一的重量数字', () => {
    expect(servingGramsFromText('1个(约220g)')).toBe(220)
    expect(servingGramsFromText('带壳约40g(可食25g)')).toBe(25)
    expect(servingGramsFromText('1份(可食部约150g)')).toBe(150)
    expect(servingGramsFromText('1瓶(500ml)')).toBe(500)
    expect(servingGramsFromText('2两(100ml)')).toBe(100)
    expect(servingGramsFromText('1桶(干重约100g)')).toBe(100)
    expect(servingGramsFromText('1勺(30g)+300ml水')).toBeUndefined()
    expect(servingGramsFromText('1根玉米+1个蛋+1杯牛奶')).toBeUndefined()
    expect(servingGramsFromText(undefined)).toBeUndefined()
  })
  it('用生米干粉拼的菜取描述里的成品重量，而不是食材合计', () => {
    const d = byName('糯米鸡')
    expect(dishWeight(d)).toBeLessThan(160)
    expect(servingGrams(d)).toBe(220)
  })
  it('描述里读不出重量时退回食材合计', () => {
    const d = byName('蛋白粉冲水')
    expect(servingGrams(d)).toBe(dishWeight(d))
    expect(servingGrams(d)).toBe(330)
  })
  it('全库每道菜都能得到正的成品重量，且与食材合计不会相差 3 倍以上', () => {
    for (const d of DISHES) {
      const g = servingGrams(d)
      expect(g, d.name).toBeGreaterThan(0)
      const r = g / Math.max(1, dishWeight(d))
      expect(r, `${d.name} ${g} vs ${dishWeight(d)}`).toBeGreaterThan(1 / 3)
      expect(r, `${d.name} ${g} vs ${dishWeight(d)}`).toBeLessThan(3)
    }
  })
})

describe('份量文案 portionText', () => {
  it('整份写 N份，非整份换算成约 N g', () => {
    expect(portionText(1, 230)).toBe('1份')
    expect(portionText(2, 230)).toBe('2份')
    expect(portionText(0.5, 230)).toBe('约 115 g')
    expect(portionText(1.5, 230)).toBe('约 345 g')
    expect(portionText(0.25, 200)).toBe('约 50 g')
  })
  it('不知道一份多重时退回分数写法', () => {
    expect(portionText(0.5)).toBe('½份')
    expect(portionText(1.75, 0)).toBe('1¾份')
  })
  it('约 N g 取整：30 g 以上取 5 的倍数', () => {
    expect(roundGrams(113)).toBe(115)
    expect(roundGrams(18.4)).toBe(18)
  })
})
