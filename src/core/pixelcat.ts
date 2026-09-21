/**
 * 健康小管家的形象与成长规则。
 *
 * 性状分三类，这个分类决定了覆盖要求，也决定了孵化能落在哪：
 *   - **身份**（`coat`、`body`）：孵化定型、一生不变。所以不同取值之间不需要互相连通。
 *   - **横向**（`eyes`、`expression`）：随时会换。所以同一身份下的所有取值都必须有美术，
 *     否则猫一换就画不出来——`catArt.ts` 的「可孵化的岛」就是在保证这件事。
 *   - **成长**（额顶／耳／颈／背／尾）：每笔记录推进，**只进不退**，沿进化链升一阶
 *     （N 普通 → R 稀有 → L 传说），不会变回没有、不会降级、同阶不互换。
 *
 * 成长节奏见 `upgradeChance`：升级概率随已升阶数递减，没升级的那些笔做横向变化，
 * 所以每记一笔都有看得见的变化，满级之后也是。
 *
 * 形象素材来自 QMonster 像素包（见 `catArt.ts`）。孵化只落在可孵化的岛上，
 * 这条保证一只猫终其一生都画得出来。
 */
import { ART_EYES, ART_EXPRESSIONS, ART_IDENTITY_PAIRS, artLateralFor } from './catArt'
import { hashString, makeRng, weightedPick } from './rng'

/**
 * 规则版本：写进存档，规则再改时能知道一只猫是按哪版长出来的。
 * v1=均匀随机；v2=品质分层只进不退（同级可互换）；v3=进化链，沿链升一阶、同阶不互换、顶阶只能升不能生；
 * v4=接入 QMonster 像素包：性状加 `body`／`eyes`、去掉 `tongue-tip`、孵化限制在可孵化的岛上；
 * v5=像素包 1.6.1 的五件新部件入列（晶角／羽翅耳／星辉翼耳／日冕颈饰／凤凰尾），成长深度 10 → 15 阶。
 * v5 只扩阵容，成长机制一个字没改；老猫不迁移，下次异变时自然带上新号（`ensureCat` 不比对版本，
 * 只要求这个字段是字符串）。已经「长齐」的猫会重新变得可成长——这正是补阵容要的效果。
 * **规则实质变化时必须升这个号**，否则同一个字符串会描述两套不同的规则，这个字段就失去意义了。
 */
export const PIXEL_CAT_RULES = 'pixelcat-rules-v5'

export const CAT_COATS = ['brown-tabby', 'orange-white', 'tuxedo', 'calico', 'colorpoint', 'rosetted'] as const
/** 体型：与花纹同为身份性状，孵化定型后一生不变 */
export const CAT_BODIES = ['standard', 'shortleg-round', 'slender-tall'] as const
export const CAT_SLOT_OPTIONS = {
  /** 眼型与表情是横向性状：无品质高低，提供满级之后的持续变化 */
  eyes: ['round', 'sleepy-almond'],
  expression: ['parted-mouth', 'small-fangs'],
  crown: ['none', 'dragon-horns', 'antlers', 'crystal-horns', 'halo'],
  ears: ['none', 'fin-ears', 'feathered-ears', 'celestial-ears'],
  neck: ['none', 'small-lion-mane', 'frill-neck', 'sunburst-ruff'],
  back: ['none', 'small-wings', 'feathered-wings', 'dragon-wings'],
  tailTip: ['none', 'forked-tail-tip', 'flame-tail', 'phoenix-tail'],
} as const

export type CatCoat = (typeof CAT_COATS)[number]
export type CatBody = (typeof CAT_BODIES)[number]
export type CatSlot = keyof typeof CAT_SLOT_OPTIONS
export type CatSpec = { coat: CatCoat; body: CatBody } & { [K in CatSlot]: (typeof CAT_SLOT_OPTIONS)[K][number] }
export type CatMutation = Exclude<CatSpec['crown' | 'ears' | 'neck' | 'back' | 'tailTip'], 'none'>

/** 身份性状：孵化定型，一生不变 */
export const IDENTITY_TRAITS = ['coat', 'body'] as const
/** 横向性状：随时可换，无优劣 */
export const LATERAL_SLOTS = ['eyes', 'expression'] as const satisfies readonly CatSlot[]

/** 每次记录可能变化的槽位（身份性状不在其中） */
export const MUTABLE_SLOTS = ['eyes', 'expression', 'crown', 'ears', 'neck', 'back', 'tailTip'] as const satisfies readonly CatSlot[]
export const MUTATION_SLOTS = ['crown', 'ears', 'neck', 'back', 'tailTip'] as const
export type MutationSlot = (typeof MUTATION_SLOTS)[number]

/**
 * 品质分层，与孵化器 mutations.ts 登记表一致：现有 6 件小件为 N，批次 1 的颈膜/羽翼/焰尾为 R，光环/龙翼为 L；
 * 像素包 1.6.1 的五件按 QMonster 审批档位入列（晶角/羽翅耳 R，星辉翼耳/日冕颈饰/凤凰尾 L）。
 */
export type CatTier = 'N' | 'R' | 'L'
export const CAT_TIER: Record<CatMutation, CatTier> = {
  'dragon-horns': 'N', antlers: 'N', 'fin-ears': 'N', 'small-lion-mane': 'N', 'small-wings': 'N', 'forked-tail-tip': 'N',
  'frill-neck': 'R', 'feathered-wings': 'R', 'flame-tail': 'R', 'crystal-horns': 'R', 'feathered-ears': 'R',
  halo: 'L', 'dragon-wings': 'L', 'celestial-ears': 'L', 'sunburst-ruff': 'L', 'phoenix-tail': 'L',
}
export const TIER_NAMES: Record<CatTier, string> = { N: '普通', R: '稀有', L: '传说' }
/** 升级抽取权重：高品质更难抽到 */
const TIER_WEIGHT: Record<CatTier, number> = { N: 70, R: 25, L: 5 }
const TIER_RANK: Record<CatTier | 'none', number> = { none: 0, N: 1, R: 2, L: 3 }

/**
 * 进化链（设计稿 v2）：槽位内的有序序列，异变沿链升一阶，读起来是「翅膀长大了」而不是「换了个部件」。
 * 缺阶自动跳过：升级取「当前阶之上、本槽位内存在的最低阶」，所以美术没补齐时体系照常运转
 * （额顶目前只有 N 和 L，就是 none→N→L 两步）。同链优先，同阶不互换。
 */
export const CAT_LINES: Record<MutationSlot, Record<string, CatMutation[]>> = {
  crown: { horn: ['dragon-horns', 'crystal-horns'], antler: ['antlers'], light: ['halo'] },
  ears: { fin: ['fin-ears'], plume: ['feathered-ears', 'celestial-ears'] },
  neck: { mane: ['small-lion-mane', 'frill-neck'], corona: ['sunburst-ruff'] },
  back: { wing: ['small-wings', 'feathered-wings', 'dragon-wings'] },
  tailTip: { flame: ['forked-tail-tip', 'flame-tail', 'phoenix-tail'] },
}
export const CAT_LINE_NAMES: Record<string, string> = {
  horn: '角', antler: '鹿', light: '光', fin: '鳍', plume: '羽', mane: '鬃', corona: '冕', wing: '翼', flame: '焰',
}

/** 某部件属于哪条链 */
export function lineOf(slot: MutationSlot, value: string): string | null {
  for (const [line, parts] of Object.entries(CAT_LINES[slot])) if ((parts as string[]).includes(value)) return line
  return null
}

/**
 * 某槽位的品质阶梯：该槽位实际存在的品质档，从低到高。
 * 额顶目前只有 N 和 L（缺 R），阶梯就是 [N, L]，所以 none→N→L 是**两步**而不是三步——
 * 「升了几阶」要按阶梯位置数，不能按品质档位数，否则缺阶时会算多。
 */
export function slotLadder(slot: MutationSlot): number[] {
  const tiers = new Set<number>()
  for (const parts of Object.values(CAT_LINES[slot])) for (const v of parts) tiers.add(tierRank(v))
  return [...tiers].sort((a, b) => a - b)
}

/** 某槽位当前值处在阶梯的第几步（空槽 0） */
export function slotStep(slot: MutationSlot, value: string): number {
  if (value === 'none') return 0
  return slotLadder(slot).indexOf(tierRank(value)) + 1
}

/** 一只猫从空槽走到顶最多能升几次（由部件数量决定，与登记/渲染无关） */
export function maxGrowthSteps(): number {
  return MUTATION_SLOTS.reduce((sum, slot) => sum + slotLadder(slot).length, 0)
}

/** 是否所有异变位都到顶 */
export function isFullyGrown(spec: CatSpec): boolean {
  return MUTATION_SLOTS.every((s) => upgradesFor(s, spec[s]).length === 0)
}

export function tierRank(value: string): number {
  return value === 'none' ? 0 : TIER_RANK[CAT_TIER[value as CatMutation]] ?? 0
}

/**
 * 某位置从 current 出发允许升到的部件：**品质严格更高**（同阶不互换，那不是成长），
 * 且只取「高于当前的最低那一阶」——即沿链升一格，不跳级。
 */
export function upgradesFor(slot: MutationSlot, current: string): CatMutation[] {
  const rank = tierRank(current)
  const higher = (CAT_SLOT_OPTIONS[slot] as readonly string[]).filter((v): v is CatMutation => v !== 'none' && tierRank(v) > rank)
  if (higher.length === 0) return []
  const nextRank = Math.min(...higher.map((v) => tierRank(v)))
  return higher.filter((v) => tierRank(v) === nextRank)
}

/** 升一阶：同链优先，没有同链的下一阶才跨链；同阶多选按品质加权 */
function pickUpgrade(slot: MutationSlot, current: string, rnd: () => number): CatMutation {
  const options = upgradesFor(slot, current)
  const line = current === 'none' ? null : lineOf(slot, current)
  const sameLine = line ? options.filter((v) => lineOf(slot, v) === line) : []
  const pool = sameLine.length > 0 ? sameLine : options
  const idx = weightedPick(pool.map((v) => TIER_WEIGHT[CAT_TIER[v]]), rnd)
  return pool[Math.max(0, idx)]
}

/**
 * 成长节奏（设计稿 v2，用户定的 7 天）：每笔记录必有一次可见变化，其中「升级」的概率随已升阶数递减，
 * 其余是横向变化（换表情）。衰减参数 9 是按目标阵容（18 阶）反推的——
 * 阵容补齐时自然落到约 35 笔／7 天；阵容不全时周期按比例变短，而不是让没升级的笔空转。
 */
export const GROWTH_DECAY = 9
/** 空槽权重：广度优先，先让猫长齐再让它长强 */
export const EMPTY_SLOT_WEIGHT = 3

/** 已升阶数 = 各异变位在自己阶梯上走了几步之和 */
export function growthSteps(spec: CatSpec): number {
  return MUTATION_SLOTS.reduce((n, s) => n + slotStep(s, spec[s]), 0)
}

export function upgradeChance(spec: CatSpec): number {
  return 1 / (1 + growthSteps(spec) / GROWTH_DECAY)
}

export const CAT_NAMES: Record<string, string> = {
  'brown-tabby': '棕虎斑', 'orange-white': '橘白', tuxedo: '燕尾服', calico: '三花', colorpoint: '重点色', rosetted: '金豹点',
  standard: '标准', 'shortleg-round': '短腿圆身', 'slender-tall': '修长高挑',
  round: '圆眼', 'sleepy-almond': '半眯眼',
  'parted-mouth': '微张嘴', 'small-fangs': '小牙',
  'dragon-horns': '小龙角', antlers: '鹿角', 'crystal-horns': '晶角', halo: '光环',
  'fin-ears': '鳍耳', 'feathered-ears': '羽翅耳', 'celestial-ears': '星辉翼耳',
  'small-lion-mane': '小狮鬃', 'frill-neck': '颈膜', 'sunburst-ruff': '日冕颈饰',
  'small-wings': '小翅膀', 'feathered-wings': '羽翼', 'dragon-wings': '龙翼',
  'forked-tail-tip': '分叉尾', 'flame-tail': '焰尾', 'phoenix-tail': '凤凰尾',
}
export const CAT_SLOT_NAMES: Record<CatSlot, string> = { eyes: '眼型', expression: '表情', crown: '额顶', ears: '耳朵', neck: '颈部', back: '背部', tailTip: '尾巴' }

function pick<T>(arr: readonly T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length) % arr.length]
}

/**
 * 横向变化：在眼型／表情里挑一个，换成该岛支持的另一个取值。
 * 满级之后每笔记录仍然看得见变化，靠的就是这个。取值要跟岛的能力取交集——
 * 岛里没有的取值画不出来，不能凭规则硬给。
 */
function lateralChange(spec: CatSpec, rnd: () => number): CatSpec {
  const available = artLateralFor(spec.coat, spec.body)
  const pools: Record<string, readonly string[]> = { eyes: available.eyes, expression: available.expressions }
  const usable = LATERAL_SLOTS.filter((s) => pools[s].filter((v) => v !== spec[s]).length > 0)
  if (usable.length === 0) return spec // 该岛没有可换的横向取值（理论上不会发生，可孵化的岛都 ≥2 个落点）
  const slot = pick(usable, rnd)
  return { ...spec, [slot]: pick(pools[slot].filter((v) => v !== spec[slot]), rnd) }
}

/**
 * 异变：每笔记录必有一次可见变化。
 * 先按 `upgradeChance` 掷是否升级；升级时在「还有得升」的位置里挑一个（空槽权重 ×3，广度优先），
 * 沿进化链升一阶，只进不退；不升级、或所有位置都满了，就做横向变化（换眼型或表情）。
 */
export function mutateCat(spec: CatSpec, rnd: () => number): CatSpec {
  const open = MUTATION_SLOTS.filter((s) => upgradesFor(s, spec[s]).length > 0)
  if (open.length === 0 || rnd() >= upgradeChance(spec)) return lateralChange(spec, rnd)
  const idx = weightedPick(open.map((s) => (spec[s] === 'none' ? EMPTY_SLOT_WEIGHT : 1)), rnd)
  const slot = open[Math.max(0, idx)]
  return { ...spec, [slot]: pickUpgrade(slot, spec[slot], rnd) }
}

/**
 * 孵化：身份性状（花纹＋体型）从**可孵化的岛**里随机挑一对，横向性状在该岛支持的取值里挑；
 * 一半概率自带一件异变（按品质加权，只可能是入口阶）。
 *
 * 为什么必须从岛里挑：身份性状一生不变，所以孵化那一刻就决定了这只猫余生能不能画出来。
 * 落在没有美术的身份上，等于生下一只永远画不出来的猫。
 */
export function hatchCat(rnd: () => number): CatSpec {
  const pair = pick(ART_IDENTITY_PAIRS, rnd)
  const available = artLateralFor(pair.coat, pair.body)
  let spec: CatSpec = {
    coat: pair.coat as CatCoat,
    body: pair.body as CatBody,
    eyes: pick(available.eyes.length ? available.eyes : ART_EYES, rnd) as CatSpec['eyes'],
    expression: pick(available.expressions.length ? available.expressions : ART_EXPRESSIONS, rnd) as CatSpec['expression'],
    crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none',
  }
  // 一半概率自带一件异变（只可能是入口阶，顶阶只能升不能生）
  if (rnd() < 0.5) {
    const slot = pick(MUTATION_SLOTS, rnd)
    if (upgradesFor(slot, 'none').length > 0) spec = { ...spec, [slot]: pickUpgrade(slot, 'none', rnd) }
  }
  return spec
}

/**
 * 老存档兼容：没存过 spec 的小管家，由 id + 异变次数按当前规则推导一次（之后写进存档，不再重算）。
 * 同一 id 的随机流固定，第 k 次异变的结果是前缀确定的。这个函数的行为要保持稳定，改它会让还没迁移的老猫换样。
 */
export function catForCreature(c: { id: string; mutations: number }): CatSpec {
  const rnd = makeRng(hashString(`pixelcat|${c.id}`))
  let spec = hatchCat(rnd)
  for (let i = 0; i < Math.max(0, c.mutations); i++) spec = mutateCat(spec, rnd)
  return spec
}

/** 存档里读出来的 spec 是否合法（每个槽位都在当前选项池里；不认识的值一律视为非法，重新推导） */
export function isCatSpec(x: unknown): x is CatSpec {
  if (typeof x !== 'object' || x === null) return false
  const o = x as Record<string, unknown>
  if (!(CAT_COATS as readonly string[]).includes(o.coat as string)) return false
  if (!(CAT_BODIES as readonly string[]).includes(o.body as string)) return false
  return (Object.keys(CAT_SLOT_OPTIONS) as CatSlot[]).every((slot) => (CAT_SLOT_OPTIONS[slot] as readonly string[]).includes(o[slot] as string))
}

/** 缓存键：外观的全部信息 */
export function catKey(spec: CatSpec): string {
  return [spec.coat, spec.body, spec.eyes, spec.expression, spec.crown, spec.ears, spec.neck, spec.back, spec.tailTip].join('|')
}

export function describeCat(spec: CatSpec): string {
  const parts = [CAT_NAMES[spec.coat], CAT_NAMES[spec.body], CAT_NAMES[spec.eyes]]
  for (const slot of MUTATION_SLOTS) if (spec[slot] !== 'none') parts.push(CAT_NAMES[spec[slot]])
  return parts.join(' · ')
}

/** 部件名，稀有/传说带品质后缀 */
export function mutationLabel(value: CatMutation): string {
  const tier = CAT_TIER[value]
  return tier === 'N' ? CAT_NAMES[value] : `${CAT_NAMES[value]}（${TIER_NAMES[tier]}）`
}

/** 一句话说清这次变了什么；没变返回 null */
export function catDiff(prev: CatSpec, next: CatSpec): string | null {
  for (const slot of MUTABLE_SLOTS) {
    if (prev[slot] === next[slot]) continue
    if (slot === 'eyes' || slot === 'expression') return `${CAT_SLOT_NAMES[slot]}变成${CAT_NAMES[next[slot]]}`
    const from = prev[slot]
    const to = next[slot]
    if (to === 'none') return `${CAT_NAMES[from]}消失了` // 规则上不再发生，留作兜底
    if (from === 'none') return `长出了${mutationLabel(to)}`
    if (tierRank(to) > tierRank(from)) return `${CAT_NAMES[from]}进化成了${mutationLabel(to)}`
    return `${CAT_NAMES[from]}换成了${mutationLabel(to)}`
  }
  return null
}
