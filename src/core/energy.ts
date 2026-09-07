import type { ActivityLevel, DietStyle, Goal, MealSlot, Profile, Sex, Targets } from './types'

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const GOAL_FACTOR: Record<Goal, number> = {
  lose: 0.82,
  maintain: 1.0,
  gain: 1.1,
}

export function ageOf(birthYear: number, now = new Date()): number {
  return Math.max(10, Math.min(100, now.getFullYear() - birthYear))
}

export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg * (1 - bodyFatPct / 100)
}

/** Katch-McArdle：已知体脂率时使用 */
export function bmrKatch(weightKg: number, bodyFatPct: number): number {
  return 370 + 21.6 * leanMassKg(weightKg, bodyFatPct)
}

/** Mifflin-St Jeor：不知体脂率时使用 */
export function bmrMifflin(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161)
}

function validBodyFat(bf: number | undefined): bf is number {
  return typeof bf === 'number' && bf >= 4 && bf <= 60
}

export function computeBmr(p: Profile, now = new Date()): { bmr: number; method: 'katch' | 'mifflin' } {
  if (validBodyFat(p.bodyFatPct)) return { bmr: bmrKatch(p.weightKg, p.bodyFatPct), method: 'katch' }
  return { bmr: bmrMifflin(p.sex, p.weightKg, p.heightCm, ageOf(p.birthYear, now)), method: 'mifflin' }
}

/** 蛋白质目标：有体脂率按瘦体重计，否则按体重计 */
export function proteinTarget(p: Profile): number {
  const perLean: Record<Goal, number> = { lose: 2.2, maintain: 1.8, gain: 2.0 }
  const perWeight: Record<Goal, number> = { lose: 1.6, maintain: 1.2, gain: 1.6 }
  let g = validBodyFat(p.bodyFatPct)
    ? leanMassKg(p.weightKg, p.bodyFatPct) * perLean[p.goal]
    : p.weightKg * perWeight[p.goal]
  if (p.dietStyle === 'high_protein') g *= 1.15
  return Math.round(g)
}

export function slotShares(style: DietStyle, mealsPerDay: 3 | 4): Record<MealSlot, number> {
  if (style === 'if168') {
    // 进食窗口 12:00-20:00，不吃早餐
    return mealsPerDay === 4
      ? { breakfast: 0, lunch: 0.45, dinner: 0.4, snack: 0.15 }
      : { breakfast: 0, lunch: 0.55, dinner: 0.45, snack: 0 }
  }
  return mealsPerDay === 4
    ? { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 }
    : { breakfast: 0.3, lunch: 0.4, dinner: 0.3, snack: 0 }
}

/**
 * 目标热量与宏量。
 * - 减脂不低于 BMR，且女性不低于 1200、男性不低于 1500 千卡
 * - 低碳：碳水固定 25% 热量，脂肪补齐
 * - 其他风格：脂肪 28% 热量，碳水补齐
 */
export function computeTargets(p: Profile, now = new Date(), tdeeOverride?: number, opts: { trainingDay?: boolean } = {}): Targets {
  const conds = p.conditions || []
  const notes: string[] = []
  const { bmr, method } = computeBmr(p, now)
  const tdee = tdeeOverride ?? bmr * ACTIVITY_FACTOR[p.activity]
  const maternal = conds.includes('pregnancy') || conds.includes('lactation')
  // 孕期与哺乳期不做能量缺口，目标按维持计
  let goal = p.goal
  if (maternal && goal === 'lose') {
    goal = 'maintain'
    notes.push('孕期/哺乳期不建议减脂，目标按维持热量计算')
  }
  let kcal = tdee * GOAL_FACTOR[goal]
  const elderly = conds.includes('elderly')
  const gout = conds.includes('gout')
  // 老年人与痛风：减脂缺口放缓到 10%，避免肌肉流失 / 尿酸波动
  if ((elderly || gout) && goal === 'lose') {
    kcal = tdee * 0.9
    notes.push(elderly ? '老年人减脂缺口放缓到 10%，优先保住肌肉' : '痛风减重要慢，热量缺口放缓到 10%，快速减重会让尿酸升高')
  }
  if (goal === 'lose') {
    kcal = Math.max(kcal, bmr, p.sex === 'male' ? 1500 : 1200)
  }
  let protein = proteinTarget({ ...p, goal })
  let dairyG = 300
  let fruitG = 200
  let vegServings = 4
  let sodiumMax = 2000
  let fiberMin = 25

  // 孕期：中国居民膳食指南(2022) / DRIs 2023：孕中期 +250 千卡 +15 g 蛋白，孕晚期 +400 千卡 +30 g 蛋白，奶类 500 g
  if (conds.includes('pregnancy')) {
    const tri = p.pregnancyTrimester || 2
    const addK = [0, 0, 250, 400][tri]
    const addP = [0, 0, 15, 30][tri]
    kcal += addK
    protein += addP
    dairyG = 500
    fruitG = 300
    notes.push(tri === 1 ? '孕早期：热量与孕前一致，重点是叶酸、少量多餐、避免生食与酒精' : `孕${tri === 2 ? '中' : '晚'}期：热量 +${addK} 千卡，蛋白 +${addP} g，奶类 500 g/天`)
  }
  // 哺乳期：+400 千卡，+25 g 蛋白，奶类 500 g
  if (conds.includes('lactation')) {
    kcal += 400
    protein += 25
    dairyG = 500
    fruitG = 300
    notes.push('哺乳期：热量 +400 千卡，蛋白 +25 g，奶类 500 g/天，多喝水')
  }
  // 高血压：DASH 思路，钠 ≤1500 mg，蔬果多、钾多，少腌腊与外卖
  if (conds.includes('hypertension')) {
    sodiumMax = 1500
    vegServings = 5
    fruitG = Math.max(fruitG, 300)
    notes.push('高血压：钠上限 1500 mg（约 3.8 g 盐），蔬菜 5 份、水果 300 g，避开腌腊与重口外卖')
  }
  // 老年人：蛋白 ≥1.2 g/kg 防肌少症，奶类 400 g
  if (elderly) {
    protein = Math.max(protein, Math.round(p.weightKg * 1.2))
    dairyG = Math.max(dairyG, 400)
    notes.push(`老年人：蛋白不低于 ${Math.round(p.weightKg * 1.2)} g（每公斤 1.2 g），分到三餐，奶类 400 g，做法软烂易嚼`)
  }
  // 痛风/高尿酸：低脂奶类保护，果糖限量，肉类不加量
  if (gout) {
    dairyG = Math.max(dairyG, 400)
    fruitG = Math.min(fruitG, 200)
    notes.push('痛风/高尿酸：推荐里排除高嘌啉食物（内脏、贝壳类、虾蟹、浓肉汤、火锅、啤酒）与含糖饮料，肉类每天 100~150 g，奶类 400 g，每天 2000 ml 水')
  }
  // 备孕/多囊：低升糖、叶酸来源、控体重
  const preconception = conds.includes('preconception')
  if (preconception) {
    vegServings = Math.max(vegServings, 5)
    fiberMin = Math.max(fiberMin, 30)
    const b = p.weightKg / Math.pow(p.heightCm / 100, 2)
    notes.push(b >= 24 && goal !== 'lose'
      ? '备孕/多囊：建议把目标改为减脂，减重 5~10% 对恢复排卵最有效；低升糖饮食，每天 200 g 深绿叶菜补叶酸，叶酸片仍需按医嘱补'
      : '备孕/多囊：低升糖饮食，每天 200 g 深绿叶菜补叶酸（叶酸片仍需按医嘱补），已排除酒精、生食与含糖饮料，咖啡因限一杯')
  }
  // 胃食管反流：低脂、少量多餐、睡前 3 小时不吃
  const gerd = conds.includes('gerd')
  if (gerd) {
    notes.push('胃食管反流：脂肪压到 25%，已排除辛辣、油炸、咖啡、浓茶、酒精与碳酸饮料；建议改为三餐加一顿少量多餐，晚餐在睡前 3 小时前吃完')
  }
  // 健身增肌：蛋白 2 g/kg，碳水足量；训练日额外 +300 千卡碳水
  const training = conds.includes('training')
  if (training) {
    protein = Math.max(protein, Math.round(p.weightKg * 2))
    if (opts.trainingDay) {
      kcal += 300
      notes.push('训练日：额外 +300 千卡，全部给碳水，训练后 2 小时内的一餐安排 30~40 g 蛋白加主食')
    } else {
      notes.push(`健身增肌：蛋白 ${Math.round(p.weightKg * 2)} g（每公斤 2 g）分到每餐 30 g 以上；在「今日」把训练日标出来，当天会多给 300 千卡碳水`)
    }
  }
  // 纯素：蛋白 +10%（植物蛋白利用率低），奶类目标改为钙来源提示
  if (p.dietStyle === 'vegan') {
    protein = Math.round(protein * 1.1)
    dairyG = 0
    notes.push('纯素：蛋白上调 10%，每天 2 份以上豆制品，钙靠豆腐、豆浆与深绿叶菜；维生素 B12 必须额外补充')
  }
  const fattyLiver = conds.includes('fatty_liver')
  if (fattyLiver) {
    fruitG = Math.min(fruitG, 200)
    fiberMin = Math.max(fiberMin, 30)
    const b = p.weightKg / Math.pow(p.heightCm / 100, 2)
    notes.push(b >= 24 && goal !== 'lose'
      ? '脂肪肝：建议把目标改为减脂，减重 7~10% 是最有效的干预；已排除酒精、含糖饮料与甜食，主食粗粮'
      : '脂肪肝：已排除酒精、含糖饮料与甜食，限果糖（水果 200 g、不喝果汁），主食粗粮，少油炸与肥肉')
  }
  kcal = Math.round(kcal / 10) * 10

  let fat: number
  let carbs: number
  const diabetes = conds.includes('diabetes')
  if (diabetes) {
    // 糖尿病：碳水 50%、蛋白 ≥18%、脂肪补齐（约 30%），主食全粗粮、碳水按餐均分
    carbs = Math.round((kcal * 0.5) / 4)
    protein = Math.max(protein, Math.round((kcal * 0.18) / 4))
    fat = Math.round(Math.max(0, kcal - protein * 4 - carbs * 4) / 9)
    vegServings = Math.max(vegServings, 5)
    fruitG = Math.min(fruitG, 200)
    fiberMin = 30
    notes.push(conds.includes('pregnancy') ? '妊娠期糖尿病：碳水 50% 且按餐均分，主食粗粮，水果 200 g 分两次，避免含糖饮料' : '糖尿病：碳水 50% 且按餐均分，主食粗粮，避免含糖饮料与甜食，水果控制在 200 g')
  } else if (fattyLiver) {
    // 脂肪肝：碳水 48%、蛋白 ≥20%、脂肪补齐（约 30%）
    carbs = Math.round((kcal * 0.48) / 4)
    protein = Math.max(protein, Math.round((kcal * 0.2) / 4))
    fat = Math.round(Math.max(0, kcal - protein * 4 - carbs * 4) / 9)
  } else if (preconception) {
    // 备孕/多囊：碳水 45%、蛋白 ≥20%、脂肪补齐
    carbs = Math.round((kcal * 0.45) / 4)
    protein = Math.max(protein, Math.round((kcal * 0.2) / 4))
    fat = Math.round(Math.max(0, kcal - protein * 4 - carbs * 4) / 9)
  } else if (p.dietStyle === 'low_carb') {
    carbs = Math.round((kcal * 0.25) / 4)
    fat = Math.round(Math.max(0, kcal - protein * 4 - carbs * 4) / 9)
  } else {
    fat = Math.round((kcal * (gerd ? 0.25 : 0.28)) / 9)
    carbs = Math.round(Math.max(0, kcal - protein * 4 - fat * 9) / 4)
  }

  return {
    method,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal,
    protein: Math.round(protein),
    fat,
    carbs,
    fiber: Math.round(Math.max(fiberMin, (kcal / 1000) * 14)),
    sodiumMax,
    vegServings,
    fruitG,
    dairyG,
    evenCarbs: diabetes,
    notes,
    slotShare: slotShares(p.dietStyle, p.mealsPerDay),
  }
}

/** BMI 与体脂率的粗略参考分类 */
export function bmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100
  return weightKg / (h * h)
}

export function bmiLabel(v: number): string {
  if (v < 18.5) return '偏瘦'
  if (v < 24) return '正常'
  if (v < 28) return '超重'
  return '肥胖'
}
