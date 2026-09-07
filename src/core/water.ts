import type { Dish, LogEntry, WaterEntry } from './types'

/** 某天记录的饮水 ml */
export function waterOnDate(entries: WaterEntry[], date: string): number {
  return entries.filter((e) => e.date === date).reduce((s, e) => s + e.ml, 0)
}

/** 某天餐食记录里饮品类菜品的液体量（g ≈ ml），如牛奶、豆浆、咖啡、奶茶 */
export function fluidFromDrinks(entries: LogEntry[], dishMap: Map<string, Dish>, date: string): number {
  let ml = 0
  for (const e of entries) {
    if (e.date !== date || !e.dishId) continue
    const d = dishMap.get(e.dishId)
    if (!d || d.cat !== 'drink') continue
    ml += d.parts.reduce((s, p) => s + p.g, 0) * e.portion
  }
  return Math.round(ml)
}

/** 近 n 天里有饮水记录的日均 ml；一天都没记返回 0 */
export function avgWater(entries: WaterEntry[], dates: string[]): { avg: number; days: number } {
  const perDay = dates.map((d) => waterOnDate(entries, d)).filter((v) => v > 0)
  if (!perDay.length) return { avg: 0, days: 0 }
  return { avg: Math.round(perDay.reduce((s, v) => s + v, 0) / perDay.length), days: perDay.length }
}

/** 目标拆成杯：每杯 200 ml，最后一杯可能不满 */
export function cups(ml: number, target: number, cupMl = 200): Array<'full' | 'half' | 'empty'> {
  const n = Math.max(1, Math.ceil(target / cupMl))
  const out: Array<'full' | 'half' | 'empty'> = []
  for (let i = 0; i < n; i++) {
    const lo = i * cupMl
    if (ml >= lo + cupMl) out.push('full')
    else if (ml > lo) out.push('half')
    else out.push('empty')
  }
  return out
}

/** 一杯 250 ml；喝水窗口 8:00~22:00，把窗口均分给每一杯，第 i 杯的「应喝完」时刻就是窗口的 i/n 处 */
export const CUP_ML = 250
export const WATER_START_H = 8
export const WATER_END_H = 22

/** 目标折成杯数：向上取整，至少 1 杯 */
export function cupCount(targetMl: number, cupMl = CUP_ML): number {
  return Math.max(1, Math.ceil(targetMl / cupMl))
}

/** 每杯的应喝完时刻（小时，可带小数），如 7 杯 → [10, 12, 14, 16, 18, 20, 22] */
export function cupDueHours(n: number, startH = WATER_START_H, endH = WATER_END_H): number[] {
  const span = endH - startH
  return Array.from({ length: n }, (_, i) => Math.round((startH + (span * (i + 1)) / n) * 100) / 100)
}

/** 当前时刻应该已经喝到第几杯（到点即算） */
export function cupsDueAt(hour: number, n: number, startH = WATER_START_H, endH = WATER_END_H): number {
  return cupDueHours(n, startH, endH).filter((h) => hour >= h).length
}

/** 口渴程度：到点还没喝的杯数（0 表示不渴） */
export function thirst(litCups: number, hour: number, n: number, startH = WATER_START_H, endH = WATER_END_H): number {
  return Math.max(0, cupsDueAt(hour, n, startH, endH) - litCups)
}

/** 小时数 → 「10点」「13:30」 */
export function fmtHour(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm === 0 ? `${hh}点` : `${hh}:${String(mm).padStart(2, '0')}`
}
