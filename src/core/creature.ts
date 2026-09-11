// 健康小管家：首次进入应用是一颗蛋，第一次记录（三餐或喝水）孵化成生物（一次随机定型，
// 不做多阶段孵化进度），之后每次记录再异变一个特征（不叠加进度条，只留看得见的样子变化）。
// 用户可以随时「回炉重造」：当前生物存进历史，重新变回一颗蛋。

export const BODIES = ['round', 'egg', 'blob', 'droplet'] as const
export const COLORS = ['coral', 'sage', 'periwinkle', 'amber', 'lilac', 'seafoam', 'blush', 'slate'] as const
export const PATTERNS = ['none', 'spots', 'stripes', 'stars', 'patch'] as const
export const EYES = ['dot', 'sleepy', 'round', 'wink', 'star'] as const
export const MOUTHS = ['smile', 'o', 'cat', 'flat', 'fang'] as const
export const EXTRAS = ['none', 'antenna', 'horn', 'ears', 'tail', 'bow'] as const
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

/** 孵化：一次随机定型，不做渐进式揭露；性格也在这一刻定型，之后不再变 */
export function hatch(id: string, now: number, rnd: () => number): Creature {
  return { id, traits: randomTraits(rnd), personality: pick(PERSONALITIES, rnd), bornAt: now, lastMutatedAt: now, mutations: 0 }
}

/** 异变：随机挑一个特征槽，换成一个跟当前不同的新值，保证肉眼看得出变化 */
export function mutate(c: Creature, now: number, rnd: () => number): Creature {
  const key = pick(TRAIT_KEYS, rnd)
  const pool: readonly string[] = TRAIT_POOLS[key]
  const options = pool.filter((v) => v !== c.traits[key])
  const next = options.length ? pick(options, rnd) : c.traits[key]
  return { ...c, traits: { ...c.traits, [key]: next }, lastMutatedAt: now, mutations: c.mutations + 1 }
}

/** 回炉重造：把当前生物存进历史 */
export function retire(c: Creature, now: number): RetiredCreature {
  return { ...c, retiredAt: now }
}
