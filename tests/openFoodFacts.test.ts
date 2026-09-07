import { describe, expect, it } from 'vitest'
import { lookupBarcode, normalizeBarcode, parseOffProduct, parseServingGrams } from '../src/core/openFoodFacts'

const coke = {
  code: '5449000000996', status: 1,
  product: {
    code: '5449000000996', product_name: 'Coca-Cola', product_name_zh: '可口可乐 经典原味', brands: 'COCA-COLA SERVICES SA/NV, Coca-Cola', quantity: '330 ml', serving_size: '1 portion (330 ml)',
    nutriments: { 'energy-kcal_100g': 42, energy_100g: 180, proteins_100g: 0, fat_100g: 0, carbohydrates_100g: 10.6, sodium_100g: 0, salt_100g: 0 },
  },
}

describe('Open Food Facts 解析', () => {
  it('取中文名、品牌、份量与每 100 g 营养', () => {
    const p = parseOffProduct(coke)!
    expect(p.name).toBe('可口可乐 经典原味')
    expect(p.brand).toBe('COCA-COLA SERVICES SA/NV')
    expect(p.servingG).toBe(330)
    expect(p.per100).toEqual({ kcal: 42, protein: 0, fat: 0, carbs: 10.6, fiber: 0, sodium: 0 })
  })
  it('没有 kcal 时用 kJ 折算，只有盐时折算成钠', () => {
    const p = parseOffProduct({ status: 1, product: { code: '1', product_name: 'X', nutriments: { energy_100g: 1000, proteins_100g: 5, fat_100g: 2, carbohydrates_100g: 50, salt_100g: 1.25 } } })!
    expect(p.per100.kcal).toBe(239)
    expect(p.per100.sodium).toBe(500)
  })
  it('查不到或没有营养数据返回 null', () => {
    expect(parseOffProduct({ status: 0, status_verbose: 'product not found' })).toBeNull()
    expect(parseOffProduct({ status: 1, product: { code: '2', product_name: 'Y', nutriments: {} } })).toBeNull()
    expect(parseOffProduct(null)).toBeNull()
  })
  it('份量字符串解析', () => {
    expect(parseServingGrams('30 g')).toBe(30)
    expect(parseServingGrams('250 ml')).toBe(250)
    expect(parseServingGrams('2 pieces (45g)')).toBe(45)
    expect(parseServingGrams('1 portion')).toBeUndefined()
    expect(parseServingGrams(undefined)).toBeUndefined()
  })
  it('条码归一化：UPC-A 补 0，其他长度拒绝', () => {
    expect(normalizeBarcode('049000006346')).toBe('0049000006346')
    expect(normalizeBarcode('6920152400024')).toBe('6920152400024')
    expect(normalizeBarcode('12345')).toBeNull()
  })
  it('lookupBarcode 用注入的 fetch，404 视为查不到', async () => {
    const ok = await lookupBarcode('5449000000996', (async () => ({ ok: true, status: 200, json: async () => coke })) as unknown as typeof fetch)
    expect(ok?.name).toBe('可口可乐 经典原味')
    const missing = await lookupBarcode('1', (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch)
    expect(missing).toBeNull()
    await expect(lookupBarcode('1', (async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as typeof fetch)).rejects.toThrow()
  })
})
