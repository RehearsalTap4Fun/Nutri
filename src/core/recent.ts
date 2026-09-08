import type { LogEntry, MealSlot } from './types'
import { MEAL_SLOTS } from './types'
import { addDays } from './dates'

export interface FrequentOpts {
  /** 统计最近多少天，默认 30 */
  days?: number
  /** 每个列表最多几道，默认 12 */
  limit?: number
}

function rank(counter: Map<string, { n: number; last: string }>, limit: number): string[] {
  return [...counter].sort((a, b) => b[1].n - a[1].n || b[1].last.localeCompare(a[1].last)).slice(0, limit).map(([id]) => id)
}

function count(entries: LogEntry[], from: string, today: string, slot?: MealSlot): Map<string, { n: number; last: string }> {
  const m = new Map<string, { n: number; last: string }>()
  for (const e of entries) {
    if (!e.dishId || e.date < from || e.date > today) continue
    if (slot && e.slot !== slot) continue
    const key = e.date + (e.time || '')
    const cur = m.get(e.dishId)
    if (cur) { cur.n++; if (key > cur.last) cur.last = key } else m.set(e.dishId, { n: 1, last: key })
  }
  return m
}

/**
 * 常吃的菜（不分餐次）：最近 days 天里按记录次数排，次数相同的最近吃过的在前。
 * 只统计目录里的菜（有 dishId），自定义条目不算。
 */
export function frequentDishes(entries: LogEntry[], today: string, { days = 30, limit = 12 }: FrequentOpts = {}): string[] {
  return rank(count(entries, addDays(today, -days), today), limit)
}

/** 早、中、晚、加餐各自的常吃列表：早餐常吃的包子不会出现在晚餐那一栏 */
export function frequentBySlot(entries: LogEntry[], today: string, { days = 30, limit = 12 }: FrequentOpts = {}): Record<MealSlot, string[]> {
  const from = addDays(today, -days)
  const out = {} as Record<MealSlot, string[]>
  for (const s of MEAL_SLOTS) out[s] = rank(count(entries, from, today, s), limit)
  return out
}
