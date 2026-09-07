// 数据校验：npm run validate
//   npm run validate -- --list                        列出全部菜品营养值
//   npm run validate -- --file src/data/dishes/x.ts   只校验某个分组文件（导出的所有 Dish[]）
import path from 'node:path'
import type { Dish } from '../src/core/types'
import { INGREDIENTS, INGREDIENT_MAP } from '../src/data/ingredients'
import { dishNutrients, dishWeight, isVegetarian, vegGrams } from '../src/core/nutrition'

async function loadDishes(): Promise<Dish[]> {
  const fi = process.argv.indexOf('--file')
  if (fi >= 0) {
    const mod = await import(path.resolve(process.argv[fi + 1]))
    const out: Dish[] = []
    for (const v of Object.values(mod)) if (Array.isArray(v)) out.push(...(v as Dish[]))
    return out
  }
  const mod = await import('../src/data/dishes/index')
  return mod.DISHES
}
const DISHES = await loadDishes()

let errors = 0
let warns = 0
const err = (m: string) => { errors++; console.log('ERROR ' + m) }
const warn = (m: string) => { warns++; console.log('warn  ' + m) }

// 食材
const ingIds = new Set<string>()
for (const i of INGREDIENTS) {
  if (ingIds.has(i.id)) err(`重复食材 id: ${i.id}`)
  ingIds.add(i.id)
  const n = i.per100
  const macroKcal = n.protein * 4 + n.fat * 9 + n.carbs * 4
  if (i.cat !== 'beverage' && n.kcal > 30 && Math.abs(macroKcal - n.kcal) / n.kcal > 0.25) {
    warn(`食材 ${i.id} 热量与宏量不一致: kcal=${n.kcal} 宏量折算=${macroKcal.toFixed(0)}`)
  }
}

// 菜品
const dishIds = new Set<string>()
const byCat: Record<string, number> = {}
const byCuisine: Record<string, number> = {}
for (const d of DISHES) {
  if (dishIds.has(d.id)) err(`重复菜品 id: ${d.id}`)
  dishIds.add(d.id)
  if (!/^[a-z0-9_]+$/.test(d.id)) err(`菜品 id 不合规: ${d.id}`)
  if (!d.parts.length) err(`菜品 ${d.id} 无食材`)
  if (!d.slots.length) err(`菜品 ${d.id} 无餐次`)
  if (!d.serving) err(`菜品 ${d.id} 无份量描述`)
  for (const p of d.parts) {
    if (!INGREDIENT_MAP.has(p.ing)) err(`菜品 ${d.id} 引用未知食材 ${p.ing}`)
    if (!(p.g > 0)) err(`菜品 ${d.id} 食材 ${p.ing} 克重非正数`)
  }
  byCat[d.cat] = (byCat[d.cat] || 0) + 1
  byCuisine[d.cuisine] = (byCuisine[d.cuisine] || 0) + 1
  if (d.parts.every((p) => INGREDIENT_MAP.has(p.ing))) {
    const n = dishNutrients(d)
    const w = dishWeight(d)
    if ((n.kcal < 10 && d.cat !== 'drink') || n.kcal > 1600) err(`菜品 ${d.id} 单份热量异常 ${n.kcal.toFixed(0)} kcal`)
    if (w < 20 || w > 1200) warn(`菜品 ${d.id} 单份重量异常 ${w} g`)
    if (n.sodium > 3000) warn(`菜品 ${d.id} 单份钠过高 ${n.sodium.toFixed(0)} mg`)
    // 家常菜按一人份调味：盐当量 ≤ 2 g（钠 800 mg）。外卖/便利店按实际口味不设限
    if ((d.cuisine === 'cn' || d.cuisine === 'west') && d.cat !== 'combo' && n.sodium > 900) warn(`家常菜 ${d.id} 单份钠 ${n.sodium.toFixed(0)} mg 超过一人份调味上限（约 2 g 盐），请核对用盐量`)
    if (d.cat === 'protein' && n.protein < 10) warn(`荤/蛋白菜 ${d.id} 蛋白仅 ${n.protein.toFixed(1)} g`)
    if (d.cat === 'veg' && vegGrams(d) < 80) warn(`素菜 ${d.id} 蔬菜仅 ${vegGrams(d)} g`)
    if (d.cat === 'veg' && n.fat > 20) warn(`素菜 ${d.id} 脂肪 ${n.fat.toFixed(1)} g 偏高`)
    if (d.cat === 'staple' && n.kcal > 700) warn(`主食 ${d.id} 热量 ${n.kcal.toFixed(0)} 偏高`)
    if (d.cat === 'combo' && n.kcal < 250) warn(`套餐/一餐 ${d.id} 热量仅 ${n.kcal.toFixed(0)}`)
    if (d.cook === 'light' && n.fat > 15 && d.cat !== 'protein' && d.cat !== 'combo') warn(`清淡菜 ${d.id} 脂肪 ${n.fat.toFixed(1)} g`)
  }
}

console.log(`\n食材 ${INGREDIENTS.length} 条，菜品 ${DISHES.length} 道`)
console.log('按类别:', byCat)
console.log('按菜系:', byCuisine)
console.log('素菜品:', DISHES.filter((d) => isVegetarian(d)).length)

if (process.argv.includes('--list')) {
  console.log('\nid | 名称 | 类别 | kcal | P | F | C | 钠')
  for (const d of DISHES) {
    if (!d.parts.every((p) => INGREDIENT_MAP.has(p.ing))) continue
    const n = dishNutrients(d)
    console.log(`${d.id} | ${d.name} | ${d.cat} | ${n.kcal.toFixed(0)} | ${n.protein.toFixed(0)} | ${n.fat.toFixed(0)} | ${n.carbs.toFixed(0)} | ${n.sodium.toFixed(0)}`)
  }
}

console.log(`\n${errors} errors, ${warns} warnings`)
if (errors) process.exit(1)
