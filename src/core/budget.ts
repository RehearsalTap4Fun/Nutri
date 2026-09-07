import type { Dish, MealSlot, Nutrients, Profile } from './types'
import { dishAllergens, dishNutrients, isVegan, isVegetarian, scale } from './nutrition'
import { conditionExcludes, conditionWeight } from './conditions'

/** 热量之外参与匹配的四个主要参数 */
export type MacroKey = 'protein' | 'fat' | 'carbs' | 'fiber'
export const MACRO_KEYS: MacroKey[] = ['protein', 'fat', 'carbs', 'fiber']
/** 热量 + 四个主要参数的一组数值（目标、已吃、剩余都用它） */
export type MacroGap = Pick<Nutrients, 'kcal' | MacroKey>

export interface BudgetPick {
  dish: Dish
  portion: number
  n: Nutrients
  /** 一句话理由，给界面直接显示 */
  why: string
}

export interface BudgetFocus {
  key: MacroKey
  /** gap 还差得多、over 已经超了 */
  kind: 'gap' | 'over'
  /** 克数，取绝对值 */
  amount: number
  label: string
}

const MACRO_CN: Record<MacroKey, string> = { protein: '蛋白', fat: '脂肪', carbs: '碳水', fiber: '纤维' }
/** 补缺口的奖励权重：蛋白与纤维值得主动补，碳水脂肪只是「放得下」 */
const GAIN_W: Record<MacroKey, number> = { protein: 0.8, fiber: 0.5, carbs: 0.25, fat: 0.15 }
/** 超额的惩罚权重：脂肪碳水超了要避开，蛋白略超无妨，纤维不罚 */
const OVER_W: Record<MacroKey, number> = { fat: 1.5, carbs: 1.2, protein: 0.3, fiber: 0 }
/** 缺口加分的量纲：填满日目标的三分之一、重要性 1 时加 1 分，与热量贴合度（0.3–1）同一量级 */
const GAIN_K = 3
/** 理由里说「补 X」至少要有这么多克，免得为 3 g 蛋白吹一句 */
const WHY_MIN: Record<MacroKey, number> = { protein: 12, fiber: 4, carbs: 30, fat: 999 }
const OVER_WHY: Record<MacroKey, string> = { fat: '脂肪已超，这道少油', carbs: '碳水已超，这道低碳', protein: '蛋白已够，这道清淡', fiber: '' }

/** 目标减已吃，得到今天的剩余（可为负 = 已超） */
export function remainOf(targets: MacroGap, eaten: Nutrients): MacroGap {
  return { kcal: targets.kcal - eaten.kcal, protein: targets.protein - eaten.protein, fat: targets.fat - eaten.fat, carbs: targets.carbs - eaten.carbs, fiber: targets.fiber - eaten.fiber }
}

/**
 * 四个主要参数里，哪些还差得多、哪些已经超了，给「还能吃什么」面板当挑菜依据。
 * 缺口要 ≥ 目标的 15% 才算（脂肪的缺口不提，没人需要主动补油）；超额 ≥ 目标的 5% 就算。已超的排前面，其余按「相对幅度 × 参数重要性」排。
 */
export function budgetFocus(remain: MacroGap, targets: MacroGap): BudgetFocus[] {
  const out: BudgetFocus[] = []
  for (const k of MACRO_KEYS) {
    const t = targets[k]
    if (!(t > 0)) continue
    const r = remain[k]
    if (r < -0.05 * t && OVER_W[k] > 0) out.push({ key: k, kind: 'over', amount: -r, label: `${MACRO_CN[k]}已超 ${Math.round(-r)} g` })
    else if (r > 0.15 * t && k !== 'fat') out.push({ key: k, kind: 'gap', amount: r, label: `还差${MACRO_CN[k]} ${Math.round(r)} g` })
  }
  const w = (f: BudgetFocus) => (f.amount / targets[f.key]) * (f.kind === 'over' ? OVER_W[f.key] : GAIN_W[f.key])
  out.sort((a, b) => (a.kind !== b.kind ? (a.kind === 'over' ? -1 : 1) : w(b) - w(a)))
  return out
}

/**
 * 「用剩下的预算还能吃什么」：按剩余热量与四个主要参数的缺口/超额挑几道放得下的菜。
 * - 热量：一次吃掉剩余的七成左右最好
 * - 缺口：菜里真正填进缺口的克数占日目标的比例越高越加分，重要性 蛋白 > 纤维 > 碳水 > 脂肪
 * - 超额：吃了这道会超出目标的部分按超出幅度扣分，脂肪 > 碳水 > 蛋白，纤维不罚；已经超了的参数会整体避开含量高的菜
 * 遵守过敏、营养模式排除、不想吃、素食风格；一份放不下且可分的菜按半份给；油炸降权，常吃与收藏加分。
 */
export function suggestForBudget(opts: {
  remain: MacroGap
  targets: MacroGap
  slot: MealSlot
  dishes: Dish[]
  profile: Profile
  favorites?: string[]
  recentIds?: string[]
  limit?: number
}): BudgetPick[] {
  const { remain, targets, slot, dishes, profile, favorites = [], recentIds = [], limit = 6 } = opts
  const remainKcal = remain.kcal
  if (remainKcal < 50) return []
  const allergens = new Set(profile.allergens || [])
  const disliked = new Set(profile.dislikedDishes || [])
  const scored: Array<{ score: number; pick: BudgetPick }> = []
  for (const d of dishes) {
    if (!d.slots.includes(slot) && !d.slots.includes('snack')) continue
    if (disliked.has(d.id)) continue
    if (dishAllergens(d).some((a) => allergens.has(a))) continue
    if (profile.dietStyle === 'vegetarian' && !isVegetarian(d)) continue
    if (profile.dietStyle === 'vegan' && !isVegan(d)) continue
    if (conditionExcludes(d, profile)) continue
    const base = dishNutrients(d)
    if (base.kcal < 30) continue
    let portion = 1
    if (base.kcal > remainKcal) {
      if (d.cat !== 'drink' && base.kcal * 0.5 <= remainKcal) portion = 0.5
      else continue
    }
    const n = scale(base, portion)
    const fill = n.kcal / remainKcal
    let score = 1 - Math.abs(0.7 - fill)
    let bestGain: { k: MacroKey; v: number; rank: number } | null = null
    for (const k of MACRO_KEYS) {
      const t = targets[k]
      if (!(t > 0)) continue
      const r = remain[k]
      const a = n[k]
      if (r > 0) {
        // 真正填进缺口的克数占日目标的比例 × 重要性；超出缺口的部分不再加分（会在下面按超额扣）
        const g = (Math.min(a, r) / t) * GAIN_K * GAIN_W[k]
        score += g
        // 理由句选哪个缺口：加分 × 缺口相对目标的比例，免得小缺口的纤维盖过大缺口的蛋白
        const rank = g * (r / t)
        if (a >= WHY_MIN[k] && (!bestGain || rank > bestGain.rank)) bestGain = { k, v: g, rank }
      }
      const after = r - a
      if (after < 0) score -= Math.min(1.5, -after / t) * OVER_W[k]
    }
    if (d.cook === 'fried') score -= 0.3
    if (d.cook === 'heavy') score -= 0.1
    if (favorites.includes(d.id)) score += 0.4
    if (recentIds.includes(d.id)) score += 0.2
    score *= conditionWeight(d, d.cat, profile).w
    scored.push({ score, pick: { dish: d, portion, n, why: whyFor(n, remain, targets, bestGain, fill) } })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.pick)
}

function whyFor(n: Nutrients, remain: MacroGap, targets: MacroGap, bestGain: { k: MacroKey; v: number; rank: number } | null, fill: number): string {
  if (bestGain && bestGain.rank >= 0.06) return `补${MACRO_CN[bestGain.k]} ${Math.round(n[bestGain.k])} g`
  // 有参数已经超了、而这道菜在那一项上很轻：说出来，这就是选它的原因
  for (const k of ['fat', 'carbs', 'protein'] as MacroKey[]) {
    if (remain[k] < -0.05 * targets[k] && n[k] <= 0.08 * targets[k]) return OVER_WHY[k]
  }
  return fill > 0.6 ? '正好吃满今天的量' : '小份，留点余地'
}
