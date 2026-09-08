import type { Allergen, Dish, Ingredient, LogEntry, Nutrients } from './types'
import { ZERO } from './types'
import { INGREDIENT_MAP } from '../data/ingredients'

export function scale(n: Nutrients, k: number): Nutrients {
  return {
    kcal: n.kcal * k,
    protein: n.protein * k,
    fat: n.fat * k,
    carbs: n.carbs * k,
    fiber: n.fiber * k,
    sodium: n.sodium * k,
  }
}

export function add(a: Nutrients, b: Nutrients): Nutrients {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    carbs: a.carbs + b.carbs,
    fiber: a.fiber + b.fiber,
    sodium: a.sodium + b.sodium,
  }
}

export function sum(list: Nutrients[]): Nutrients {
  return list.reduce(add, { ...ZERO })
}

export function roundN(n: Nutrients): Nutrients {
  return {
    kcal: Math.round(n.kcal),
    protein: Math.round(n.protein * 10) / 10,
    fat: Math.round(n.fat * 10) / 10,
    carbs: Math.round(n.carbs * 10) / 10,
    fiber: Math.round(n.fiber * 10) / 10,
    sodium: Math.round(n.sodium),
  }
}

const dishCache = new Map<string, Nutrients>()

/** 一份标准份量的营养值（由食材构成推导） */
export function dishNutrients(dish: Dish, ingMap: Map<string, Ingredient> = INGREDIENT_MAP): Nutrients {
  // 用户自建菜（含编辑中的草稿）内容会变，不走按 id 的缓存
  const cacheable = ingMap === INGREDIENT_MAP && !dish.id.startsWith('custom_')
  const cached = cacheable ? dishCache.get(dish.id) : undefined
  if (cached) return cached
  let n: Nutrients = { ...ZERO }
  for (const part of dish.parts) {
    const ing = ingMap.get(part.ing)
    if (!ing) throw new Error(`dish ${dish.id} references unknown ingredient ${part.ing}`)
    n = add(n, scale(ing.per100, part.g / 100))
  }
  if (cacheable) dishCache.set(dish.id, n)
  return n
}

/** 调味料（盐、酱油、酱类等），少盐做法只减这部分的钠 */
export const CONDIMENT_IDS = new Set(['salt', 'soy_sauce', 'oyster_sauce', 'doubanjiang', 'chili_sauce', 'sweet_bean_sauce', 'fermented_bean_curd', 'black_pepper_sauce', 'curry_block', 'ketchup', 'mayonnaise', 'thousand_island', 'vinaigrette', 'chili_oil', 'hotpot_base'])

export function condimentSodium(dish: Dish, ingMap: Map<string, Ingredient> = INGREDIENT_MAP): number {
  let na = 0
  for (const p of dish.parts) {
    const ing = ingMap.get(p.ing)
    if (ing && CONDIMENT_IDS.has(p.ing)) na += (ing.per100.sodium * p.g) / 100
  }
  return na
}

/** 烹调油（少油做法只减这部分的脂肪与热量） */
export const OIL_IDS = new Set(['oil', 'lard', 'olive_oil', 'sesame_oil', 'chili_oil', 'butter'])

export function oilFat(dish: Dish, ingMap: Map<string, Ingredient> = INGREDIENT_MAP): number {
  let fat = 0
  for (const p of dish.parts) {
    const ing = ingMap.get(p.ing)
    if (ing && OIL_IDS.has(p.ing)) fat += (ing.per100.fat * p.g) / 100
  }
  return fat
}

function isHomeDish(dish: Dish): boolean {
  return (dish.cuisine === 'cn' || dish.cuisine === 'west') && dish.cat !== 'combo'
}

/** 家常菜（非外卖、非整餐套餐）才谈少盐做法 */
export function canLowSalt(dish: Dish): boolean {
  return isHomeDish(dish) && condimentSodium(dish) >= 100
}

/** 家常菜且烹调油 ≥ 5 g 才谈少油做法 */
export function canLowOil(dish: Dish): boolean {
  return isHomeDish(dish) && oilFat(dish) >= 5
}

export interface CookMods {
  lowSalt?: boolean
  lowOil?: boolean
}

/** 一份的营养，可按少盐（调味钠减半）/ 少油（烹调油减半）做法计 */
export function dishNutrientsFor(dish: Dish, mods?: CookMods): Nutrients {
  let n = dishNutrients(dish)
  if (mods?.lowSalt && canLowSalt(dish)) n = { ...n, sodium: n.sodium - condimentSodium(dish) * 0.5 }
  if (mods?.lowOil && canLowOil(dish)) {
    const cut = oilFat(dish) * 0.5
    n = { ...n, fat: n.fat - cut, kcal: n.kcal - cut * 9 }
  }
  return n
}

export function dishWeight(dish: Dish): number {
  return dish.parts.reduce((s, p) => s + p.g, 0)
}

/** 从份量描述里读成品重量：「可食(部)约 N g」>「约 N g/ml」> 描述里唯一的重量数字；读不出返回 undefined */
export function servingGramsFromText(serving?: string): number | undefined {
  const t = serving || ''
  const m1 = t.match(/可食部?约?\s*(\d+)\s*g/)
  if (m1) return +m1[1]
  const m2 = t.match(/约\s*(\d+)\s*(?:g|ml)/)
  if (m2) return +m2[1]
  const all = [...t.matchAll(/(\d+)\s*(?:g|ml)/g)]
  if (all.length === 1) return +all[0][1]
  return undefined
}

/**
 * 一份成品的重量（g）。优先用份量描述里写的成品重量（粽子、汤圆这类用生米干粉拼的菜，食材合计远小于成品），
 * 描述里没有时退回食材合计。界面上的「约 N g」与「按克」都用它，保证看到的克数和输进去的克数是同一套。
 */
export function servingGrams(dish: Dish): number {
  return servingGramsFromText(dish.serving) ?? dishWeight(dish)
}

export function dishAllergens(dish: Dish, ingMap: Map<string, Ingredient> = INGREDIENT_MAP): Allergen[] {
  const set = new Set<Allergen>()
  for (const p of dish.parts) {
    const ing = ingMap.get(p.ing)
    ing?.allergens?.forEach((a) => set.add(a))
  }
  return [...set]
}

const ANIMAL = new Set(['meat', 'poultry', 'seafood'])

export function isVegetarian(dish: Dish, ingMap: Map<string, Ingredient> = INGREDIENT_MAP): boolean {
  return dish.parts.every((p) => {
    const ing = ingMap.get(p.ing)
    return !ing || !ANIMAL.has(ing.cat)
  })
}

const ANIMAL_ALL = new Set(['meat', 'poultry', 'seafood', 'egg', 'dairy'])

/** 纯素：不含肉禽水产、蛋、奶（植脂末与蛋白粉按其分类归属处理） */
export function isVegan(dish: Dish, ingMap: Map<string, Ingredient> = INGREDIENT_MAP): boolean {
  return dish.parts.every((p) => {
    const ing = ingMap.get(p.ing)
    if (!ing) return true
    if (ing.id === 'creamer') return true
    return !ANIMAL_ALL.has(ing.cat) && ing.id !== 'honey'
  })
}

/** 蔬菜与菌菇克重（用于蔬菜份数统计；腌菜、葱姜蒜等调味用量不计） */
const NOT_COUNTED_VEG = new Set(['garlic', 'ginger', 'scallion', 'pickled_mustard', 'sauerkraut', 'preserved_veg', 'kimchi', 'coriander', 'chili_fresh', 'nori', 'sour_bamboo'])

export function vegGrams(dish: Dish, ingMap: Map<string, Ingredient> = INGREDIENT_MAP): number {
  let g = 0
  for (const p of dish.parts) {
    const ing = ingMap.get(p.ing)
    if (!ing) continue
    if ((ing.cat === 'vegetable' || ing.cat === 'mushroom') && !NOT_COUNTED_VEG.has(ing.id)) g += p.g
  }
  return g
}

export function fruitGrams(dish: Dish, ingMap: Map<string, Ingredient> = INGREDIENT_MAP): number {
  let g = 0
  for (const p of dish.parts) {
    const ing = ingMap.get(p.ing)
    if (ing && ing.cat === 'fruit' && ing.id !== 'red_dates' && ing.id !== 'raisins') g += p.g
  }
  return g
}

/** 是否含加工食品或油炸 */
export function isProcessedOrFried(dish: Dish, ingMap: Map<string, Ingredient> = INGREDIENT_MAP): boolean {
  if (dish.cook === 'fried') return true
  return dish.parts.some((p) => {
    const ing = ingMap.get(p.ing)
    return ing && ing.cat === 'processed' && p.g >= 30
  })
}

/** 一条记录的营养值（含份量倍数） */
export function entryNutrients(entry: LogEntry, dishMap: Map<string, Dish>): Nutrients {
  if (entry.custom) return scale(entry.custom.nutrients, entry.portion)
  const dish = entry.dishId ? dishMap.get(entry.dishId) : undefined
  if (!dish) return { ...ZERO }
  return scale(dishNutrientsFor(dish, entry), entry.portion)
}

export function entryName(entry: LogEntry, dishMap: Map<string, Dish>): string {
  if (entry.custom) return entry.custom.name
  return (entry.dishId && dishMap.get(entry.dishId)?.name) || '未知菜品'
}

export function macroKcalShare(n: Nutrients): { protein: number; fat: number; carbs: number } {
  const total = n.protein * 4 + n.fat * 9 + n.carbs * 4
  if (total <= 0) return { protein: 0, fat: 0, carbs: 0 }
  return { protein: (n.protein * 4) / total, fat: (n.fat * 9) / total, carbs: (n.carbs * 4) / total }
}
