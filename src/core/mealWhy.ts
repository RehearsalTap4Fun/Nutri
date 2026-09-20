// 「这一餐为什么长这样」：把已有的排餐结果翻译成两三句话。
// 只读 planner 已经产出的东西（角色构成、份额、结论、人群模式），不另做判断，
// 免得说法和实际排法对不上。
import type { Adjustments } from './analysis'
import type { MealPlan } from './planner'
import type { Condition, MealSlot, Profile, Targets } from './types'
import { CONDITION_LABEL } from './conditions'

const SLOT_CN: Record<MealSlot, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }

/** 这一餐由哪些角色组成，说成人话 */
function shapeOf(m: MealPlan): string | null {
  const roles = m.items.map((i) => i.role)
  if (roles.includes('combo')) return '外卖里挑了相对清淡的一份'
  const prot = roles.filter((r) => r === 'protein' || r === 'bfprotein').length
  const veg = roles.filter((r) => r === 'veg').length
  const staple = roles.filter((r) => r === 'staple' || r === 'main').length
  const soup = roles.includes('soup')
  const fruit = roles.includes('fruit')
  const parts: string[] = []
  if (prot) parts.push(prot > 1 ? `${prot} 道蛋白菜` : '一道荤菜')
  if (veg) parts.push(veg > 1 ? `${veg} 道素菜` : '一道素菜')
  if (staple) parts.push('主食')
  if (soup) parts.push('一个汤')
  if (fruit) parts.push('一份水果')
  if (roles.includes('snack') && parts.length === 0) return '一份加餐'
  return parts.length ? parts.join('配') : null
}

/** 近 7 天的结论里，真正影响到这一餐的那几条 */
function fromAdjustments(a: Adjustments, m: MealPlan): string[] {
  if (!a.enough) return []
  const out: string[] = []
  const roles = m.items.map((i) => i.role)
  if (a.proteinLow && roles.some((r) => r === 'protein' || r === 'bfprotein' || r === 'combo')) {
    out.push('近期蛋白偏低，这一餐往高蛋白的菜上挑')
  }
  if (a.sodiumHigh) out.push('近期盐偏多，优先清淡做法')
  if (a.fatHigh) out.push('近期油偏多，避开了油炸和肥肉')
  if ((a.vegLow || a.fiberLow) && roles.filter((r) => r === 'veg').length > 1) {
    out.push('近期蔬菜纤维不足，多加了一道菜')
  } else if (a.fiberLow && roles.includes('staple')) {
    out.push('近期纤维不足，主食往粗粮上挑')
  }
  if (a.kcalOver) out.push('近期热量超标，份量按目标给，没有放宽')
  if (a.processedHigh) out.push('近期加工食品偏多，这一餐避开了油炸与预制')
  return out
}

/** 起作用的人群模式 */
function fromConditions(conds: Condition[]): string | null {
  if (!conds.length) return null
  return `按${conds.map((c) => CONDITION_LABEL[c]).join('、')}模式的规则筛过`
}

export interface MealWhyInput {
  meal: MealPlan
  targets: Targets
  adjustments: Adjustments
  profile: Profile
  /** 当天有餐次已记录，预算被重新分配过 */
  redistributed?: boolean
}

/**
 * 两到四句话，够解释这一餐就行。
 * 顺序是：预算从哪来 → 怎么配的 → 近 7 天让它偏向什么 → 人群模式。
 */
export function mealWhy({ meal, targets, adjustments, profile, redistributed }: MealWhyInput): string[] {
  const out: string[] = []
  const share = targets.slotShare[meal.slot]

  if (redistributed) {
    out.push(`前面的餐已记录，这一餐按剩下的预算给约 ${Math.round(meal.targetKcal)} 千卡`)
  } else if (share > 0) {
    out.push(
      `${SLOT_CN[meal.slot]}占全天 ${Math.round(share * 100)}%，约 ${Math.round(meal.targetKcal)} 千卡、蛋白 ${Math.round(meal.targetProtein)} g`,
    )
  }

  const shape = shapeOf(meal)
  if (shape) out.push(shape)

  out.push(...fromAdjustments(adjustments, meal))

  const cond = fromConditions(profile.conditions || [])
  if (cond) out.push(cond)

  return out
}
