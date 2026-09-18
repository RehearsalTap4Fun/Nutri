// 健康小管家：首次进入应用是一颗蛋，第一次记录（三餐或喝水）孵化成生物（一次随机定型，
// 不做多阶段孵化进度），之后每次记录再异变一个特征（不叠加进度条，只留看得见的样子变化）。
// 用户可以随时「回炉重造」：当前生物存进历史，重新变回一颗蛋。

import { PIXEL_CAT_RULES, catForCreature, hatchCat, isCatSpec, mutateCat, type CatSpec } from './pixelcat'
import { ART_IDENTITY, artPlanForCat, isCatArtIdentity, type CatArtIdentity } from './catArt'

export const BODIES = ['round', 'egg', 'blob', 'droplet'] as const
export const COLORS = ['coral', 'sage', 'periwinkle', 'amber', 'lilac', 'seafoam', 'blush', 'slate'] as const
export const PATTERNS = ['none', 'spots', 'stripes', 'stars', 'patch'] as const
export const EYES = ['dot', 'sleepy', 'round', 'wink', 'star'] as const
export const MOUTHS = ['smile', 'o', 'cat', 'flat', 'fang'] as const
export const EXTRAS = ['none', 'antenna', 'horn', 'ears', 'tail', 'bow', 'sprout'] as const
/** 性格：孵化时定型，终生不变（回炉重造才会重新随机），只影响气泡台词的语气，不影响外观 */
export const PERSONALITIES = ['energetic', 'gentle', 'bossy', 'cool'] as const

export type Body = (typeof BODIES)[number]
export type Color = (typeof COLORS)[number]
export type Pattern = (typeof PATTERNS)[number]
export type Eyes = (typeof EYES)[number]
export type Mouth = (typeof MOUTHS)[number]
export type Extra = (typeof EXTRAS)[number]
export type Personality = (typeof PERSONALITIES)[number]

export const PERSONALITY_LABEL: Record<Personality, string> = { energetic: '元气', gentle: '温柔', bossy: '傲娇', cool: '高冷' }

export interface CreatureTraits {
  body: Body
  color: Color
  pattern: Pattern
  eyes: Eyes
  mouth: Mouth
  extra: Extra
}

export interface Creature {
  id: string
  traits: CreatureTraits
  personality: Personality
  bornAt: number
  lastMutatedAt: number
  /** 异变次数，纯记录，不当进度条用 */
  mutations: number
  /** 像素猫外观：孵化时定型、每次异变推进一步并写回，规则再改也不影响已经长出来的样子 */
  cat: CatSpec
  /** 长出这只猫用的规则版本（pixelcat.ts 的 PIXEL_CAT_RULES） */
  catRules: string
  /** 画这只猫用的美术包身份，将来换包时能知道它是按哪版画的 */
  catArt: CatArtIdentity
}

export interface RetiredCreature extends Creature {
  retiredAt: number
}

const TRAIT_POOLS = { body: BODIES, color: COLORS, pattern: PATTERNS, eyes: EYES, mouth: MOUTHS, extra: EXTRAS } as const
const TRAIT_KEYS = Object.keys(TRAIT_POOLS) as Array<keyof CreatureTraits>

function pick<T>(arr: readonly T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length) % arr.length]
}

export function randomTraits(rnd: () => number): CreatureTraits {
  return {
    body: pick(BODIES, rnd),
    color: pick(COLORS, rnd),
    pattern: pick(PATTERNS, rnd),
    eyes: pick(EYES, rnd),
    mouth: pick(MOUTHS, rnd),
    extra: pick(EXTRAS, rnd),
  }
}

/** 孵化：一次随机定型，不做渐进式揭露；性格也在这一刻定型，之后不再变；像素猫外观同时定型并存档 */
export function hatch(id: string, now: number, rnd: () => number): Creature {
  return {
    id, traits: randomTraits(rnd), personality: pick(PERSONALITIES, rnd), bornAt: now, lastMutatedAt: now, mutations: 0,
    cat: hatchCat(rnd), catRules: PIXEL_CAT_RULES, catArt: ART_IDENTITY,
  }
}

/**
 * 老存档的形象迁移。按代价从小到大依次尝试：
 *   1. 已经合法且画得出来 → 原样返回，不动一只已经长好的猫。
 *   2. 只是缺了后加的性状（`body`／`eyes`），或表情是已下线的 `tongue-tip` → **就地补齐**。
 *      补出来的都落在「6 毛色 × 标准体型 × 圆眼 × 两种表情」里，而像素包完整覆盖这个范围，
 *      所以这条路总能成功，猫的花纹与已长出的部件全部保留。
 *   3. 实在补不动（存了不认识的部件等）→ 按 id + 异变次数重新推导一只。
 */
export function ensureCat<T extends Creature>(c: T): T {
  const withArt = isCatArtIdentity(c.catArt) ? c : { ...c, catArt: ART_IDENTITY }
  if (isCatSpec(withArt.cat) && typeof withArt.catRules === 'string' && artPlanForCat(withArt.cat)) return withArt

  const raw = (withArt.cat ?? {}) as Partial<CatSpec> & Record<string, unknown>
  const patched = {
    ...raw,
    body: raw.body ?? 'standard',
    eyes: raw.eyes ?? 'round',
    // 'tongue-tip' 是接像素包时下线的表情，老存档里可能还有；用 string 比较避免类型层面被判为不可能
    expression: (raw.expression as string) === 'tongue-tip' || raw.expression === undefined ? 'small-fangs' : raw.expression,
  } as CatSpec
  if (isCatSpec(patched) && artPlanForCat(patched)) return { ...withArt, cat: patched, catRules: PIXEL_CAT_RULES }

  return { ...withArt, cat: catForCreature(c), catRules: PIXEL_CAT_RULES }
}

/** 异变：SVG 特征随机换一个槽；像素猫按只进不退规则推进一步。两者都从存档里的当前值出发，不重放历史 */
export function mutate(c: Creature, now: number, rnd: () => number): Creature {
  const key = pick(TRAIT_KEYS, rnd)
  const pool: readonly string[] = TRAIT_POOLS[key]
  const options = pool.filter((v) => v !== c.traits[key])
  const next = options.length ? pick(options, rnd) : c.traits[key]
  const withCat = ensureCat(c)
  return {
    ...withCat, traits: { ...c.traits, [key]: next }, lastMutatedAt: now, mutations: c.mutations + 1,
    cat: mutateCat(withCat.cat, rnd), catRules: PIXEL_CAT_RULES, catArt: ART_IDENTITY,
  }
}

/** 回炉重造：把当前生物存进历史 */
export function retire(c: Creature, now: number): RetiredCreature {
  return { ...c, retiredAt: now }
}
