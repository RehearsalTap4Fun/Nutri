import { describe, expect, it } from 'vitest'
import { DISHES, DISH_MAP } from '../src/data/dishes/index'
import { INGREDIENTS } from '../src/data/ingredients'
import { dishAllergens, dishNutrients, entryNutrients, isVegetarian, vegGrams } from '../src/core/nutrition'

describe('nutrition', () => {
  it('米饭 200g = 232 kcal', () => {
    const n = dishNutrients(DISH_MAP.get('st_rice')!)
    expect(n.kcal).toBeCloseTo(232, 0)
    expect(n.carbs).toBeCloseTo(51.8, 0)
  })
  it('番茄炒蛋：含蛋过敏原、非纯素、蔬菜 150g', () => {
    const d = DISH_MAP.get('cn_tomato_egg')!
    expect(dishAllergens(d)).toContain('egg')
    expect(isVegetarian(d)).toBe(true)
    expect(vegGrams(d)).toBe(150)
    expect(dishNutrients(d).protein).toBeGreaterThan(13)
  })
  it('记录按份量倍数缩放，自定义条目直接用给定营养', () => {
    const half = entryNutrients({ id: 'x', date: '2026-09-04', slot: 'lunch', dishId: 'st_rice', portion: 0.5 }, DISH_MAP)
    expect(half.kcal).toBeCloseTo(116, 0)
    const c = entryNutrients({ id: 'y', date: '2026-09-04', slot: 'lunch', portion: 2, custom: { name: '自定义', nutrients: { kcal: 100, protein: 10, fat: 1, carbs: 2, fiber: 0, sodium: 5 } } }, DISH_MAP)
    expect(c.kcal).toBe(200)
    expect(c.protein).toBe(20)
  })
  it('全部菜品可计算且 id 唯一', () => {
    const ids = new Set<string>()
    for (const d of DISHES) {
      expect(ids.has(d.id)).toBe(false)
      ids.add(d.id)
      const n = dishNutrients(d)
      expect(n.kcal).toBeGreaterThanOrEqual(0)
      expect(n.kcal).toBeLessThan(1600)
    }
    expect(DISHES.length).toBeGreaterThan(300)
    expect(INGREDIENTS.length).toBeGreaterThan(200)
  })
  it('菜品库覆盖各类别与菜系', () => {
    const cats = new Set(DISHES.map((d) => d.cat))
    for (const c of ['staple', 'protein', 'veg', 'soup', 'breakfast', 'snack', 'drink', 'fruit', 'combo']) expect(cats.has(c as never)).toBe(true)
    const cuisines = new Set(DISHES.map((d) => d.cuisine))
    for (const c of ['cn', 'west', 'takeout', 'convenience']) expect(cuisines.has(c as never)).toBe(true)
  })
})

describe('少盐做法', () => {
  it('只减调味料的一半钠，且只对家常菜生效', async () => {
    const { canLowSalt, condimentSodium, dishNutrientsFor } = await import('../src/core/nutrition')
    const d = DISH_MAP.get('cn_tomato_egg')!
    const full = dishNutrientsFor(d)
    const low = dishNutrientsFor(d, { lowSalt: true })
    expect(canLowSalt(d)).toBe(true)
    expect(full.sodium - low.sodium).toBeCloseTo(condimentSodium(d) * 0.5, 3)
    expect(low.kcal).toBe(full.kcal)
    const takeout = DISHES.find((x) => x.cuisine === 'takeout' && x.cat === 'combo')!
    expect(canLowSalt(takeout)).toBe(false)
    expect(dishNutrientsFor(takeout, { lowSalt: true }).sodium).toBe(dishNutrientsFor(takeout).sodium)
    const lowOil = dishNutrientsFor(d, { lowOil: true })
    expect(full.fat - lowOil.fat).toBeCloseTo(5, 1)
    expect(full.kcal - lowOil.kcal).toBeCloseTo(45, 0)
    const e = entryNutrients({ id: 'x', date: '2026-09-05', slot: 'lunch', dishId: 'cn_tomato_egg', portion: 2, lowSalt: true }, DISH_MAP)
    expect(e.sodium).toBeCloseTo(low.sodium * 2, 3)
  })
})
