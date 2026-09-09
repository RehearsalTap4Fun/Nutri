// 把用户手输、库里没有的食物整理成一份可读的贡献草稿：复制/导出后贴到 GitHub Issue 或发给作者，
// 作者人工审核、确认数值合理后再手动整理进 dishes/*.ts。不联网、不经过任何服务器。
import type { Dish } from './types'
import type { CustomFood } from '../store/storage'
import { dishNutrients, fruitGrams, vegGrams } from './nutrition'

export interface ContributionDraft {
  name: string
  serving: string
  /** 一份的营养值，来自食材构成推导（自建菜）或用户填写的成分表（自定义食物） */
  perServing: { kcal: number; protein: number; fat: number; carbs: number; fiber: number; sodium: number }
  /** 食材构成（仅自建菜有）：作者可以直接核对或改造成 D() 调用 */
  parts?: Array<[string, number]>
  vegG?: number
  fruitG?: number
  /** 包装食品条码，方便作者去 Open Food Facts 核对 */
  barcode?: string
  /** 固定为匿名：不带设备信息、不带用户标识 */
  source: 'anonymous'
}

const round1 = (v: number) => Math.round(v * 10) / 10

function roundedNutrients(n: { kcal: number; protein: number; fat: number; carbs: number; fiber: number; sodium: number }) {
  return { kcal: Math.round(n.kcal), protein: round1(n.protein), fat: round1(n.fat), carbs: round1(n.carbs), fiber: round1(n.fiber), sodium: Math.round(n.sodium) }
}

export function draftForCustomDish(d: Dish): ContributionDraft {
  const veg = Math.round(vegGrams(d))
  const fruit = Math.round(fruitGrams(d))
  return {
    name: d.name,
    serving: d.serving,
    perServing: roundedNutrients(dishNutrients(d)),
    parts: d.parts.map((p): [string, number] => [p.ing, p.g]),
    ...(veg > 0 ? { vegG: veg } : {}),
    ...(fruit > 0 ? { fruitG: fruit } : {}),
    source: 'anonymous',
  }
}

export function draftForCustomFood(f: CustomFood): ContributionDraft {
  return {
    name: f.name,
    serving: f.serving,
    perServing: roundedNutrients(f.nutrients),
    ...(f.vegG ? { vegG: Math.round(f.vegG) } : {}),
    ...(f.fruitG ? { fruitG: Math.round(f.fruitG) } : {}),
    ...(f.barcode ? { barcode: f.barcode } : {}),
    source: 'anonymous',
  }
}

export function contributionText(draft: ContributionDraft): string {
  return JSON.stringify(draft, null, 2)
}
