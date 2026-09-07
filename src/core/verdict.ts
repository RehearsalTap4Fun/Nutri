// 「能不能吃」：给一份具体食物在当前人群模式与今天已吃的量下的建议。
// 不是重新定义人群模式的规则——排除/加权仍以 conditions.ts 为准，这里只是把同一套规则讲成一句人话。
import type { Condition, Dish, Nutrients, Targets } from './types'
import { dishNutrients, macroKcalShare, scale } from './nutrition'
import { remainOf } from './budget'
import {
  CONDITION_LABEL, isAlcohol, isCaffeine, isRaw, isPickledOrCured, isSugary, isRefinedStaple,
  isHighPurine, isMediumPurine, isFattyMeat, isAcidicDish, isHighMercuryFish, isGerdTrigger, isHardToChew,
} from './conditions'

export type Verdict = 'avoid' | 'caution' | 'ok'
export interface FoodVerdict {
  verdict: Verdict
  /** 不建议在前，少吃点在后；ok 时为空数组 */
  reasons: string[]
}

/** 这几个函数只用得到人群模式，不需要完整档案 */
type ConditionsOnly = { conditions?: Condition[] }

const r0 = Math.round

function dishConditionReasons(dish: Dish, profile: ConditionsOnly): { avoid: string[]; caution: string[] } {
  const avoid: string[] = []
  const caution: string[] = []
  const c = profile.conditions || []
  if (!c.length) return { avoid, caution }
  const n = dishNutrients(dish)
  const share = macroKcalShare(n)
  for (const cond of c) {
    const label = CONDITION_LABEL[cond]
    if (cond === 'pregnancy' || cond === 'lactation') {
      if (isAlcohol(dish)) avoid.push(`${label}模式：含酒精，不能吃`)
      else if (isCaffeine(dish)) avoid.push(`${label}模式：含咖啡因，建议避免`)
      else if (isRaw(dish)) avoid.push(`${label}模式：生食或半熟，有感染风险`)
      else {
        if (isHighMercuryFish(dish)) caution.push(`${label}模式：这类鱼汞含量较高，建议少吃`)
        if (dish.cook === 'fried') caution.push(`${label}模式：油炸，偶尔吃可以，别当常态`)
      }
    } else if (cond === 'hypertension') {
      if (isPickledOrCured(dish)) avoid.push(`${label}模式：腌腊/腌渍，钠很高`)
      else if (isAlcohol(dish)) avoid.push(`${label}模式：含酒精，会升血压`)
      else if (n.sodium > 700) avoid.push(`${label}模式：单份钠就有 ${r0(n.sodium)} mg，超过安全线`)
      else {
        if (n.sodium > 400) caution.push(`${label}模式：这份钠约 ${r0(n.sodium)} mg，偏咸，少吃或要求少盐`)
        if (dish.cook === 'heavy') caution.push(`${label}模式：做法偏重口`)
        if (isFattyMeat(dish)) caution.push(`${label}模式：肥肉/黄油类，少吃`)
      }
    } else if (cond === 'diabetes') {
      if (isSugary(dish)) avoid.push(`${label}模式：含糖饮料或甜食，升糖快`)
      else if (isAlcohol(dish)) avoid.push(`${label}模式：含酒精`)
      else {
        if (isRefinedStaple(dish)) caution.push(`${label}模式：精制主食，升糖快，最好换粗粮或减半`)
        if (dish.cook === 'fried') caution.push(`${label}模式：油炸，少吃`)
        if (share.carbs > 0.7 && dish.cat !== 'veg' && dish.cat !== 'fruit') caution.push(`${label}模式：碳水占比高，注意份量`)
        if (dish.cat === 'fruit' && n.carbs > 25) caution.push(`${label}模式：这份水果糖分偏高，吃小半份`)
      }
    } else if (cond === 'fatty_liver') {
      if (isSugary(dish)) avoid.push(`${label}模式：含糖饮料或甜食`)
      else if (isAlcohol(dish)) avoid.push(`${label}模式：含酒精，加重肝脏负担`)
      else {
        if (isFattyMeat(dish)) caution.push(`${label}模式：肥肉/油脂类，少吃`)
        if (dish.cook === 'fried' || dish.cook === 'heavy') caution.push(`${label}模式：油炸或重口，少吃`)
        if (share.fat > 0.5 && dish.cat !== 'veg') caution.push(`${label}模式：脂肪占比偏高`)
        if (dish.cat === 'fruit' && n.carbs > 25) caution.push(`${label}模式：这份水果糖分偏高`)
      }
    } else if (cond === 'gout') {
      if (isHighPurine(dish)) avoid.push(`${label}模式：高嘌呤（内脏/贝壳虾蟹/浓汤火锅），急性期避开`)
      else if (isAlcohol(dish)) avoid.push(`${label}模式：酒精会升尿酸`)
      else if (isSugary(dish)) avoid.push(`${label}模式：含糖饮料会升尿酸`)
      else {
        if (isMediumPurine(dish)) caution.push(`${label}模式：中等嘌呤，小份就好`)
        if (dish.cat === 'soup') caution.push(`${label}模式：汤类嘌呤易溶出，少喝汤多吃料`)
        if (dish.cook === 'fried') caution.push(`${label}模式：油炸，少吃`)
      }
    } else if (cond === 'preconception') {
      if (isAlcohol(dish)) avoid.push(`${label}模式：含酒精`)
      else if (isRaw(dish)) avoid.push(`${label}模式：生食，有感染风险`)
      else if (isSugary(dish)) avoid.push(`${label}模式：含糖饮料或甜食，影响胰岛素`)
      else {
        if (isRefinedStaple(dish)) caution.push(`${label}模式：精制主食升糖快，最好换粗粮`)
        if (isCaffeine(dish)) caution.push(`${label}模式：含咖啡因，一天别超一杯`)
        if (dish.cook === 'fried') caution.push(`${label}模式：油炸，少吃`)
      }
    } else if (cond === 'gerd') {
      if (isGerdTrigger(dish)) avoid.push(`${label}模式：辛辣/油炸/咖啡浓茶/酒精/碳酸，是常见诱因`)
      else {
        if (isAcidicDish(dish)) caution.push(`${label}模式：偏酸，可能诱发不适`)
        if (share.fat > 0.45 && dish.cat !== 'veg') caution.push(`${label}模式：脂肪偏高，排空慢`)
        if (new Date().getHours() >= 20) caution.push(`${label}模式：现在时间较晚，最好睡前 3 小时内不再吃`)
      }
    } else if (cond === 'elderly') {
      if (dish.cook === 'fried') caution.push(`${label}模式：油炸不好消化`)
      if (dish.tags?.includes('spicy')) caution.push(`${label}模式：辛辣，肠胃刺激大`)
      if (isHardToChew(dish)) caution.push(`${label}模式：偏硬，注意咀嚼或切碎`)
    } else if (cond === 'training') {
      if (dish.cook === 'fried') caution.push(`${label}模式：油炸偶尔吃就好，别当蛋白主力`)
    }
  }
  return { avoid, caution }
}

/** 只有营养数值、没有食材构成的自定义食物：判不了酒精/生食/腌制/嘌呤，只能按数值粗判 */
function nutrientConditionReasons(n: Nutrients, profile: ConditionsOnly): { avoid: string[]; caution: string[]; limited: boolean } {
  const avoid: string[] = []
  const caution: string[] = []
  const c = profile.conditions || []
  if (!c.length) return { avoid, caution, limited: false }
  const share = macroKcalShare(n)
  for (const cond of c) {
    const label = CONDITION_LABEL[cond]
    if (cond === 'hypertension') {
      if (n.sodium > 700) avoid.push(`${label}模式：单份钠就有 ${r0(n.sodium)} mg，超过安全线`)
      else if (n.sodium > 400) caution.push(`${label}模式：这份钠约 ${r0(n.sodium)} mg，偏咸`)
    }
    if ((cond === 'fatty_liver' || cond === 'gerd') && share.fat > 0.45) caution.push(`${label}模式：脂肪占比偏高`)
    if (cond === 'diabetes' && share.carbs > 0.7) caution.push(`${label}模式：碳水占比高，注意份量`)
  }
  return { avoid, caution, limited: true }
}

function budgetReasons(scaled: Nutrients, profile: ConditionsOnly, targets: Targets, todaySoFar: Nutrients): { avoid: string[]; caution: string[] } {
  const avoid: string[] = []
  const caution: string[] = []
  if (scaled.kcal > 0) {
    const remainKcal = targets.kcal - todaySoFar.kcal
    if (remainKcal <= 0) caution.push(`今天热量已经到量了（${r0(todaySoFar.kcal)} / ${targets.kcal} 千卡），这份还要加 ${r0(scaled.kcal)} 千卡`)
    else if (scaled.kcal > remainKcal) caution.push(`这份约 ${r0(scaled.kcal)} 千卡，比今天剩下的 ${r0(remainKcal)} 千卡预算多，吃了会超`)
  }
  const c = profile.conditions || []
  if (c.includes('hypertension') && scaled.sodium > 0) {
    const remainNa = targets.sodiumMax - todaySoFar.sodium
    if (remainNa <= 0) avoid.push(`今天钠已经超过高血压上限（${r0(todaySoFar.sodium)} / ${targets.sodiumMax} mg），这份会继续加码`)
    else if (scaled.sodium > remainNa) caution.push(`今天钠还剩约 ${r0(remainNa)} mg 额度，这份约 ${r0(scaled.sodium)} mg，加起来会超标`)
  }
  if (c.includes('diabetes') && scaled.carbs > 0) {
    const remain = remainOf(targets, todaySoFar)
    if (remain.carbs <= 0) caution.push(`今天碳水已经到量了（${r0(todaySoFar.carbs)} / ${targets.carbs} g），这份还有 ${r0(scaled.carbs)} g`)
    else if (scaled.carbs > remain.carbs) caution.push(`今天碳水还剩约 ${r0(remain.carbs)} g，这份约 ${r0(scaled.carbs)} g，餐后血糖容易冲高`)
  }
  return { avoid, caution }
}

function toVerdict(avoid: string[], caution: string[]): FoodVerdict {
  return { verdict: avoid.length ? 'avoid' : caution.length ? 'caution' : 'ok', reasons: [...avoid, ...caution] }
}

export function foodVerdictForDish(dish: Dish, profile: ConditionsOnly, targets: Targets, todaySoFar: Nutrients, portion = 1): FoodVerdict {
  const scaled = scale(dishNutrients(dish), portion)
  const cond = dishConditionReasons(dish, profile)
  const budget = budgetReasons(scaled, profile, targets, todaySoFar)
  return toVerdict([...cond.avoid, ...budget.avoid], [...cond.caution, ...budget.caution])
}

export function foodVerdictForNutrients(perServing: Nutrients, profile: ConditionsOnly, targets: Targets, todaySoFar: Nutrients, portion = 1): FoodVerdict & { limited: boolean } {
  const scaled = scale(perServing, portion)
  const cond = nutrientConditionReasons(perServing, profile)
  const budget = budgetReasons(scaled, profile, targets, todaySoFar)
  const v = toVerdict([...cond.avoid, ...budget.avoid], [...cond.caution, ...budget.caution])
  return { ...v, limited: cond.limited }
}
