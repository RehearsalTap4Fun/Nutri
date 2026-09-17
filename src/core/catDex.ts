/**
 * 图鉴：跨猫的收集账本。
 * 用户把成长期定在 7 天（一周一只），长期驱动力就不在单只猫的深度上，而在跨猫收集上——
 * 所以图鉴是主循环的终点，不是附属功能（见 docs/design-creature-growth.md 第 9b 节）。
 *
 * 只记「计数」不记流水：每件部件、每个称号记录它在你养过的猫里出现过几次。
 * 因为异变只进不退，一只猫最多获得同一件部件一次，所以计数即"出现过这件的猫数"。
 */
import { CAT_TITLES, newTitles, titlesFor } from './catTitles'
import { MUTATION_SLOTS, CAT_LINES, type CatSpec } from './pixelcat'

export interface CatDex {
  /** 部件 id → 出现过的猫数 */
  parts: Record<string, number>
  /** 称号 id → 达成过的猫数 */
  titles: Record<string, number>
}

export function emptyDex(): CatDex {
  return { parts: {}, titles: {} }
}

/** 图鉴里一共有多少可收集项（随美术阵容增长，不写死） */
export function dexTotals(): { parts: number; titles: number } {
  const parts = MUTATION_SLOTS.reduce((n, s) => n + Object.values(CAT_LINES[s]).reduce((m, l) => m + l.length, 0), 0)
  return { parts, titles: CAT_TITLES.length }
}

export function dexOwned(dex: CatDex): { parts: number; titles: number } {
  return {
    parts: Object.values(dex.parts).filter((n) => n > 0).length,
    titles: Object.values(dex.titles).filter((n) => n > 0).length,
  }
}

const bump = (rec: Record<string, number>, id: string): Record<string, number> => ({ ...rec, [id]: (rec[id] ?? 0) + 1 })

/**
 * 记一次外观变化：新出现的部件与新达成的称号各 +1。
 * prev 为 null 表示这是刚孵化的猫（它自带的部件也要记）。
 */
export function recordSpec(dex: CatDex, prev: CatSpec | null, next: CatSpec): CatDex {
  let parts = dex.parts
  for (const slot of MUTATION_SLOTS) {
    const value = next[slot]
    if (value === 'none' || (prev && prev[slot] === value)) continue
    parts = bump(parts, value)
  }
  let titles = dex.titles
  for (const id of newTitles(prev, next)) titles = bump(titles, id)
  return { parts, titles }
}

/**
 * 老存档没有图鉴时的补种：按当前猫与历史猫的**最终**外观各记一次。
 * 途中经过又被升掉的部件找不回来了，这是可接受的损失——补种只保证图鉴不是空的。
 */
export function seedDex(specs: readonly CatSpec[]): CatDex {
  let dex = emptyDex()
  for (const spec of specs) dex = recordSpec(dex, null, spec)
  return dex
}

/** 存档里读出来的图鉴是否合法（宽松：只要形状对，未知 id 也留着，方便美术扩容后回填） */
export function isCatDex(x: unknown): x is CatDex {
  if (typeof x !== 'object' || x === null) return false
  const d = x as Record<string, unknown>
  const okRec = (v: unknown) => typeof v === 'object' && v !== null && Object.values(v as Record<string, unknown>).every((n) => typeof n === 'number')
  return okRec(d.parts) && okRec(d.titles)
}

export { titlesFor }
