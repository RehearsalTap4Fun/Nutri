import type { Dish, LogEntry, MealSlot, Nutrients, Profile, Targets } from './types'
import { MEAL_SLOTS, ZERO } from './types'
import { canLowOil, canLowSalt, dishAllergens, dishNutrients, dishNutrientsFor, isProcessedOrFried, isVegan, isVegetarian, macroKcalShare, scale, sum, vegGrams } from './nutrition'
import { INGREDIENT_MAP } from '../data/ingredients'
import { hashString, makeRng, weightedPick } from './rng'
import type { Adjustments } from './analysis'
import { conditionExcludes, conditionPlanNotes, conditionWeight } from './conditions'

export type Role = 'staple' | 'protein' | 'veg' | 'soup' | 'main' | 'bfprotein' | 'fruit' | 'snack' | 'combo'

export interface PlanItem {
  dishId: string
  portion: number
  role: Role
  reason?: string
  /** 按少盐做法计钠（高血压模式下家常菜默认开） */
  lowSalt?: boolean
  /** 按少油做法计脂肪（全天脂肪超预算时家常菜自动开） */
  lowOil?: boolean
}

export interface MealPlan {
  slot: MealSlot
  targetKcal: number
  targetProtein: number
  items: PlanItem[]
  totals: Nutrients
  notes: string[]
}

export interface DayPlan {
  date: string
  meals: MealPlan[]
  totals: Nutrients
  notes: string[]
  /** 已经吃过、不再规划的餐次 */
  eatenSlots: MealSlot[]
}

export interface PlanInput {
  profile: Profile
  targets: Targets
  dishes: Dish[]
  dishMap: Map<string, Dish>
  date: string
  /** 全天换一换计数 */
  seed: number
  /** 单餐换一换计数 */
  mealSeeds?: Partial<Record<MealSlot, number>>
  /** 最近 7 天（含今天）记录，用于避重与贴近实际吃法 */
  recentEntries: LogEntry[]
  adjustments: Adjustments
  /** 今天已吃的各餐营养（有则该餐视为已完成，其余餐按剩余预算规划） */
  eatenToday?: Partial<Record<MealSlot, Nutrients>>
}

const WHOLE_GRAIN = new Set(['brown_rice_cooked', 'oats', 'bread_whole', 'corn', 'sweet_potato', 'quinoa_cooked', 'potato', 'yam', 'taro', 'millet_porridge', 'red_beans_dry', 'mung_beans_dry', 'chickpeas_cooked', 'lentils_cooked'])
const RED_MEAT = new Set(['pork_lean', 'pork_belly', 'pork_ribs', 'pork_ground', 'beef_lean', 'beef_brisket', 'beef_shank', 'beef_ground', 'beef_steak', 'lamb', 'chinese_sausage', 'bacon', 'luncheon_meat', 'hot_dog'])
const PROTEIN_CATS = new Set(['meat', 'poultry', 'seafood', 'egg', 'soy', 'dairy', 'legume'])

function round4(x: number): number {
  return Math.round(x * 4) / 4
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

/** 主蛋白食材（克重最大的动物性/豆制品食材），用于避免一天两餐同一种肉 */
export function mainProteinIng(dish: Dish): string | null {
  let best: string | null = null
  let bestG = 0
  for (const p of dish.parts) {
    const ing = INGREDIENT_MAP.get(p.ing)
    if (ing && PROTEIN_CATS.has(ing.cat) && p.g > bestG) {
      best = p.ing
      bestG = p.g
    }
  }
  return best
}

function hasIng(dish: Dish, set: Set<string>): boolean {
  return dish.parts.some((p) => set.has(p.ing))
}

function hasTag(dish: Dish, tag: string): boolean {
  return !!dish.tags && dish.tags.includes(tag)
}

interface Ctx extends PlanInput {
  recentDishDays: Map<string, number> // dishId -> 最近一次吃的距今天数
  usedToday: Set<string>
  usedProteins: Set<string>
}

function baseEligible(d: Dish, slot: MealSlot, ctx: Ctx): boolean {
  if (!d.slots.includes(slot)) return false
  if (ctx.profile.dislikedDishes.includes(d.id)) return false
  if (ctx.profile.dislikedIngredients.length && d.parts.some((p) => ctx.profile.dislikedIngredients.includes(p.ing))) return false
  if (ctx.profile.allergens.length) {
    const al = dishAllergens(d)
    if (al.some((a) => ctx.profile.allergens.includes(a))) return false
  }
  if (ctx.profile.dietStyle === 'vegetarian' && !isVegetarian(d)) return false
  if (ctx.profile.dietStyle === 'vegan' && !isVegan(d)) return false
  if (hasTag(d, 'alcohol')) return false
  if (ctx.usedToday.has(d.id)) return false
  if (conditionExcludes(d, ctx.profile)) return false
  return true
}

function roleFilter(d: Dish, role: Role, slot: MealSlot, mealKcal: number): boolean {
  const n = dishNutrients(d)
  const share = macroKcalShare(n)
  switch (role) {
    case 'staple':
      return d.cat === 'staple'
    case 'protein':
      return d.cat === 'protein' && n.protein >= 10 && n.kcal <= mealKcal * 0.95
    case 'veg':
      return d.cat === 'veg' && vegGrams(d) >= 80 && n.kcal <= Math.max(150, mealKcal * 0.35)
    case 'soup':
      return d.cat === 'soup'
    case 'main':
      return (d.cat === 'breakfast' || d.cat === 'staple') && n.kcal >= 120 && n.kcal <= mealKcal * 1.3
    case 'bfprotein':
      return (d.cat === 'breakfast' || d.cat === 'drink' || d.cat === 'snack' || d.cat === 'protein') && n.protein >= 6 && share.protein >= 0.22 && n.kcal <= 260
    case 'fruit':
      return d.cat === 'fruit'
    case 'snack':
      return (d.cat === 'snack' || d.cat === 'fruit' || d.cat === 'drink') && n.kcal >= 40 && n.kcal <= 350 && !isProcessedOrFried(d) && !hasTag(d, 'sweet')
    case 'combo':
      return d.cat === 'combo' && n.kcal <= mealKcal * 1.45 && n.sodium <= 2600 && d.cook !== 'fried'
  }
}

interface Weighted {
  w: number
  reason?: string
}

function weigh(d: Dish, role: Role, slot: MealSlot, ctx: Ctx): Weighted {
  const n = dishNutrients(d)
  const share = macroKcalShare(n)
  const adj = ctx.adjustments
  const p = ctx.profile
  let w = 1
  let reason: string | undefined

  // 菜系：推荐以家常为主；外卖午餐模式下 combo 另算
  if (role === 'combo') {
    w *= d.cuisine === 'takeout' ? 1 : d.cuisine === 'convenience' ? 0.9 : d.cuisine === 'west' ? 0.8 : 0.6
  } else {
    w *= d.cuisine === 'cn' ? 1 : d.cuisine === 'west' ? 0.55 : d.cuisine === 'convenience' ? 0.25 : 0.12
  }

  // 主食优先清淡本味（炒饭、葱油饼一类降权）
  if (role === 'staple' && share.fat > 0.3) w *= 0.35

  // 钠：营养师默认少推高盐菜，按钠量连续衰减（600 mg ≈ ×0.65，900 ≈ ×0.42，1200 ≈ ×0.28）；外卖整餐本身钠高，阈值放宽
  if (role === 'combo') { if (n.sodium > 2000) w *= 0.5 }
  else w *= Math.exp(-Math.max(0, n.sodium - 300) / 700)

  // 脂肪：菜的脂肪供能比明显高于目标供能比时降权（减脂目标脂肪 28%，家常菜常在 40% 以上）
  const fatTargetShare = (ctx.targets.fat * 9) / Math.max(1, ctx.targets.kcal)
  if (d.cat !== 'fruit' && d.cat !== 'drink' && share.fat > fatTargetShare + 0.2) w *= 0.45
  if ((role === 'protein' || role === 'combo') && n.fat > 25) w *= 0.5

  // 做法
  const cookW: Record<Dish['cook'], number> = { light: 1.15, normal: 1, heavy: 0.6, fried: 0.3 }
  w *= cookW[d.cook]
  if (p.goal === 'lose') w *= d.cook === 'light' ? 1.15 : d.cook === 'fried' ? 0.6 : 1

  // 避重
  const daysAgo = ctx.recentDishDays.get(d.id)
  if (daysAgo !== undefined) w *= daysAgo <= 2 ? 0.15 : 0.5
  const mp = mainProteinIng(d)
  if (mp && ctx.usedProteins.has(mp) && (role === 'protein' || role === 'combo')) w *= 0.3

  // 饮食风格偏好
  if (p.dietStyle === 'mediterranean') {
    if (d.parts.some((x) => INGREDIENT_MAP.get(x.ing)?.cat === 'seafood')) w *= 1.7
    if (d.parts.some((x) => ['legume', 'soy'].includes(INGREDIENT_MAP.get(x.ing)?.cat || ''))) w *= 1.3
    if (hasIng(d, RED_MEAT)) w *= 0.45
    if (d.cuisine === 'west') w *= 1.8
    if (role === 'staple' && hasIng(d, WHOLE_GRAIN)) w *= 1.8
  }
  if (p.dietStyle === 'high_protein' && (role === 'protein' || role === 'combo') && n.protein >= 25) w *= 1.5
  if (p.dietStyle === 'low_carb' && role === 'staple') w *= hasIng(d, WHOLE_GRAIN) ? 1.5 : 1

  // 近期调整信号
  if (adj.proteinLow && (role === 'protein' || role === 'bfprotein' || role === 'snack' || role === 'combo')) {
    if (share.protein >= 0.35) { w *= 1.9; reason = '近期蛋白偏低，选了高蛋白' }
    else if (share.protein >= 0.25) w *= 1.25
  }
  if (adj.sodiumHigh) {
    if (d.cook === 'light') { w *= 1.6; reason = reason || '近期盐偏多，选清淡做法' }
    if (d.cook === 'heavy') w *= 0.5
    if (n.sodium > 900) w *= 0.5
  }
  if (adj.fatHigh) {
    if (share.fat > 0.5) w *= 0.4
    if (d.cook === 'light') { w *= 1.3; reason = reason || '近期油偏多，选少油做法' }
  }
  if ((adj.fiberLow || adj.vegLow) && role === 'veg' && n.fiber >= 3) { w *= 1.4; reason = reason || '近期蔬菜纤维不足，多配一份菜' }
  if (adj.fiberLow && role === 'staple' && hasIng(d, WHOLE_GRAIN)) { w *= 1.8; reason = reason || '近期纤维不足，主食换粗粮' }
  if (adj.processedHigh && (d.cook === 'fried' || isProcessedOrFried(d))) w *= 0.25
  if (adj.kcalOver) {
    if (d.cook === 'light') w *= 1.2
    if (d.cook === 'heavy') w *= 0.7
  }
  if (adj.fruitLow && (role === 'fruit' || (role === 'snack' && d.cat === 'fruit'))) { w *= 2; reason = reason || '近期水果偏少' }

  // 特殊人群模式
  const cw = conditionWeight(d, role, p)
  w *= cw.w
  reason = reason || cw.reason

  return { w, reason }
}

function pick(role: Role, slot: MealSlot, mealKcal: number, ctx: Ctx, rnd: () => number, extra?: (d: Dish, n: Nutrients) => boolean): { dish: Dish; reason?: string } | null {
  const cands = ctx.dishes.filter((d) => baseEligible(d, slot, ctx) && roleFilter(d, role, slot, mealKcal) && (!extra || extra(d, dishNutrients(d))))
  if (!cands.length) return null
  const ws = cands.map((d) => weigh(d, role, slot, ctx))
  const idx = weightedPick(ws.map((x) => x.w), rnd)
  if (idx < 0) return null
  const dish = cands[idx]
  ctx.usedToday.add(dish.id)
  const mp = mainProteinIng(dish)
  if (mp && (role === 'protein' || role === 'combo' || role === 'main')) ctx.usedProteins.add(mp)
  return { dish, reason: ws[idx].reason }
}

function totalsOf(items: PlanItem[], dishMap: Map<string, Dish>): Nutrients {
  return sum(items.map((it) => {
    const d = dishMap.get(it.dishId)
    return d ? scale(dishNutrientsFor(d, it), it.portion) : { ...ZERO }
  }))
}

/** 高血压模式：推荐里的家常菜按少盐做法计 */
function applyLowSalt(items: PlanItem[], ctx: Ctx): void {
  if (!(ctx.profile.conditions || []).includes('hypertension')) return
  for (const it of items) {
    const d = ctx.dishMap.get(it.dishId)
    if (d && canLowSalt(d)) it.lowSalt = true
  }
}

function planMainMeal(slot: MealSlot, T: number, P: number, ctx: Ctx, rnd: () => number): MealPlan {
  const notes: string[] = []
  const items: PlanItem[] = []
  const style = ctx.profile.dietStyle
  const lowCarb = style === 'low_carb'

  // 外卖午餐模式：从外卖里挑相对清淡的一份
  if (slot === 'lunch' && ctx.adjustments.takeoutLunch) {
    const c = pick('combo', slot, T, ctx, rnd)
    if (c) {
      const n = dishNutrients(c.dish)
      const portion = clamp(round4(T / n.kcal), 0.75, 1.25)
      items.push({ dishId: c.dish.id, portion, role: 'combo', reason: c.reason || '你近一周午餐多为外卖，按外卖里相对清淡的选' })
      if (ctx.adjustments.vegLow || vegGrams(c.dish) < 100) {
        const v = pick('veg', slot, T, ctx, rnd)
        if (v) items.push({ dishId: v.dish.id, portion: 1, role: 'veg', reason: '外卖普遍缺蔬菜，加一份' })
      }
      applyLowSalt(items, ctx)
      const totals = totalsOf(items, ctx.dishMap)
      if (totals.sodium > 1500) notes.push('外卖钠偏高，点单时备注少盐少酱，汤别喝完')
      return { slot, targetKcal: T, targetProtein: P, items, totals, notes }
    }
  }

  const prot = pick('protein', slot, T, ctx, rnd)
  const veg = pick('veg', slot, T, ctx, rnd)
  const veg2 = lowCarb || ctx.adjustments.vegLow ? pick('veg', slot, T, ctx, rnd) : null
  const staple = pick('staple', slot, T, ctx, rnd)
  const soup = slot === 'dinner' && !lowCarb && rnd() < 0.4 ? pick('soup', slot, T, ctx, rnd) : null

  let protPortion = 1
  if (prot) {
    const n = dishNutrients(prot.dish)
    protPortion = clamp(round4(P / Math.max(1, n.protein)), 0.75, 1.5)
    // 蛋白菜不超过这餐热量的 65%
    protPortion = clamp(Math.min(protPortion, round4((T * 0.65) / n.kcal)), 0.75, 1.5)
    items.push({ dishId: prot.dish.id, portion: protPortion, role: 'protein', reason: prot.reason })
  }
  if (veg) items.push({ dishId: veg.dish.id, portion: ctx.adjustments.vegLow && !veg2 ? 1.5 : 1, role: 'veg', reason: veg.reason })
  if (veg2) items.push({ dishId: veg2.dish.id, portion: 1, role: 'veg', reason: veg2.reason })
  if (soup) items.push({ dishId: soup.dish.id, portion: 1, role: 'soup' })

  if (staple) {
    const used = totalsOf(items, ctx.dishMap).kcal
    const n = dishNutrients(staple.dish)
    const lo = lowCarb ? 0.25 : 0.5
    const hi = lowCarb ? 0.6 : 2
    const portion = clamp(round4((T - used) / n.kcal), lo, hi)
    items.push({ dishId: staple.dish.id, portion, role: 'staple', reason: staple.reason })
  }

  applyLowSalt(items, ctx)
  // 收敛到目标区间
  let totals = totalsOf(items, ctx.dishMap)
  const protItem = items.find((i) => i.role === 'protein')
  const stapleItem = items.find((i) => i.role === 'staple')
  const stapleLo = lowCarb ? 0.25 : 0.5
  const stapleHi = lowCarb ? 0.6 : 2
  let guard = 0
  while (totals.kcal < T * 0.85 && guard++ < 10) {
    if (protItem && protItem.portion < 1.5) protItem.portion = round4(protItem.portion + 0.25)
    else if (stapleItem && stapleItem.portion < stapleHi) stapleItem.portion = round4(stapleItem.portion + 0.25)
    else break
    totals = totalsOf(items, ctx.dishMap)
  }
  guard = 0
  while (totals.kcal > T * 1.15 && guard++ < 12) {
    const soupIdx = items.findIndex((i) => i.role === 'soup')
    const vegItems = items.filter((i) => i.role === 'veg')
    if (stapleItem && stapleItem.portion > stapleLo) stapleItem.portion = round4(stapleItem.portion - 0.25)
    else if (soupIdx >= 0) items.splice(soupIdx, 1)
    else if (vegItems.length > 1) items.splice(items.indexOf(vegItems[vegItems.length - 1]), 1)
    else if (protItem && protItem.portion > 0.75) protItem.portion = round4(protItem.portion - 0.25)
    else if (vegItems.length && vegItems[0].portion > 1) vegItems[0].portion = 1
    else if (stapleItem && stapleItem.portion > 0.25) stapleItem.portion = round4(stapleItem.portion - 0.25)
    else break
    totals = totalsOf(items, ctx.dishMap)
  }
  // 糖尿病模式：单餐碳水上限
  if (ctx.targets.evenCarbs) {
    const cap = ctx.targets.carbs * ctx.targets.slotShare[slot] * 1.15
    guard = 0
    while (totals.carbs > cap && guard++ < 8) {
      if (stapleItem && stapleItem.portion > 0.5) stapleItem.portion = round4(stapleItem.portion - 0.25)
      else break
      totals = totalsOf(items, ctx.dishMap)
    }
    if (totals.carbs > cap * 1.1) notes.push(`这餐碳水 ${Math.round(totals.carbs)} g 略高于 ${Math.round(cap)} g 上限，可换一换或减主食`)
  }
  if (totals.kcal > T * 1.2) notes.push('这餐已尽量精简，仍略超预算，可把主食再减一点')
  if (totals.protein < P * 0.7) notes.push('这餐蛋白略少，可加一个蛋或一杯奶')
  return { slot, targetKcal: T, targetProtein: P, items, totals, notes }
}

function planBreakfast(T: number, P: number, ctx: Ctx, rnd: () => number): MealPlan {
  const items: PlanItem[] = []
  const notes: string[] = []
  const main = pick('main', 'breakfast', T, ctx, rnd)
  if (main) {
    const n = dishNutrients(main.dish)
    const needProtein = ctx.adjustments.proteinLow || ctx.adjustments.breakfastProteinLow || n.protein < P * 0.5 || (ctx.profile.conditions || []).includes('elderly')
    let extra: { dish: Dish; reason?: string } | null = null
    if (needProtein) extra = pick('bfprotein', 'breakfast', T, ctx, rnd)
    let fruit: { dish: Dish; reason?: string } | null = null
    if (n.kcal < T * 0.8 && (ctx.adjustments.fruitLow || rnd() < 0.45)) fruit = pick('fruit', 'breakfast', T, ctx, rnd)

    let others = 0
    if (extra) others += dishNutrients(extra.dish).kcal
    if (fruit) others += dishNutrients(fruit.dish).kcal
    const portion = clamp(round4((T - others) / n.kcal), 0.75, 1.5)
    items.push({ dishId: main.dish.id, portion, role: 'main', reason: main.reason })
    if (extra) {
      const en = dishNutrients(extra.dish)
      const ep = ctx.adjustments.proteinLow && en.kcal * 2 + n.kcal * portion + (fruit ? dishNutrients(fruit.dish).kcal : 0) <= T * 1.15 ? 2 : 1
      items.push({ dishId: extra.dish.id, portion: ep, role: 'bfprotein', reason: extra.reason || (ctx.adjustments.breakfastProteinLow ? '早餐蛋白摊平一点' : undefined) })
    }
    if (fruit) items.push({ dishId: fruit.dish.id, portion: 1, role: 'fruit', reason: fruit.reason })
  }
  applyLowSalt(items, ctx)
  let totals = totalsOf(items, ctx.dishMap)
  let guard = 0
  // 不够就补：先加主食份量，再补水果，再补蛋白
  while (totals.kcal < T * 0.85 && items.length && guard++ < 6) {
    const mainItem = items.find((i) => i.role === 'main')
    const extra = items.find((i) => i.role === 'bfprotein')
    if (mainItem && mainItem.portion < 1.5) mainItem.portion = round4(mainItem.portion + 0.25)
    else if (!items.some((i) => i.role === 'fruit')) {
      const f = pick('fruit', 'breakfast', T, ctx, rnd)
      if (f) items.push({ dishId: f.dish.id, portion: 1, role: 'fruit', reason: f.reason })
      else break
    } else if (!extra) {
      const e = pick('bfprotein', 'breakfast', T, ctx, rnd)
      if (e) items.push({ dishId: e.dish.id, portion: 1, role: 'bfprotein', reason: e.reason })
      else break
    } else if (extra.portion < 2) extra.portion = 2
    else break
    totals = totalsOf(items, ctx.dishMap)
  }
  guard = 0
  while (totals.kcal > T * 1.2 && guard++ < 6) {
    const fruitIdx = items.findIndex((i) => i.role === 'fruit')
    const extra = items.find((i) => i.role === 'bfprotein')
    const mainItem = items.find((i) => i.role === 'main')
    if (fruitIdx >= 0) items.splice(fruitIdx, 1)
    else if (extra && extra.portion > 1) extra.portion = 1
    else if (mainItem && mainItem.portion > 0.75) mainItem.portion = round4(mainItem.portion - 0.25)
    else break
    totals = totalsOf(items, ctx.dishMap)
  }
  // 老年人模式：早餐蛋白至少 15 g（蛋白分到三餐），不够就把蛋白配菜加到两份
  if ((ctx.profile.conditions || []).includes('elderly') && totals.protein < 15) {
    const extra = items.find((i) => i.role === 'bfprotein')
    if (extra && extra.portion < 2) { extra.portion = 2; totals = totalsOf(items, ctx.dishMap) }
  }
  if (totals.protein < P * 0.6) notes.push('早餐蛋白偏少，可再加一个蛋')
  return { slot: 'breakfast', targetKcal: T, targetProtein: P, items, totals, notes }
}

function planSnack(T: number, P: number, ctx: Ctx, rnd: () => number): MealPlan {
  const items: PlanItem[] = []
  const s = pick('snack', 'snack', T, ctx, rnd)
  if (s) {
    const n = dishNutrients(s.dish)
    const portion = clamp(round4(T / n.kcal), 1, 2)
    items.push({ dishId: s.dish.id, portion, role: 'snack', reason: s.reason })
  }
  applyLowSalt(items, ctx)
  return { slot: 'snack', targetKcal: T, targetProtein: P, items, totals: totalsOf(items, ctx.dishMap), notes: [] }
}

function recentDishDays(entries: LogEntry[], date: string): Map<string, number> {
  const m = new Map<string, number>()
  for (const e of entries) {
    if (!e.dishId || e.date > date) continue
    const [y1, m1, d1] = date.split('-').map(Number)
    const [y2, m2, d2] = e.date.split('-').map(Number)
    const days = Math.round((new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime()) / 86400000)
    const prev = m.get(e.dishId)
    if (prev === undefined || days < prev) m.set(e.dishId, days)
  }
  return m
}

/**
 * 全天收敛：单餐只按热量与蛋白收敛，叠起来脂肪和钠会跑偏。
 * 顺序：先把蛋白与热量调到位 → 两轮「钠 → 脂肪」换菜（换菜时不让另一项明显变差）→ 只用主食微调热量 → 糖尿病碳水上限复核。
 * 钠仍超先按少盐做法计，脂肪仍超先按少油做法计，再不行才压份量；最后把没压进去的差距如实写进说明。
 * eaten 为今天已吃的量，目标按剩余预算计。
 */
function balanceDay(meals: MealPlan[], ctx: Ctx, eaten: Nutrients, rnd: () => number): string[] {
  const notes: string[] = []
  const t = ctx.targets
  const total = () => sum(meals.map((m) => (m.totals = totalsOf(m.items, ctx.dishMap))))
  const budget = { kcal: Math.max(0, t.kcal - eaten.kcal), fat: Math.max(0, t.fat - eaten.fat), protein: Math.max(0, t.protein - eaten.protein), sodium: Math.max(0, t.sodiumMax - eaten.sodium) }
  const swappable: Role[] = ['protein', 'veg', 'soup', 'main', 'bfprotein', 'snack', 'staple']
  const allItems = () => meals.flatMap((m) => m.items)
  const nOf = (it: PlanItem) => scale(dishNutrientsFor(ctx.dishMap.get(it.dishId)!, it), it.portion)

  const swapWorst = (score: (it: PlanItem) => number, accept: (cand: Nutrients, cur: Nutrients, role: Role) => boolean, reason: string): boolean => {
    let bestM: MealPlan | null = null
    let bestIdx = -1
    let bestV = -Infinity
    for (const m of meals) {
      for (let idx = 0; idx < m.items.length; idx++) {
        const it = m.items[idx]
        if (!swappable.includes(it.role) || !ctx.dishMap.has(it.dishId)) continue
        const v = score(it)
        if (v > bestV) { bestV = v; bestM = m; bestIdx = idx }
      }
    }
    if (!bestM || bestIdx < 0) return false
    const m: MealPlan = bestM
    const cur = m.items[bestIdx]
    const curN = nOf(cur)
    const mods = (d: Dish) => ({ lowSalt: cur.lowSalt && canLowSalt(d), lowOil: cur.lowOil && canLowOil(d) })
    // 热量差异交给后面的主食步骤去补，这里放宽到 ±200 千卡或七成
    const keepProtein = (cand: Nutrients) => (cur.role !== 'protein' && cur.role !== 'bfprotein') || cand.protein >= curN.protein * 0.8
    const rep = pick(cur.role, m.slot, m.targetKcal, ctx, rnd, (d, n) => { const cand = scale(dishNutrientsFor(d, mods(d)), cur.portion); return accept(cand, curN, cur.role) && keepProtein(cand) && Math.abs(n.kcal * cur.portion - curN.kcal) < Math.max(200, curN.kcal * 0.7) })
    if (!rep) return false
    m.items[bestIdx] = { dishId: rep.dish.id, portion: cur.portion, role: cur.role, reason, ...mods(rep.dish) }
    return true
  }
  const trimWorst = (score: (it: PlanItem) => number): boolean => {
    const pool = allItems().filter((it) => swappable.includes(it.role) && it.role !== 'staple' && it.portion > 0.75)
    // 先压非蛋白菜，蛋白菜留到最后
    const nonProtein = pool.filter((it) => it.role !== 'protein' && it.role !== 'bfprotein')
    const items = (nonProtein.length ? nonProtein : pool).sort((a, b) => score(b) - score(a))
    if (!items.length) return false
    items[0].portion = round4(items[0].portion - 0.25)
    return true
  }
  // cap：蛋白菜最多加到几份；常规 1.5，全天蛋白仍不够时第二轮放开到 2
  const bumpProtein = (max: number, cap = 1.5): void => {
    let g = 0
    while (x.protein < budget.protein * 0.9 && g++ < max) {
      const cand = allItems().filter((it) => (it.role === 'protein' || it.role === 'bfprotein') && it.portion < cap)
      if (!cand.length) break
      // 优先加最「瘦」的那份：每克蛋白带的脂肪与钠最少
      cand.sort((a, b) => { const na = nOf(a), nb = nOf(b); return (na.fat + na.sodium / 100) / Math.max(1, na.protein) - (nb.fat + nb.sodium / 100) / Math.max(1, nb.protein) })
      cand[0].portion = round4(cand[0].portion + 0.25)
      x = total()
    }
  }
  const adjustKcal = (staplesOnly: boolean, lo = 0.92): void => {
    let g = 0
    while (x.kcal > budget.kcal * 1.05 && g++ < 8) {
      const staples = allItems().filter((it) => it.role === 'staple' && it.portion > 0.5).sort((a, b) => b.portion - a.portion)
      const mains = staplesOnly ? [] : allItems().filter((it) => it.role === 'main' && it.portion > 0.75).sort((a, b) => b.portion - a.portion)
      const target = staples[0] || mains[0]
      if (!target) break
      target.portion = round4(target.portion - 0.25)
      x = total()
    }
    g = 0
    while (x.kcal < budget.kcal * lo && g++ < 8) {
      // 糖尿病模式下主食受单餐碳水上限约束，先加蛋白再加主食
      const withinCap = (m: MealPlan) => !t.evenCarbs || m.totals.carbs + 12 <= t.carbs * t.slotShare[m.slot] * 1.15
      const staples = meals.flatMap((m) => m.items.filter((it) => it.role === 'staple' && it.portion < 2.25 && withinCap(m))).sort((a, b) => a.portion - b.portion)
      const prots = staplesOnly ? [] : allItems().filter((it) => it.role === 'protein' && it.portion < 1.75)
      const target = t.evenCarbs && prots.length ? prots[0] : staples[0] || prots[0]
      if (!target) break
      target.portion = round4(target.portion + 0.25)
      x = total()
    }
  }

  let x = total()
  // A. 蛋白与热量先到位
  bumpProtein(6)
  adjustKcal(false)

  // B. 两轮：钠 → 脂肪。换菜时不让另一项明显变差
  let saltNoted = false
  let oilNoted = false
  for (let pass = 0; pass < 2; pass++) {
    if (x.sodium > budget.sodium) {
      let changed = false
      for (const it of allItems()) {
        const d = ctx.dishMap.get(it.dishId)
        if (d && canLowSalt(d) && !it.lowSalt) { it.lowSalt = true; changed = true }
      }
      if (changed && !saltNoted) { notes.push('家常菜按少盐做法计钠（调味盐减半，记为已吃时会带上少盐标记），否则一天很难压进钠上限'); saltNoted = true }
      x = total()
      let g = 0
      while (x.sodium > budget.sodium * 1.1 && g++ < 8) {
        if (!swapWorst((it) => nOf(it).sodium, (cand, cur) => cand.sodium < cur.sodium * 0.75 && cand.fat <= cur.fat * 1.25 + 2, '换成更淡的菜')) break
        x = total()
      }
    }
    let g = 0
    while (x.fat > budget.fat * 1.1 && g++ < 6) {
      if (!swapWorst((it) => nOf(it).fat, (cand, cur) => cand.fat < cur.fat * 0.75 && cand.sodium <= cur.sodium * 1.25 + 50, '换成少油的菜')) break
      x = total()
    }
    if (x.fat > budget.fat * 1.1) {
      let changed = false
      for (const it of allItems()) {
        const d = ctx.dishMap.get(it.dishId)
        if (d && canLowOil(d) && !it.lowOil) { it.lowOil = true; changed = true }
      }
      if (changed && !oilNoted) { notes.push('家常菜按少油做法计（炒菜油减半，记为已吃时会带上少油标记），否则脂肪压不进目标'); oilNoted = true }
      x = total()
    }
  }
  // 仍超就压份量：先钠再脂肪
  let g = 0
  while (x.sodium > budget.sodium * 1.1 && g++ < 4) { if (!trimWorst((it) => nOf(it).sodium)) break; x = total() }
  g = 0
  while (x.fat > budget.fat * 1.1 && g++ < 3) { if (!trimWorst((it) => nOf(it).fat)) break; x = total() }

  // C. 蛋白不能掉出 85%；脂肪还有余量时再往 90% 补；最后只用主食微调热量
  if (x.protein < budget.protein * 0.85) { const save = budget.protein; budget.protein = save * 0.85 / 0.9; bumpProtein(4); if (x.protein < budget.protein * 0.9) bumpProtein(4, 2); budget.protein = save }
  if (x.fat < budget.fat * 1.05) bumpProtein(2)
  adjustKcal(true, 0.95)

  // D. 糖尿病模式：全天调整后再校一遍单餐碳水上限（主食可压到 1/4 份，再不行换掉碳水最高的菜）
  if (t.evenCarbs) {
    for (const m of meals) {
      const cap = t.carbs * t.slotShare[m.slot] * 1.15
      let k = 0
      while (m.totals.carbs > cap && k++ < 8) {
        const st = m.items.find((it) => (it.role === 'staple' || it.role === 'main') && it.portion > 0.25)
        if (st) { st.portion = round4(st.portion - 0.25); m.totals = totalsOf(m.items, ctx.dishMap); continue }
        const others = m.items.filter((it) => it.role !== 'staple' && it.role !== 'main').sort((a, b) => nOf(b).carbs - nOf(a).carbs)
        if (!others.length) break
        const cur = others[0]
        const curN = nOf(cur)
        const rep = pick(cur.role, m.slot, m.targetKcal, ctx, rnd, (_d, n) => n.carbs * cur.portion < curN.carbs * 0.6)
        if (!rep) break
        m.items[m.items.indexOf(cur)] = { ...cur, dishId: rep.dish.id, reason: '换成碳水更低的菜' }
        m.totals = totalsOf(m.items, ctx.dishMap)
      }
    }
    x = total()
  }

  // E. 没压进去的差距如实说
  if (x.sodium > budget.sodium * 1.1) notes.push(`今天推荐约 ${Math.round(x.sodium)} mg 钠，仍高于上限 ${Math.round(budget.sodium)}：汤别喝完、凉拌菜和蘸料少放酱油，就能补上这段差距`)
  if (x.fat > budget.fat * 1.1) notes.push(`今天脂肪约 ${Math.round(x.fat)} g，仍高于目标 ${Math.round(budget.fat)} g，肉选更瘦的部位可以补上`)
  return notes
}

export function planDay(input: PlanInput): DayPlan {
  const { targets, date, seed } = input
  const ctx: Ctx = {
    ...input,
    recentDishDays: recentDishDays(input.recentEntries, date),
    usedToday: new Set<string>(),
    usedProteins: new Set<string>(),
  }
  const notes: string[] = []
  const eaten = input.eatenToday || {}
  const eatenSlots = MEAL_SLOTS.filter((s) => (eaten[s]?.kcal || 0) > 50)
  // 今天已经吃过的菜不再推荐，且同一主蛋白降权
  for (const e of input.recentEntries) {
    if (e.date === date && e.dishId) {
      ctx.usedToday.add(e.dishId)
      const d = input.dishMap.get(e.dishId)
      const mp = d && mainProteinIng(d)
      if (mp) ctx.usedProteins.add(mp)
    }
  }
  const toPlan = MEAL_SLOTS.filter((s) => targets.slotShare[s] > 0 && !eatenSlots.includes(s))
  const eatenKcal = eatenSlots.reduce((s, k) => s + (eaten[k]?.kcal || 0), 0)
  const eatenProtein = eatenSlots.reduce((s, k) => s + (eaten[k]?.protein || 0), 0)
  const shareSum = toPlan.reduce((s, k) => s + targets.slotShare[k], 0) || 1
  const remainingKcal = targets.kcal - eatenKcal
  const remainingProtein = targets.protein - eatenProtein
  if (eatenSlots.length && remainingKcal < targets.kcal * 0.25 && toPlan.length) {
    notes.push('今天已接近或超出预算，剩下的餐次按最低量给，以蛋白和蔬菜为主')
  }
  const plannedCap = toPlan.reduce((s, k) => s + targets.kcal * targets.slotShare[k] * 1.3, 0)
  if (eatenSlots.length && toPlan.length && remainingKcal > plannedCap + 150) {
    notes.push(`前面吃得少，今天还有约 ${Math.round(remainingKcal - plannedCap)} 千卡余量，可以加一份水果、坚果或牛奶`)
  }

  const meals: MealPlan[] = []
  for (const slot of toPlan) {
    const share = targets.slotShare[slot]
    const normalT = targets.kcal * share
    const normalP = targets.protein * share
    let T = normalT
    let P = normalP
    if (eatenSlots.length) {
      // 按剩余预算分配，但单餐不超过常规量的 1.3 倍、不低于 0.5 倍
      T = Math.min(normalT * 1.3, Math.max(normalT * 0.5, (Math.max(0, remainingKcal) * share) / shareSum))
      P = Math.min(normalP * 1.3, Math.max(normalP * 0.6, (Math.max(0, remainingProtein) * share) / shareSum))
    }
    const mealSeed = input.mealSeeds?.[slot] || 0
    const rnd = makeRng(hashString(`${date}|${slot}|${seed}|${mealSeed}`))
    let meal: MealPlan
    if (slot === 'breakfast') meal = planBreakfast(T, P, ctx, rnd)
    else if (slot === 'snack') meal = planSnack(T, P, ctx, rnd)
    else meal = planMainMeal(slot, T, P, ctx, rnd)
    meal.targetKcal = Math.round(T)
    meal.targetProtein = Math.round(P)
    meals.push(meal)
  }

  // 全天收敛
  const eatenTotal = sum(eatenSlots.map((k) => eaten[k] || ZERO))
  notes.push(...balanceDay(meals, ctx, eatenTotal, makeRng(hashString(`${date}|balance|${seed}`))))

  const adj = input.adjustments
  if (adj.proteinLow) notes.push('近期蛋白偏低，今天每餐都配了高蛋白的菜')
  if (adj.sodiumHigh) notes.push('近期盐偏多，今天以清淡做法为主')
  if (adj.fatHigh) notes.push('近期油偏多，今天少油少炸')
  if (adj.vegLow || adj.fiberLow) notes.push('近期蔬菜纤维不足，今天多配了菜和粗粮')
  if (adj.kcalOver) notes.push('近期热量超标，今天按目标量给，别再加餐')
  notes.push(...conditionPlanNotes(input.profile, targets))

  return { date, meals, totals: sum(meals.map((m) => m.totals)), notes, eatenSlots }
}

/** 生成购物清单：按食材汇总克重 */
export function shoppingList(plan: DayPlan, dishMap: Map<string, Dish>): Array<{ ing: string; name: string; g: number }> {
  const acc = new Map<string, number>()
  for (const m of plan.meals) {
    for (const it of m.items) {
      const d = dishMap.get(it.dishId)
      if (!d) continue
      for (const p of d.parts) acc.set(p.ing, (acc.get(p.ing) || 0) + p.g * it.portion)
    }
  }
  const skip = new Set(['water', 'salt', 'oil', 'olive_oil', 'sesame_oil', 'lard', 'soy_sauce', 'vinegar', 'sugar', 'garlic', 'ginger', 'scallion', 'cooking_wine', 'starch', 'broth', 'sichuan_pepper'])
  return [...acc.entries()]
    .filter(([id]) => !skip.has(id))
    .map(([id, g]) => ({ ing: id, name: INGREDIENT_MAP.get(id)?.name || id, g: Math.round(g) }))
    .sort((a, b) => b.g - a.g)
}
