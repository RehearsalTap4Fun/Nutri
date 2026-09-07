import type { Dish, DishCategory } from '../core/types'
import type { CustomFood } from '../store/storage'

export type FoodPick = { kind: 'dish'; dish: Dish } | { kind: 'custom'; food: CustomFood }

/** 搜菜名/自定义食物：记录时（LogSheet）与查「能不能吃」（CanIEat）共用同一套排序 */
export function searchFoods(q: string, cat: DishCategory | 'all', dishes: Dish[], customFoods: CustomFood[], favorites: string[], recent: string[], dishMap: Map<string, Dish>): FoodPick[] {
  const query = q.trim().toLowerCase()
  const out: FoodPick[] = []
  if (!query) {
    if (cat === 'all') {
      const ids = [...new Set([...recent, ...favorites])]
      for (const id of ids) { const d = dishMap.get(id); if (d) out.push({ kind: 'dish', dish: d }) }
      for (const f of customFoods.slice(0, 6)) out.push({ kind: 'custom', food: f })
      if (out.length) return out
      // 首次使用：展示常见家常菜
      return dishes.filter((d) => d.cuisine === 'cn').slice(0, 40).map((d) => ({ kind: 'dish', dish: d }))
    }
    return dishes.filter((d) => d.cat === cat).map((d) => ({ kind: 'dish', dish: d }))
  }
  const scored: Array<{ s: number; p: FoodPick }> = []
  for (const d of dishes) {
    if (cat !== 'all' && d.cat !== cat) continue
    const name = d.name.toLowerCase()
    let s = 0
    if (name === query) s = 100
    else if (name.startsWith(query)) s = 80
    else if (name.includes(query)) s = 60
    else if (d.aliases?.some((a) => a.toLowerCase().includes(query))) s = 40
    else if (query.length >= 2 && [...query].every((ch) => name.includes(ch))) s = 20
    if (s) scored.push({ s: s + (favorites.includes(d.id) ? 5 : 0) + (recent.includes(d.id) ? 3 : 0), p: { kind: 'dish', dish: d } })
  }
  for (const f of customFoods) if (f.name.toLowerCase().includes(query)) scored.push({ s: 70, p: { kind: 'custom', food: f } })
  scored.sort((a, b) => b.s - a.s)
  return scored.slice(0, 60).map((x) => x.p)
}
