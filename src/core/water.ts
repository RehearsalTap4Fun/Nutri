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
