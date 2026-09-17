/**
 * 称号配方（设计稿 v2 的 Fancy Cat 等价物）：特定组合解锁一个名字，纯文本零美术。
 * 称号在任意时刻判定，一旦达成就永久记进图鉴——所以有些是养到头的终点，有些是成长途中擦身而过的瞬间，
 * 后者正是"再养一只"的理由。判定只看外观，不看时间与次数，保证可复现。
 */
import { MUTATION_SLOTS, isFullyGrown, type CatSpec } from './pixelcat'

export interface CatTitle {
  id: string
  name: string
  /** 未解锁时显示的条件，要能照着凑 */
  hint: string
  match: (spec: CatSpec) => boolean
}

const has = (spec: CatSpec, ...parts: string[]): boolean =>
  parts.every((p) => MUTATION_SLOTS.some((s) => spec[s] === p))
const onlySlot = (spec: CatSpec, slot: (typeof MUTATION_SLOTS)[number]): boolean =>
  MUTATION_SLOTS.every((s) => (s === slot ? spec[s] !== 'none' : spec[s] === 'none'))

export const CAT_TITLES: CatTitle[] = [
  { id: 'flame-dragon', name: '炎龙', hint: '同时长着小龙角、龙翼和焰尾', match: (s) => has(s, 'dragon-horns', 'dragon-wings', 'flame-tail') },
  { id: 'angel', name: '天使', hint: '头顶光环，背后羽翼', match: (s) => has(s, 'halo', 'feathered-wings') },
  { id: 'abyss', name: '深海', hint: '鳍耳、颈膜与分叉尾齐备', match: (s) => has(s, 'fin-ears', 'frill-neck', 'forked-tail-tip') },
  { id: 'forest-deer', name: '林鹿', hint: '鹿角配小狮鬃', match: (s) => has(s, 'antlers', 'small-lion-mane') },
  { id: 'solitary', name: '孤高', hint: '除了额顶的光环，什么都不长', match: (s) => s.crown === 'halo' && onlySlot(s, 'crown') },
  { id: 'complete', name: '圆满', hint: '五个位置全部养到顶', match: isFullyGrown },
]

export const CAT_TITLE_MAP: Record<string, CatTitle> = Object.fromEntries(CAT_TITLES.map((t) => [t.id, t]))

/** 这只猫此刻达成的称号 id */
export function titlesFor(spec: CatSpec): string[] {
  return CAT_TITLES.filter((t) => t.match(spec)).map((t) => t.id)
}

/** 从 prev 变到 next 时新达成的称号（prev 为 null 表示刚孵化） */
export function newTitles(prev: CatSpec | null, next: CatSpec): string[] {
  const before = prev ? new Set(titlesFor(prev)) : new Set<string>()
  return titlesFor(next).filter((id) => !before.has(id))
}
