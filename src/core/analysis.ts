import type { Dish, LogEntry, MealSlot, Nutrients, Profile, Targets, WeightEntry } from './types'
import { MEAL_SLOTS, ZERO } from './types'
import { add, entryNutrients, fruitGrams, isProcessedOrFried, macroKcalShare, scale, sum, vegGrams } from './nutrition'
import { daysBetween, lastNDays } from './dates'
import { conditionFindings } from './conditions'

export interface DayStat {
  date: string
  n: Nutrients
  vegG: number
  fruitG: number
  entryCount: number
  bySlot: Record<MealSlot, Nutrients>
  /** 油炸或加工食品贡献的热量 */
  processedKcal: number
  /** 外卖/便利店的餐次数（按餐次去重） */
  takeoutSlots: MealSlot[]
  /** 21:00 之后摄入的热量 */
  lateKcal: number
  /** 是否算作「有记录的一天」 */
  logged: boolean
}

function emptySlots(): Record<MealSlot, Nutrients> {
  return { breakfast: { ...ZERO }, lunch: { ...ZERO }, dinner: { ...ZERO }, snack: { ...ZERO } }
}

export function dayStat(date: string, entries: LogEntry[], dishMap: Map<string, Dish>, targetKcal: number): DayStat {
  const bySlot = emptySlots()
  let n: Nutrients = { ...ZERO }
  let vegG = 0
  let fruitG = 0
  let processedKcal = 0
  let lateKcal = 0
  const takeout = new Set<MealSlot>()
  const dayEntries = entries.filter((e) => e.date === date)
  for (const e of dayEntries) {
    const en = entryNutrients(e, dishMap)
    n = add(n, en)
    bySlot[e.slot] = add(bySlot[e.slot], en)
    const dish = e.dishId ? dishMap.get(e.dishId) : undefined
    if (dish) {
      vegG += vegGrams(dish) * e.portion
      fruitG += fruitGrams(dish) * e.portion
      if (isProcessedOrFried(dish)) processedKcal += en.kcal
      if (dish.cuisine === 'takeout' || dish.cuisine === 'convenience') takeout.add(e.slot)
    }
    if (e.time && e.time >= '21:00') lateKcal += en.kcal
  }
  const logged = dayEntries.length >= 2 || n.kcal >= targetKcal * 0.5
  return { date, n, vegG, fruitG, entryCount: dayEntries.length, bySlot, processedKcal, takeoutSlots: [...takeout], lateKcal, logged }
}

export interface WindowStats {
  days: DayStat[]
  loggedDays: DayStat[]
  avg: Nutrients
  avgVegServings: number
  avgFruitG: number
  avgProcessedShare: number
  takeoutMeals: number
  takeoutLunches: number
  breakfastSkipped: number
  lateDays: number
  breakfastProteinShare: number
}

export function windowStats(entries: LogEntry[], dishMap: Map<string, Dish>, endDate: string, nDays: number, targetKcal: number): WindowStats {
  const days = lastNDays(endDate, nDays).map((d) => dayStat(d, entries, dishMap, targetKcal))
  const loggedDays = days.filter((d) => d.logged)
  const k = loggedDays.length
  const avg = k ? scale(sum(loggedDays.map((d) => d.n)), 1 / k) : { ...ZERO }
  const avgVegServings = k ? loggedDays.reduce((s, d) => s + d.vegG, 0) / k / 100 : 0
  const avgFruitG = k ? loggedDays.reduce((s, d) => s + d.fruitG, 0) / k : 0
  const totalKcal = loggedDays.reduce((s, d) => s + d.n.kcal, 0)
  const avgProcessedShare = totalKcal ? loggedDays.reduce((s, d) => s + d.processedKcal, 0) / totalKcal : 0
  const takeoutMeals = loggedDays.reduce((s, d) => s + d.takeoutSlots.length, 0)
  const takeoutLunches = loggedDays.filter((d) => d.takeoutSlots.includes('lunch')).length
  const breakfastSkipped = loggedDays.filter((d) => d.bySlot.breakfast.kcal < 80).length
  const lateDays = loggedDays.filter((d) => d.lateKcal > 300).length
  const totalProtein = loggedDays.reduce((s, d) => s + d.n.protein, 0)
  const breakfastProteinShare = totalProtein ? loggedDays.reduce((s, d) => s + d.bySlot.breakfast.protein, 0) / totalProtein : 0
  return { days, loggedDays, avg, avgVegServings, avgFruitG, avgProcessedShare, takeoutMeals, takeoutLunches, breakfastSkipped, lateDays, breakfastProteinShare }
}

/** 推荐引擎使用的调整信号 */
export interface Adjustments {
  enough: boolean
  proteinLow: boolean
  sodiumHigh: boolean
  fatHigh: boolean
  fiberLow: boolean
  vegLow: boolean
  fruitLow: boolean
  kcalOver: boolean
  kcalUnder: boolean
  processedHigh: boolean
  takeoutLunch: boolean
  breakfastSkipped: boolean
  lateEating: boolean
  breakfastProteinLow: boolean
}

export const NO_ADJUST: Adjustments = {
  enough: false, proteinLow: false, sodiumHigh: false, fatHigh: false, fiberLow: false, vegLow: false, fruitLow: false,
  kcalOver: false, kcalUnder: false, processedHigh: false, takeoutLunch: false, breakfastSkipped: false, lateEating: false, breakfastProteinLow: false,
}

export function deriveAdjustments(w: WindowStats, t: Targets, profile: Profile): Adjustments {
  const k = w.loggedDays.length
  if (k < 2) return { ...NO_ADJUST }
  const share = macroKcalShare(w.avg)
  const isIF = profile.dietStyle === 'if168'
  return {
    enough: true,
    proteinLow: w.avg.protein < t.protein * 0.85,
    sodiumHigh: w.avg.sodium > t.sodiumMax * 1.2,
    fatHigh: share.fat > 0.38,
    fiberLow: w.avg.fiber < t.fiber * 0.7,
    vegLow: w.avgVegServings < t.vegServings * 0.6,
    fruitLow: w.avgFruitG < 100,
    kcalOver: w.avg.kcal > t.kcal * 1.1,
    kcalUnder: w.avg.kcal < t.kcal * ((profile.conditions || []).some((c) => c === 'pregnancy' || c === 'lactation') ? 0.85 : 0.8),
    processedHigh: w.avgProcessedShare > 0.25,
    takeoutLunch: w.takeoutLunches >= 3,
    breakfastSkipped: !isIF && w.breakfastSkipped >= 3,
    lateEating: w.lateDays >= 3,
    breakfastProteinLow: !isIF && w.breakfastProteinShare < 0.15 && k >= 3,
  }
}

export type Severity = 'good' | 'info' | 'warn'

export interface Finding {
  key: string
  severity: Severity
  title: string
  detail: string
  action: string
}

const r0 = (v: number) => Math.round(v)
const pct = (v: number) => Math.round(v * 100)

/** 把近期统计翻译成营养师式的结构建议 */
export function buildFindings(w: WindowStats, t: Targets, profile: Profile, adj: Adjustments, entries: LogEntry[] = [], dishMap?: Map<string, Dish>): Finding[] {
  const out: Finding[] = []
  const k = w.loggedDays.length
  if (k < 2) {
    out.push({ key: 'need_data', severity: 'info', title: '记录还太少', detail: `近 7 天只有 ${k} 天有完整记录。`, action: '先坚持记录 3 天，分析和推荐调整就会启用。' })
    return out
  }
  const a = w.avg
  const share = macroKcalShare(a)

  // 热量
  if (adj.kcalOver) {
    out.push({ key: 'kcal_over', severity: 'warn', title: '热量超出预算', detail: `近 ${k} 天日均 ${r0(a.kcal)} 千卡，目标 ${t.kcal}，高出 ${pct(a.kcal / t.kcal - 1)}%。`, action: '优先砍掉饮料、油炸和外卖里的隐形油，主食减到 2/3 碗，蛋白和蔬菜不减。' })
  } else if (adj.kcalUnder) {
    out.push({ key: 'kcal_under', severity: 'warn', title: '吃得偏少', detail: `日均 ${r0(a.kcal)} 千卡，低于目标 ${t.kcal} 的 80%。`, action: profile.goal === 'lose' ? '减脂也别长期低于基础代谢，容易掉肌肉和反弹。补一份蛋白或坚果加餐。' : '加一顿高蛋白加餐，或者每餐主食加半碗。' })
  } else {
    out.push({ key: 'kcal_ok', severity: 'good', title: '热量在目标范围内', detail: `日均 ${r0(a.kcal)} 千卡，目标 ${t.kcal}。`, action: '保持。' })
  }

  // 蛋白
  if (adj.proteinLow) {
    out.push({ key: 'protein_low', severity: 'warn', title: '蛋白质不足', detail: `日均 ${r0(a.protein)} g，目标 ${t.protein} g，差 ${r0(t.protein - a.protein)} g。`, action: '每餐保证一个巴掌大的肉/鱼/豆腐，早餐加一个蛋或一杯牛奶就能补回大半。' })
  } else {
    out.push({ key: 'protein_ok', severity: 'good', title: '蛋白质达标', detail: `日均 ${r0(a.protein)} g，目标 ${t.protein} g。`, action: '保持，注意分散到三餐。' })
  }
  if (adj.breakfastProteinLow) {
    out.push({ key: 'protein_uneven', severity: 'info', title: '蛋白质集中在午晚餐', detail: `早餐只贡献了全天 ${pct(w.breakfastProteinShare)}% 的蛋白。`, action: '早餐加一个蛋、一杯奶或一杯豆浆，把蛋白摊平更利于饱腹与肌肉合成。' })
  }

  // 脂肪与油
  if (adj.fatHigh) {
    out.push({ key: 'fat_high', severity: 'warn', title: '脂肪供能比偏高', detail: `脂肪占总热量 ${pct(share.fat)}%，建议 25~35%。`, action: '炒菜油减到每菜 1 勺(10 g)，少点红烧、油炸和奶油类；换蒸、煮、凉拌。' })
  }

  // 钠
  if (adj.sodiumHigh) {
    out.push({ key: 'sodium_high', severity: 'warn', title: '盐吃多了', detail: `日均钠 ${r0(a.sodium)} mg，约合 ${(a.sodium / 400).toFixed(1)} g 盐，上限 5 g。`, action: '外卖、酱料、咸菜和汤是主要来源。喝汤减半、外卖少要酱、家里做菜用限盐勺。' })
  } else if (a.sodium > t.sodiumMax) {
    out.push({ key: 'sodium_edge', severity: 'info', title: '钠略高于上限', detail: `日均钠 ${r0(a.sodium)} mg，上限 ${t.sodiumMax}。`, action: '注意酱油和汤的量即可。' })
  }

  // 蔬菜、纤维、水果
  if (adj.vegLow) {
    out.push({ key: 'veg_low', severity: 'warn', title: '蔬菜不够', detail: `日均 ${w.avgVegServings.toFixed(1)} 份(每份 100 g)，目标 ${t.vegServings} 份以上。`, action: '午晚餐各配一盘绿叶菜或一份凉拌菜，外卖时加一份清炒时蔬。' })
  } else {
    out.push({ key: 'veg_ok', severity: 'good', title: '蔬菜量够', detail: `日均 ${w.avgVegServings.toFixed(1)} 份。`, action: '保持，尽量深色蔬菜占一半。' })
  }
  if (adj.fiberLow) {
    out.push({ key: 'fiber_low', severity: 'info', title: '膳食纤维偏低', detail: `日均 ${r0(a.fiber)} g，目标 ${t.fiber} g。`, action: '主食换一半为糙米、燕麦或杂豆，水果吃整颗别榨汁。' })
  }
  if (adj.fruitLow) {
    out.push({ key: 'fruit_low', severity: 'info', title: '水果偏少', detail: `日均 ${r0(w.avgFruitG)} g，建议 200 g 左右。`, action: '上午或下午加一个拳头大的水果。' })
  }

  // 结构与习惯
  if (adj.processedHigh) {
    out.push({ key: 'processed_high', severity: 'warn', title: '油炸与加工食品占比高', detail: `占总热量 ${pct(w.avgProcessedShare)}%。`, action: '一周控制在 2 次以内，想吃时放在午餐而不是晚餐。' })
  }
  if (adj.takeoutLunch) {
    out.push({ key: 'takeout_lunch', severity: 'info', title: '午餐以外卖为主', detail: `近 7 天有 ${w.takeoutLunches} 天午餐是外卖或便利店。`, action: '推荐已按外卖里相对清淡的选项来给。点单时选清汤、少油、加蔬菜，饮料换无糖。' })
  }
  if (adj.breakfastSkipped) {
    out.push({ key: 'breakfast_skip', severity: 'info', title: '经常不吃早餐', detail: `近 7 天有 ${w.breakfastSkipped} 天早餐几乎没吃。`, action: '如果是刻意的轻断食，把饮食风格改为 16:8，推荐会跟着调整；否则至少来个蛋加一杯奶。' })
  }
  if (adj.lateEating) {
    out.push({ key: 'late_eating', severity: 'info', title: '夜间进食偏多', detail: `近 7 天有 ${w.lateDays} 天在 21 点后吃了 300 千卡以上。`, action: '把加餐挪到下午，晚上饿就喝无糖酸奶或吃黄瓜番茄。' })
  }

  // 特殊人群模式的专属建议放在最前
  if (dishMap && (profile.conditions || []).length) {
    out.unshift(...conditionFindings(w, t, profile, entries, dishMap))
  }

  return out
}

export interface AdaptiveTdee {
  tdee: number
  intakeAvg: number
  weightSlopePerDay: number
  loggedDays: number
  spanDays: number
  confidence: 'low' | 'medium' | 'high'
  note: string
}

/**
 * 自适应消耗：用实际摄入与体重变化反推真实 TDEE。
 * TDEE ≈ 平均摄入 − 体重日变化(kg/天) × 7700
 * 需要窗口内 ≥ 10 个有记录日、≥ 3 个体重点且跨度 ≥ 10 天。
 */
export function adaptiveTdee(entries: LogEntry[], weights: WeightEntry[], dishMap: Map<string, Dish>, endDate: string, formulaTdee: number, targetKcal: number, windowDays = 28): AdaptiveTdee | null {
  const w = windowStats(entries, dishMap, endDate, windowDays, targetKcal)
  const start = lastNDays(endDate, windowDays)[0]
  const ws = weights.filter((x) => x.date >= start && x.date <= endDate).sort((a, b) => (a.date < b.date ? -1 : 1))
  if (w.loggedDays.length < 10 || ws.length < 3) return null
  const span = daysBetween(ws[0].date, ws[ws.length - 1].date)
  if (span < 10) return null
  // 体重线性回归斜率 kg/天
  const xs = ws.map((x) => daysBetween(start, x.date))
  const ys = ws.map((x) => x.kg)
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length
  const my = ys.reduce((s, v) => s + v, 0) / ys.length
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) * (xs[i] - mx)
  }
  const slope = sxx ? sxy / sxx : 0
  let tdee = w.avg.kcal - slope * 7700
  // 防止记录不全把消耗算得离谱
  tdee = Math.max(formulaTdee * 0.7, Math.min(formulaTdee * 1.3, tdee))
  const confidence: AdaptiveTdee['confidence'] = w.loggedDays.length >= 21 && ws.length >= 6 ? 'high' : w.loggedDays.length >= 14 ? 'medium' : 'low'
  const diff = tdee - formulaTdee
  const note = Math.abs(diff) < 100
    ? '与公式估算基本一致，活动系数选得准。'
    : diff > 0
      ? `比公式估算高约 ${r0(diff)} 千卡，你的实际消耗比档案里的活动量更高，可以适当多吃。`
      : `比公式估算低约 ${r0(-diff)} 千卡。可能是记录漏了零食饮料，也可能活动量比想象中少。`
  return { tdee: r0(tdee), intakeAvg: r0(w.avg.kcal), weightSlopePerDay: slope, loggedDays: w.loggedDays.length, spanDays: span, confidence, note }
}

export interface Analysis {
  window: WindowStats
  adjustments: Adjustments
  findings: Finding[]
  adaptive: AdaptiveTdee | null
}

export function analyze(profile: Profile, targets: Targets, entries: LogEntry[], weights: WeightEntry[], dishMap: Map<string, Dish>, endDate: string): Analysis {
  const window = windowStats(entries, dishMap, endDate, 7, targets.kcal)
  const adjustments = deriveAdjustments(window, targets, profile)
  const findings = buildFindings(window, targets, profile, adjustments, entries, dishMap)
  const adaptive = adaptiveTdee(entries, weights, dishMap, endDate, targets.tdee, targets.kcal)
  return { window, adjustments, findings, adaptive }
}

export { MEAL_SLOTS }
