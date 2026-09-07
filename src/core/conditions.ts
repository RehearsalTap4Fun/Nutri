// 特殊人群模式的规则：推荐时的排除与加权、规划说明、分析建议。
// 依据：中国居民膳食指南(2022)、中国居民膳食营养素参考摄入量(2023)、中国高血压防治指南、
// 中国 2 型糖尿病防治指南医学营养治疗部分、DASH 饮食。均为一般性建议，不替代医嘱。
import type { Condition, Dish, LogEntry, Profile, Targets } from './types'
import { INGREDIENT_MAP } from '../data/ingredients'
import { dishNutrients, macroKcalShare } from './nutrition'
import type { Finding, WindowStats } from './analysis'

export const CONDITION_LABEL: Record<Condition, string> = { pregnancy: '孕期', lactation: '哺乳期', preconception: '备孕/多囊', hypertension: '高血压', diabetes: '糖尿病', fatty_liver: '脂肪肝', gout: '痛风/高尿酸', gerd: '胃食管反流', elderly: '老年人', training: '健身增肌' }
export const CONDITION_DESC: Record<Condition, string> = {
  pregnancy: '按孕程加热量与蛋白，奶类 500 g，推荐里排除酒精、生食与含咖啡因饮品',
  lactation: '热量 +400、蛋白 +25 g，奶类 500 g，排除酒精，限咖啡因',
  hypertension: '钠上限 1500 mg，多蔬果补钾，推荐里排除腌腊制品与重口外卖',
  diabetes: '碳水 50% 且按餐均分，主食优先粗粮，排除含糖饮料与甜食',
  fatty_liver: '碳水 48%、蛋白 ≥20%，排除酒精与含糖饮料甜食，限果糖，少油炸肥肉，超重则建议减脂',
  gout: '排除高嘌啉（内脏、贝壳虾蟹、浓汤火锅、啤酒）与含糖饮料，肉类适量，奶类 400 g，多喝水',
  elderly: '蛋白每公斤 1.2 g 且分到三餐，奶类 400 g，做法软烂少油炸，减脂缺口放缓',
  preconception: '低升糖（碳水 45%），深绿叶菜补叶酸，排除酒精、生食与含糖饮料，限咖啡因，超重则建议减脂',
  gerd: '低脂少量多餐，排除辛辣、油炸、咖啡浓茶、酒精与碳酸饮料，番茄柑橘类降权，晚餐要早',
  training: '蛋白每公斤 2 g 分到每餐，优选瘦肉蛋白；「今日」可标训练日，当天 +300 千卡碳水',
}
export const TRIMESTER_LABEL: Record<1 | 2 | 3, string> = { 1: '孕早期(1~13周)', 2: '孕中期(14~27周)', 3: '孕晚期(28周起)' }

export const CONDITION_DISCLAIMER =
  '特殊人群模式基于《中国居民膳食指南(2022)》、DRIs(2023)、高血压与糖尿病防治指南中的一般性膳食建议，只做日常饮食的辅助参考，不能替代产检医生、内分泌科或临床营养科的个体化方案。用药、血糖血压监测请遵医嘱；出现任何不适以就医为先。'

const PICKLED_OR_CURED = new Set(['pickled_mustard', 'sauerkraut', 'kimchi', 'preserved_veg', 'salted_duck_egg', 'century_egg', 'chinese_sausage', 'bacon', 'luncheon_meat', 'ham_deli', 'hot_dog', 'dried_shrimp', 'fermented_bean_curd', 'sour_bamboo', 'beef_jerky', 'duck_neck_braised'])
const REFINED_STAPLE = new Set(['congee', 'glutinous_rice_raw', 'rice_cake', 'youtiao', 'bread_white', 'cereal_flakes', 'tapioca_pearls', 'glass_noodles_dry', 'rice_noodles_cooked'])
const WHOLE_GRAIN = new Set(['brown_rice_cooked', 'oats', 'bread_whole', 'corn', 'sweet_potato', 'quinoa_cooked', 'yam', 'millet_porridge', 'red_beans_dry', 'mung_beans_dry', 'chickpeas_cooked', 'lentils_cooked', 'soybeans_dry'])
const SUGARY = new Set(['sugar', 'brown_sugar', 'honey', 'syrup', 'cola', 'orange_juice', 'creamer', 'tapioca_pearls', 'yakult', 'sweet_soy_milk', 'ice_cream', 'chocolate', 'cake', 'candy', 'jelly', 'biscuits', 'mooncake', 'egg_tart', 'sports_drink', 'yogurt', 'raisins', 'red_dates'])
const DAIRY = new Set(['milk', 'milk_skim', 'yogurt', 'greek_yogurt', 'cheese'])
const HIGH_MERCURY_HINT = new Set(['tuna_canned'])
const RAW_KEYWORDS = ['寿司', '刺身', '生鱼', '溏心', '醉', '生腌', '生蚝', '三分熟']
// 嘌啉分级（每 100 g 嘌啉 >150 mg 视为高）：内脏、贝壳类、虾蟹、鱿鱼、干制海鲜、浓肉汤与火锅底、卤味
const PURINE_HIGH = new Set(['pork_liver', 'clam', 'crab', 'crayfish', 'shrimp', 'dried_shrimp', 'squid', 'fish_sea', 'fish_balls', 'beef_balls', 'duck_neck_braised', 'hotpot_base', 'yuba', 'soybeans_dry'])
// 中嘌啉（75~150 mg）：一般畜禽肉与鱼，推荐时降权并配小份
const PURINE_MEDIUM = new Set(['pork_lean', 'pork_belly', 'pork_ribs', 'pork_ground', 'pork_trotter', 'beef_lean', 'beef_brisket', 'beef_shank', 'beef_ground', 'beef_steak', 'lamb', 'chicken_breast', 'chicken_thigh', 'chicken_wing', 'chicken_whole', 'duck', 'roast_duck', 'fish_freshwater', 'fish_bass', 'salmon', 'tuna_canned', 'chinese_sausage', 'bacon', 'ham_deli', 'luncheon_meat', 'hot_dog', 'beef_jerky', 'fried_chicken'])
const FATTY_MEAT = new Set(['pork_belly', 'pork_ribs', 'pork_trotter', 'lard', 'butter', 'cream', 'chinese_sausage', 'bacon', 'roast_duck', 'beef_brisket'])
const LEAFY_GREENS = new Set(['spinach', 'broccoli', 'choy_sum', 'water_spinach', 'bok_choy', 'youmaicai', 'garlic_chives', 'asparagus', 'lettuce'])
const LEAN_PROTEIN = new Set(['chicken_breast', 'egg_white', 'egg', 'fish_freshwater', 'fish_bass', 'salmon', 'shrimp', 'beef_lean', 'beef_shank', 'tofu', 'tofu_dried', 'greek_yogurt', 'whey_protein', 'tuna_canned', 'squid'])
const ACIDIC = new Set(['tomato', 'cherry_tomato', 'orange', 'lemon', 'pomelo', 'vinegar', 'ketchup', 'orange_juice'])
const CARBONATED = new Set(['cola', 'cola_zero', 'beer', 'sports_drink'])
const SOFT_PROTEIN = new Set(['egg', 'tofu', 'tofu_soft', 'fish_freshwater', 'fish_bass', 'salmon', 'shrimp', 'milk', 'yogurt', 'greek_yogurt', 'chicken_breast'])

function has(dish: Dish, set: Set<string>, minG = 0): boolean {
  return dish.parts.some((p) => set.has(p.ing) && p.g >= minG)
}
function tag(dish: Dish, t: string): boolean {
  return !!dish.tags && dish.tags.includes(t)
}
export function isAlcohol(dish: Dish): boolean {
  return tag(dish, 'alcohol') || has(dish, new Set(['beer', 'baijiu', 'red_wine']), 30)
}
export function isCaffeine(dish: Dish): boolean {
  return tag(dish, 'caffeine') || has(dish, new Set(['black_coffee']), 30)
}
export function isRaw(dish: Dish): boolean {
  return RAW_KEYWORDS.some((k) => dish.name.includes(k)) || tag(dish, 'raw')
}
export function isPickledOrCured(dish: Dish): boolean {
  return has(dish, PICKLED_OR_CURED, 10)
}
/** 添加糖与含糖饮料/甜点的判定：糖类 ≥ 8 g，或含糖饮品成分 ≥ 100 g */
export function isSugary(dish: Dish): boolean {
  let sugarG = 0
  let sweetDrinkG = 0
  for (const p of dish.parts) {
    if (['sugar', 'brown_sugar', 'honey', 'syrup'].includes(p.ing)) sugarG += p.g
    else if (SUGARY.has(p.ing)) sweetDrinkG += p.g
  }
  return sugarG >= 8 || sweetDrinkG >= 100 || (tag(dish, 'sweet') && dish.cat !== 'fruit')
}
export function isRefinedStaple(dish: Dish): boolean {
  return (dish.cat === 'staple' || dish.cat === 'breakfast') && has(dish, REFINED_STAPLE, 30) && !has(dish, WHOLE_GRAIN, 30)
}
export function isWholeGrain(dish: Dish): boolean {
  return has(dish, WHOLE_GRAIN, 30)
}
export function dairyGrams(dish: Dish): number {
  return dish.parts.filter((p) => DAIRY.has(p.ing)).reduce((s, p) => s + p.g, 0)
}
export function isSeafoodDish(dish: Dish): boolean {
  return dish.parts.some((p) => INGREDIENT_MAP.get(p.ing)?.cat === 'seafood' && p.g >= 50)
}
/** 高嘌啉：含高嘌啉食材 ≥30 g，或肉汤/火锅底 ≥150 g（浓汤） */
export function isHighPurine(dish: Dish): boolean {
  return has(dish, PURINE_HIGH, 30) || has(dish, new Set(['broth']), 150) || tag(dish, 'hotpot')
}
export function isMediumPurine(dish: Dish): boolean {
  return !isHighPurine(dish) && has(dish, PURINE_MEDIUM, 40)
}
/** 畜禽鱼肉克重（可食部） */
export function meatGrams(dish: Dish): number {
  return dish.parts.filter((p) => ['meat', 'poultry', 'seafood'].includes(INGREDIENT_MAP.get(p.ing)?.cat || '')).reduce((s, p) => s + p.g, 0)
}
export function isFattyMeat(dish: Dish): boolean {
  return has(dish, FATTY_MEAT, 40)
}

/** 推荐时的硬排除 */
export function conditionExcludes(dish: Dish, p: Profile): boolean {
  const c = p.conditions || []
  if (!c.length) return false
  const maternal = c.includes('pregnancy') || c.includes('lactation')
  if (maternal && (isAlcohol(dish) || isCaffeine(dish) || isRaw(dish))) return true
  if (c.includes('hypertension') && isPickledOrCured(dish)) return true
  if (c.includes('hypertension') && isAlcohol(dish)) return true
  if (c.includes('diabetes') && (isSugary(dish) || isAlcohol(dish))) return true
  if (c.includes('fatty_liver') && (isSugary(dish) || isAlcohol(dish))) return true
  if (c.includes('gout') && (isHighPurine(dish) || isAlcohol(dish) || isSugary(dish))) return true
  if (c.includes('preconception') && (isAlcohol(dish) || isRaw(dish) || isSugary(dish))) return true
  if (c.includes('gerd') && (tag(dish, 'spicy') || dish.cook === 'fried' || isCaffeine(dish) || isAlcohol(dish) || has(dish, CARBONATED, 100) || has(dish, new Set(['chocolate', 'chili_oil', 'chili_sauce', 'doubanjiang', 'chili_fresh']), 5))) return true
  return false
}

/** 推荐时的加权与理由 */
export function conditionWeight(dish: Dish, role: string, p: Profile): { w: number; reason?: string } {
  const c = p.conditions || []
  let w = 1
  let reason: string | undefined
  if (!c.length) return { w }
  const n = dishNutrients(dish)
  const share = macroKcalShare(n)
  const maternal = c.includes('pregnancy') || c.includes('lactation')
  if (maternal) {
    if (dairyGrams(dish) >= 150) { w *= 1.7; reason = '孕产期奶类要够 500 g' }
    if (isSeafoodDish(dish) && !has(dish, HIGH_MERCURY_HINT)) { w *= 1.3; reason = reason || '每周 2~3 次鱼虾补 DHA' }
    if (has(dish, HIGH_MERCURY_HINT)) w *= 0.4
    if (dish.cook === 'fried') w *= 0.5
    if (dish.cuisine === 'takeout' || dish.cuisine === 'convenience') w *= 0.6
  }
  if (c.includes('hypertension')) {
    // 家常菜普遍每道 1.5~2 g 盐，只靠分档降权拉不开差距：单菜钠 >700 mg 直接不推荐，其余按钠量连续衰减，同类里最淡的胜出
    if (n.sodium > 700 && role !== 'combo') return { w: 0 }
    w *= Math.exp(-n.sodium / 350)
    if (n.sodium <= 350) reason = reason || '高血压模式选同类里最淡的'
    if (dish.cook === 'heavy') w *= 0.5
    if (dish.cuisine === 'takeout') w *= 0.3
    if (has(dish, new Set(['pork_belly', 'pork_ribs', 'lard', 'butter', 'cream']), 40)) w *= 0.6
    if ((role === 'veg' || role === 'fruit' || role === 'snack') && (dish.cat === 'veg' || dish.cat === 'fruit')) w *= 1.3
  }
  if (c.includes('diabetes')) {
    if (role === 'staple' || role === 'main') {
      if (isWholeGrain(dish)) { w *= 2.5; reason = reason || '糖尿病模式主食优先粗粮' }
      if (isRefinedStaple(dish)) w *= 0.15
      if (has(dish, new Set(['rice_cooked']), 100) && !isWholeGrain(dish)) w *= 0.6
    }
    if (dish.cat === 'fruit' && n.carbs > 25) w *= 0.5
    if (share.carbs > 0.7 && dish.cat !== 'veg' && dish.cat !== 'fruit') w *= 0.5
    if (dish.cook === 'fried') w *= 0.5
    if (n.fiber >= 4) w *= 1.2
  }
  if (c.includes('fatty_liver')) {
    if (role === 'staple' || role === 'main') {
      if (isWholeGrain(dish)) { w *= 2; reason = reason || '脂肪肝模式主食优先粗粮' }
      if (isRefinedStaple(dish)) w *= 0.3
    }
    if (isFattyMeat(dish)) w *= 0.4
    if (dish.cook === 'fried') w *= 0.3
    if (dish.cook === 'heavy') w *= 0.5
    if (dish.cat === 'fruit' && n.carbs > 25) w *= 0.5
    if (share.fat > 0.5 && dish.cat !== 'veg') w *= 0.5
    if (isSeafoodDish(dish) || has(dish, new Set(['chicken_breast', 'tofu', 'tofu_soft']), 60)) { w *= 1.3; reason = reason || '脂肪肝模式选低脂蛋白' }
  }
  if (c.includes('gout')) {
    if (isMediumPurine(dish)) w *= 0.5
    if (dairyGrams(dish) >= 150) { w *= 1.6; reason = reason || '痛风模式：低脂奶类有助降尿酸' }
    if (has(dish, new Set(['egg', 'egg_white', 'tofu', 'tofu_soft', 'tofu_dried']), 60) && !isMediumPurine(dish)) { w *= 1.5; reason = reason || '痛风模式：蛋和豆腐替代部分肉' }
    if (role === 'soup') w *= 0.3
    if (dish.cook === 'fried') w *= 0.5
    if (dish.cuisine === 'takeout') w *= 0.4
  }
  if (c.includes('preconception')) {
    if (role === 'staple' || role === 'main') {
      if (isWholeGrain(dish)) { w *= 2; reason = reason || '备孕模式主食低升糖' }
      if (isRefinedStaple(dish)) w *= 0.3
    }
    if (has(dish, LEAFY_GREENS, 100)) { w *= 1.5; reason = reason || '深绿叶菜补叶酸' }
    if (isSeafoodDish(dish) && !has(dish, HIGH_MERCURY_HINT)) w *= 1.3
    if (isCaffeine(dish)) w *= 0.4
    if (dish.cook === 'fried') w *= 0.5
    if (dairyGrams(dish) >= 150) w *= 1.3
  }
  if (c.includes('gerd')) {
    if (share.fat > 0.45 && dish.cat !== 'veg') w *= 0.4
    if (has(dish, ACIDIC, 80)) w *= 0.6
    if (dish.cook === 'heavy') w *= 0.5
    if (dish.cook === 'light' && share.fat < 0.35) { w *= 1.4; reason = reason || '反流模式选清淡低脂' }
    if (tag(dish, 'stew') || dish.cat === 'soup') w *= 1.2
    if (has(dish, new Set(['onion', 'garlic']), 30)) w *= 0.7
    if (dish.cuisine === 'takeout') w *= 0.4
  }
  if (c.includes('training')) {
    if ((role === 'protein' || role === 'bfprotein' || role === 'combo' || role === 'snack') && share.protein >= 0.3) { w *= 1.6; reason = reason || '增肌模式：高蛋白' }
    if (has(dish, LEAN_PROTEIN, 80)) w *= 1.4
    if (role === 'staple' && isWholeGrain(dish)) w *= 1.3
    if (dish.cook === 'fried') w *= 0.5
    if (n.protein >= 25 && (role === 'protein' || role === 'combo')) w *= 1.3
  }
  if (c.includes('elderly')) {
    if (dish.cook === 'fried') w *= 0.4
    if (tag(dish, 'spicy')) w *= 0.5
    if (tag(dish, 'stew') || dish.cat === 'soup') { w *= 1.3; reason = reason || '老年人模式：软烂好消化' }
    if (has(dish, SOFT_PROTEIN, 60)) { w *= 1.3; reason = reason || '老年人模式：优质易消化蛋白' }
    if (dairyGrams(dish) >= 150) w *= 1.4
    if (has(dish, new Set(['beef_jerky', 'nuts_mixed', 'peanut', 'walnut', 'almond']), 20)) w *= 0.5
    if (dish.cuisine === 'takeout' || dish.cuisine === 'convenience') w *= 0.5
  }
  return { w, reason }
}

export function conditionPlanNotes(p: Profile, t: Targets): string[] {
  const c = p.conditions || []
  const out: string[] = []
  if (c.includes('pregnancy')) out.push(`孕期模式：已排除酒精、生食、含咖啡因饮品；奶类目标 ${t.dairyG} g，蛋白 ${t.protein} g`)
  if (c.includes('lactation')) out.push(`哺乳期模式：已排除酒精、含咖啡因饮品；奶类目标 ${t.dairyG} g，记得多喝水`)
  if (c.includes('hypertension')) out.push(`高血压模式：钠上限 ${t.sodiumMax} mg，已排除腌腊与单菜钠超 700 mg 的菜，家常菜按少盐做法计（调味盐减半，记为已吃时也按此记）`)
  if (c.includes('diabetes')) out.push(`糖尿病模式：主食粗粮，每餐碳水不超过 ${Math.round(t.carbs * Math.max(...Object.values(t.slotShare)) * 1.15)} g，已排除含糖饮料与甜食`)
  if (c.includes('fatty_liver')) out.push('脂肪肝模式：已排除酒精、含糖饮料与甜食，主食粗粮，肥肉与油炸降权，水果限 200 g')
  if (c.includes('gout')) out.push('痛风模式：已排除内脏、贝壳虾蟹、浓汤火锅、啤酒与含糖饮料；肉类用小份，蛋奶豆腐补蛋白；记得每天 2000 ml 水')
  if (c.includes('elderly')) out.push(`老年人模式：蛋白 ${t.protein} g 分到三餐，早餐也配了蛋白；做法以蒸煮炖为主`)
  if (c.includes('preconception')) out.push('备孕/多囊模式：低升糖主食，深绿叶菜补叶酸，已排除酒精、生食与含糖饮料，咖啡因限一杯')
  if (c.includes('gerd')) out.push('反流模式：已排除辛辣、油炸、咖啡浓茶、酒精与碳酸饮料，低脂清淡为主；晚餐尽量在睡前 3 小时前吃完，饭后别马上躺')
  if (c.includes('training')) out.push(`增肌模式：蛋白 ${t.protein} g，每餐 30 g 以上；${t.notes.some((n) => n.startsWith('训练日')) ? '今天是训练日，碳水已加量' : '训练日记得在「今日」标出来'}`)
  return out
}

const r0 = (v: number) => Math.round(v)

/** 分析页的模式专属建议。entries 为近 7 天记录 */
export function conditionFindings(w: WindowStats, t: Targets, p: Profile, entries: LogEntry[], dishMap: Map<string, Dish>): Finding[] {
  const c = p.conditions || []
  const out: Finding[] = []
  if (!c.length || w.loggedDays.length < 2) return out
  const k = w.loggedDays.length
  const loggedDates = new Set(w.loggedDays.map((d) => d.date))
  const recent = entries.filter((e) => loggedDates.has(e.date))
  const dishOf = (e: LogEntry) => (e.dishId ? dishMap.get(e.dishId) : undefined)
  const maternal = c.includes('pregnancy') || c.includes('lactation')

  if (maternal) {
    const dairy = recent.reduce((s, e) => { const d = dishOf(e); return s + (d ? dairyGrams(d) * e.portion : 0) }, 0) / k
    if (dairy < t.dairyG * 0.6) out.push({ key: 'dairy_low', severity: 'warn', title: '奶类不够', detail: `日均约 ${r0(dairy)} g，孕产期建议 ${t.dairyG} g。`, action: '早餐一杯奶、下午一杯酸奶就能到 500 g，乳糖不耐可换无糖酸奶或奶酪。' })
    else out.push({ key: 'dairy_ok', severity: 'good', title: '奶类达标', detail: `日均约 ${r0(dairy)} g。`, action: '保持。' })
    const fishDays = new Set(recent.filter((e) => { const d = dishOf(e); return d && isSeafoodDish(d) }).map((e) => e.date)).size
    if (k >= 5 && fishDays < 2) out.push({ key: 'fish_low', severity: 'info', title: '鱼虾吃得少', detail: `近 ${k} 天只有 ${fishDays} 天吃了鱼虾。`, action: '每周 2~3 次清蒸或水煮的鱼虾，补 DHA 与优质蛋白，避开生鱼片与高汞鱼。' })
    const caffeineDays = recent.filter((e) => { const d = dishOf(e); return d && isCaffeine(d) }).length
    if (caffeineDays > k) out.push({ key: 'caffeine_high', severity: 'info', title: '咖啡因偏多', detail: `近 ${k} 天记了 ${caffeineDays} 次含咖啡因饮品。`, action: '孕产期每天咖啡因不超过 200 mg，约一杯拿铁或两杯茶。' })
    const alcohol = recent.filter((e) => { const d = dishOf(e); return d && isAlcohol(d) }).length
    if (alcohol) out.push({ key: 'alcohol_any', severity: 'warn', title: '记录里有酒', detail: `近 ${k} 天有 ${alcohol} 次饮酒记录。`, action: '孕期与哺乳期应完全避免酒精，如已饮用可与产检医生沟通。' })
    if (w.avg.kcal < t.kcal * 0.85) out.push({ key: 'maternal_under', severity: 'warn', title: '热量不足', detail: `日均 ${r0(w.avg.kcal)} 千卡，低于孕产期目标 ${t.kcal}。`, action: '别控制饮食，孕吐或胃口差时少量多餐，加一顿奶加坚果或鸡蛋。' })
  }

  if (c.includes('hypertension')) {
    if (w.avg.sodium > t.sodiumMax) out.push({ key: 'htn_sodium', severity: 'warn', title: '钠超过高血压上限', detail: `日均 ${r0(w.avg.sodium)} mg，上限 ${t.sodiumMax} mg（约 ${(t.sodiumMax / 400).toFixed(1)} g 盐）。`, action: '汤、酱料、外卖和腌腊是四大来源。家里用限盐勺，外卖备注少盐，汤只喝一半。' })
    else out.push({ key: 'htn_sodium_ok', severity: 'good', title: '钠在高血压上限内', detail: `日均 ${r0(w.avg.sodium)} mg。`, action: '保持，血压记录同步给医生。' })
    const potassiumProxy = w.avgVegServings * 100 + w.avgFruitG
    if (potassiumProxy < 500) out.push({ key: 'htn_potassium', severity: 'info', title: '蔬果不够，钾偏少', detail: `日均蔬菜 ${w.avgVegServings.toFixed(1)} 份、水果 ${r0(w.avgFruitG)} g。`, action: '每天 500 g 蔬菜加 300 g 水果，香蕉、菠菜、土豆、豆类都富含钾。肾功能异常者钾摄入请先问医生。' })
    const cured = recent.filter((e) => { const d = dishOf(e); return d && isPickledOrCured(d) }).length
    if (cured >= 2) out.push({ key: 'htn_cured', severity: 'info', title: '腌腊制品出现较多', detail: `近 ${k} 天记了 ${cured} 次咸菜、腊肠、火腿类。`, action: '换成新鲜肉和蔬菜，想要咸鲜味用醋、蒜、香料和柠檬替代。' })
  }

  if (c.includes('diabetes')) {
    const sugary = recent.filter((e) => { const d = dishOf(e); return d && isSugary(d) }).length
    if (sugary) out.push({ key: 'dm_sugar', severity: 'warn', title: '含糖饮料或甜食', detail: `近 ${k} 天记了 ${sugary} 次。`, action: '换无糖茶、黑咖啡或苏打水；想吃甜的放在正餐后、少量，并搭配蛋白和蔬菜。' })
    const refined = recent.filter((e) => { const d = dishOf(e); return d && isRefinedStaple(d) }).length
    const wholes = recent.filter((e) => { const d = dishOf(e); return d && isWholeGrain(d) }).length
    if (refined > wholes) out.push({ key: 'dm_refined', severity: 'info', title: '精制主食多于粗粮', detail: `精制 ${refined} 次，粗粮 ${wholes} 次。`, action: '白粥、年糕、糯米升糖快。米饭掺一半糙米或杂豆，早餐燕麦、玉米、全麦面包。' })
    // 碳水分布：某一餐占全天碳水超过 50% 视为集中
    let maxShare = 0
    for (const d of w.loggedDays) {
      const total = d.n.carbs || 1
      for (const s of ['breakfast', 'lunch', 'dinner', 'snack'] as const) maxShare = Math.max(maxShare, d.bySlot[s].carbs / total)
    }
    if (maxShare > 0.5) out.push({ key: 'dm_uneven', severity: 'warn', title: '碳水集中在某一餐', detail: `有一餐占了全天碳水的 ${Math.round(maxShare * 100)}%。`, action: '把主食匀到三餐，每餐主食一小碗左右，餐后血糖会平稳很多。' })
    else out.push({ key: 'dm_even_ok', severity: 'good', title: '碳水分布均匀', detail: '没有哪一餐碳水明显集中。', action: '保持，餐后 2 小时血糖对照一下。' })
    if (w.avg.fiber < t.fiber * 0.8) out.push({ key: 'dm_fiber', severity: 'info', title: '纤维不够', detail: `日均 ${r0(w.avg.fiber)} g，目标 ${t.fiber} g。`, action: '每餐先吃蔬菜再吃主食，主食换粗粮，纤维上去餐后血糖峰就下来。' })
  }

  if (c.includes('fatty_liver')) {
    const sugary = recent.filter((e) => { const d = dishOf(e); return d && isSugary(d) }).length
    if (sugary) out.push({ key: 'fl_sugar', severity: 'warn', title: '含糖饮料或甜食', detail: `近 ${k} 天记了 ${sugary} 次。`, action: '果糖直接在肝脏合成脂肪，含糖饮料、果汁、甜点是脂肪肝的头号来源，换无糖茶或白水。' })
    const alcohol = recent.filter((e) => { const d = dishOf(e); return d && isAlcohol(d) }).length
    if (alcohol) out.push({ key: 'fl_alcohol', severity: 'warn', title: '记录里有酒', detail: `近 ${k} 天有 ${alcohol} 次。`, action: '脂肪肝期间建议完全戒酒，哪怕少量也会加重肝脏负担。' })
    const share = macroKcalShare(w.avg)
    if (share.fat > 0.35) out.push({ key: 'fl_fat', severity: 'info', title: '脂肪供能比偏高', detail: `脂肪占 ${Math.round(share.fat * 100)}%，建议 25~30%。`, action: '少肥肉、油炸和奶油类，炒菜油每菜一勺以内。' })
    const fried = recent.filter((e) => { const d = dishOf(e); return d && (d.cook === 'fried' || isFattyMeat(d)) }).length
    if (fried >= 3) out.push({ key: 'fl_fried', severity: 'info', title: '油炸与肥肉较多', detail: `近 ${k} 天记了 ${fried} 次。`, action: '换成蒸、煮、烤，肉选鱼、鸡胸、瘦肉。' })
  }

  if (c.includes('gout')) {
    const high = recent.filter((e) => { const d = dishOf(e); return d && isHighPurine(d) })
    if (high.length) out.push({ key: 'gout_purine', severity: 'warn', title: '吃了高嘌啉食物', detail: `近 ${k} 天有 ${high.length} 次：${[...new Set(high.map((e) => dishOf(e)!.name))].slice(0, 4).join('、')}。`, action: '内脏、贝壳虾蟹、浓肉汤和火锅是急性发作的常见诱因，急性期完全避开，缓解期偶尔小份。' })
    const alcohol = recent.filter((e) => { const d = dishOf(e); return d && isAlcohol(d) }).length
    if (alcohol) out.push({ key: 'gout_alcohol', severity: 'warn', title: '记录里有酒', detail: `近 ${k} 天有 ${alcohol} 次。`, action: '啤酒和白酒都会升尿酸并阻碍排泄，痛风患者建议戒酒。' })
    const sugary = recent.filter((e) => { const d = dishOf(e); return d && isSugary(d) }).length
    if (sugary) out.push({ key: 'gout_sugar', severity: 'info', title: '含糖饮料', detail: `近 ${k} 天记了 ${sugary} 次。`, action: '果糖会升尿酸，和啤酒同一等级，换无糖饮品。' })
    const meat = recent.reduce((s, e) => { const d = dishOf(e); return s + (d ? meatGrams(d) * e.portion : 0) }, 0) / k
    if (meat > 150) out.push({ key: 'gout_meat', severity: 'info', title: '肉类偏多', detail: `日均约 ${r0(meat)} g 畜禽鱼肉。`, action: '控制在 100~150 g，用鸡蛋、豆腐、奶制品补蛋白。' })
    const dairy = recent.reduce((s, e) => { const d = dishOf(e); return s + (d ? dairyGrams(d) * e.portion : 0) }, 0) / k
    if (dairy < 200) out.push({ key: 'gout_dairy', severity: 'info', title: '奶类偏少', detail: `日均约 ${r0(dairy)} g。`, action: '低脂奶和酸奶有助尿酸排泄，每天 300~400 g。' })
  }

  if (c.includes('preconception')) {
    const sugary = recent.filter((e) => { const d = dishOf(e); return d && isSugary(d) }).length
    if (sugary) out.push({ key: 'pc_sugar', severity: 'warn', title: '含糖饮料或甜食', detail: `近 ${k} 天记了 ${sugary} 次。`, action: '多囊与胰岛素抵抗关系密切，含糖饮料是首要要戒的；想喝甜的用无糖豆浆或牛奶。' })
    const alcohol = recent.filter((e) => { const d = dishOf(e); return d && isAlcohol(d) }).length
    if (alcohol) out.push({ key: 'pc_alcohol', severity: 'warn', title: '记录里有酒', detail: `近 ${k} 天有 ${alcohol} 次。`, action: '备孕期建议双方都戒酒。' })
    const leafy = recent.reduce((s, e) => { const d = dishOf(e); return s + (d ? d.parts.filter((p) => LEAFY_GREENS.has(p.ing)).reduce((a, p) => a + p.g, 0) * e.portion : 0) }, 0) / k
    if (leafy < 150) out.push({ key: 'pc_leafy', severity: 'info', title: '深绿叶菜偏少', detail: `日均约 ${r0(leafy)} g，建议 200 g。`, action: '菠菜、西兰花、菜心、油麦菜都是叶酸大户，一天两盘绿叶菜。叶酸片仍需按医嘱补。' })
    const refined = recent.filter((e) => { const d = dishOf(e); return d && isRefinedStaple(d) }).length
    const wholes = recent.filter((e) => { const d = dishOf(e); return d && isWholeGrain(d) }).length
    if (refined > wholes) out.push({ key: 'pc_refined', severity: 'info', title: '精制主食多于粗粮', detail: `精制 ${refined} 次，粗粮 ${wholes} 次。`, action: '低升糖是备孕与多囊饮食的核心，米饭掺糙米或杂豆，早餐燕麦。' })
    const caffeine = recent.filter((e) => { const d = dishOf(e); return d && isCaffeine(d) }).length
    if (caffeine > k) out.push({ key: 'pc_caffeine', severity: 'info', title: '咖啡因偏多', detail: `近 ${k} 天记了 ${caffeine} 次。`, action: '备孕期每天不超过 200 mg 咖啡因，约一杯拿铁。' })
  }

  if (c.includes('gerd')) {
    const late = w.loggedDays.filter((d) => d.lateKcal > 150).length
    if (late >= 2) out.push({ key: 'gerd_late', severity: 'warn', title: '睡前进食', detail: `近 ${k} 天有 ${late} 天在 21 点后吃了东西。`, action: '反流最怕躺下前胃里有食物，晚餐提前到 18~19 点，睡前 3 小时不吃。' })
    let bigMeal = 0
    for (const d of w.loggedDays) {
      const total = d.n.kcal || 1
      for (const s of ['breakfast', 'lunch', 'dinner'] as const) if (d.bySlot[s].kcal / total > 0.5) bigMeal++
    }
    if (bigMeal >= 2) out.push({ key: 'gerd_big', severity: 'info', title: '有些餐吃得太集中', detail: `近 ${k} 天有 ${bigMeal} 餐占了全天一半以上热量。`, action: '改成三餐加一到两次加餐，每餐七分饱，胃内压小反流就少。' })
    const triggers = recent.filter((e) => { const d = dishOf(e); return d && (tag(d, 'spicy') || d.cook === 'fried' || isCaffeine(d) || isAlcohol(d) || has(d, CARBONATED, 100)) }).length
    if (triggers) out.push({ key: 'gerd_trigger', severity: 'warn', title: '吃了常见诱因', detail: `近 ${k} 天记了 ${triggers} 次辛辣、油炸、咖啡浓茶、酒或碳酸饮料。`, action: '这些是反流最常见的诱因，先戒两周看症状变化，再逐个试回。' })
    const share = macroKcalShare(w.avg)
    if (share.fat > 0.32) out.push({ key: 'gerd_fat', severity: 'info', title: '脂肪偏高', detail: `脂肪占 ${Math.round(share.fat * 100)}%，建议 25% 左右。`, action: '高脂餐排空慢、压迫贲门，少油炸、肥肉、奶油。' })
  }

  if (c.includes('training')) {
    if (w.avg.protein < t.protein * 0.9) out.push({ key: 'tr_protein', severity: 'warn', title: '蛋白没到增肌量', detail: `日均 ${r0(w.avg.protein)} g，目标 ${t.protein} g。`, action: '每餐 30~40 g：一个巴掌大的肉加一个蛋，训练后再加一勺蛋白粉或一杯希腊酸奶。' })
    else out.push({ key: 'tr_protein_ok', severity: 'good', title: '蛋白量够', detail: `日均 ${r0(w.avg.protein)} g。`, action: '保持，注意每餐都要有。' })
    let lowMeals = 0
    let mains = 0
    for (const d of w.loggedDays) for (const s of ['breakfast', 'lunch', 'dinner'] as const) { if (d.bySlot[s].kcal > 80) { mains++; if (d.bySlot[s].protein < 25) lowMeals++ } }
    if (mains && lowMeals / mains > 0.4) out.push({ key: 'tr_even', severity: 'info', title: '有些餐蛋白不足 25 g', detail: `${lowMeals} / ${mains} 餐低于 25 g。`, action: '肌肉合成每餐有阈值，把蛋白从晚餐匀到早餐和午餐。' })
    if (w.avg.kcal < t.kcal * 0.9 && (mains >= 6)) out.push({ key: 'tr_kcal', severity: 'info', title: '热量偏低，难增肌', detail: `日均 ${r0(w.avg.kcal)} 千卡，目标 ${t.kcal}。`, action: '增肌需要小幅盈余，训练日加一份主食或一根香蕉加一杯奶。' })
  }

  if (c.includes('elderly')) {
    if (w.breakfastProteinShare < 0.2 && k >= 3) out.push({ key: 'eld_protein_even', severity: 'warn', title: '早餐蛋白太少', detail: `早餐只占全天蛋白的 ${Math.round(w.breakfastProteinShare * 100)}%。`, action: '老年人每餐 25~30 g 蛋白才能有效合成肌肉，早餐加一个蛋加一杯奶。' })
    if (w.avg.protein < t.protein * 0.85) out.push({ key: 'eld_protein', severity: 'warn', title: '蛋白不够，肌肉会流失', detail: `日均 ${r0(w.avg.protein)} g，目标 ${t.protein} g。`, action: '每餐一个巴掌大的鱼、蛋、豆腐或瘦肉，牙口不好就蒸蛋、鱼、豆腐脑。' })
    const dairy = recent.reduce((s, e) => { const d = dishOf(e); return s + (d ? dairyGrams(d) * e.portion : 0) }, 0) / k
    if (dairy < t.dairyG * 0.6) out.push({ key: 'eld_dairy', severity: 'info', title: '奶类偏少', detail: `日均约 ${r0(dairy)} g，建议 ${t.dairyG} g。`, action: '补钙防骨质疏松，乳糖不耐用酸奶或奶酪。' })
    if (w.avg.kcal < t.kcal * 0.8) out.push({ key: 'eld_under', severity: 'warn', title: '吃得偏少', detail: `日均 ${r0(w.avg.kcal)} 千卡，目标 ${t.kcal}。`, action: '老年人胃口小很常见，可以加一顿下午茶：牛奶加鸡蛋或豆浆加坚果碎。' })
    const fried = recent.filter((e) => { const d = dishOf(e); return d && d.cook === 'fried' }).length
    if (fried >= 3) out.push({ key: 'eld_fried', severity: 'info', title: '油炸偏多', detail: `近 ${k} 天记了 ${fried} 次。`, action: '油炸不好消化，换蒸煮炖。' })
  }
  return out
}
