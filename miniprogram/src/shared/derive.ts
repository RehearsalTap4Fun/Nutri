/**
 * 从状态推出目标、分析与推荐。
 *
 * 这里一行业务逻辑都没有，全部转调网页版 `src/core` 里的同一份函数，
 * 口径与计算顺序照抄 `src/App.tsx`。小程序侧只负责把参数拼好。
 */
import type { Dish, LogEntry, MealSlot, Nutrients, Profile, Targets } from '@core/types'
import { MEAL_SLOTS } from '@core/types'
import { computeTargets } from '@core/energy'
import { analyze, dayStat } from '@core/analysis'
import type { Analysis } from '@core/analysis'
import { planDay } from '@core/planner'
import type { DayPlan } from '@core/planner'
import { addDays } from '@core/dates'
import { DISHES, DISH_MAP } from '@data/dishes/index'
import type { AppState } from './state'

export interface Derived {
  profile: Profile | null
  targets: Targets | null
  plan: DayPlan | null
  /** 当天已吃的合计与各餐分项 */
  stat: ReturnType<typeof dayStat> | null
  /** 近 7 天的窗口统计、结论与自适应 TDEE */
  analysis: Analysis | null
  /** 未启用自适应时的基础目标，用来对照 */
  baseTargets: Targets | null
}

export function allDishesOf(s: AppState): Dish[] {
  return [...DISHES, ...s.customDishes]
}

export function dishMapOf(s: AppState): Map<string, Dish> {
  const m = new Map(DISH_MAP)
  for (const d of s.customDishes) m.set(d.id, d)
  return m
}

/** 与网页版 App.tsx 同一套推导顺序：基础目标 → 分析 → 自适应目标 → 当日推荐 */
export function derive(s: AppState, date: string, now = new Date()): Derived {
  const profile = s.profile
  if (!profile) {
    return { profile: null, targets: null, plan: null, stat: null, analysis: null, baseTargets: null }
  }

  const dishMap = dishMapOf(s)
  const dishes = allDishesOf(s)
  const trainingDay = s.trainingDays.includes(date)

  const baseTargets = computeTargets(profile, now, undefined, { trainingDay })
  const analysis = analyze(profile, baseTargets, s.entries, s.weights, dishMap, date, s.water)
  const targets =
    s.settings.useAdaptiveTdee && analysis.adaptive
      ? computeTargets(profile, now, analysis.adaptive.tdee, { trainingDay })
      : baseTargets

  const stat = dayStat(date, s.entries, dishMap, targets.kcal)
  const eaten: Partial<Record<MealSlot, Nutrients>> = {}
  for (const slot of MEAL_SLOTS) eaten[slot] = stat.bySlot[slot]

  const seeds = s.planSeeds[date] || { day: 0, meals: {} }
  const from = addDays(date, -7)
  const recentEntries: LogEntry[] = s.entries.filter((e) => e.date >= from && e.date <= date)

  const plan = planDay({
    profile,
    targets,
    dishes,
    dishMap,
    date,
    seed: seeds.day,
    mealSeeds: seeds.meals,
    recentEntries,
    adjustments: analysis.adjustments,
    eatenToday: eaten,
  })

  return { profile, targets, plan, stat, analysis, baseTargets }
}
