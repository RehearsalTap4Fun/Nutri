/**
 * 把这次给出的推荐记下来，下次先试着沿用。
 *
 * 「照推荐吃就不重排、吃了别的才重算」靠的就是这份记录：
 * planner 拿到 keep 后先判定沿用还满不满足全天目标，满足就原样留着。
 */
import { useEffect } from 'react'
import type { MealSlot } from '@core/types'
import { MEAL_SLOTS } from '@core/types'
import type { DayPlan, PlanItem } from '@core/planner'
import type { AppState } from './state'

const sig = (items?: PlanItem[]) => (items || []).map((i) => `${i.dishId}:${i.portion}`).join(',')

export function useRememberPlan(
  plan: DayPlan | null,
  date: string,
  picks: AppState['planPicks'],
  update: (fn: (s: AppState) => AppState) => void,
): void {
  useEffect(() => {
    if (!plan) return
    const next: Partial<Record<MealSlot, PlanItem[]>> = {}
    for (const m of plan.meals) next[m.slot] = m.items
    // 没变就不写，免得每次渲染都触发一次状态更新
    const prev = picks[date]
    if (prev && MEAL_SLOTS.every((s) => sig(prev[s]) === sig(next[s]))) return
    update((s) => ({ ...s, planPicks: { ...s.planPicks, [date]: next } }))
  }, [plan, date, picks, update])
}
