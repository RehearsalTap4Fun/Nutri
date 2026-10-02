/**
 * 狗狗美术访问层：QMonster 狗狗像素包（canine-1.0.0 · pixel）在 nutri 侧的唯一入口，和猫的 catArt.ts 对应。
 *
 * 和猫最大的不同是**合成器**：狗狗包自带 `runtime.mjs`（清除遮罩 → 背后部件 → 主体 → 颈部 + 下巴遮挡 → 额顶），
 * 契约要求消费者原样复用、不另写近似的叠层顺序。所以它被原样复制到 vendor/，摘要由 `npm run caninepack`
 * 对照目录的 runtimeSha256 校验，这里只负责把 nutri 的外观翻译成它要的选择对象。
 *
 * 其余和猫完全同构：六个犬种对应猫的六种毛色（都是孵化定型的身份性状），体型／眼型／表情的取值相同，
 * 五个部件槽的 16 件部件与猫一一对应（打包时逐个犬型核过）。所以成长规则、进化链、品质、图鉴、称号
 * 全部直接复用猫的，这一层不重新定义任何规则。
 */
import catalogJson from '../assets/caninepack/catalog.json'
import metaJson from '../assets/caninepack/meta.json'
import { composeCanine, resolveCanine, type CaninePlan } from './vendor/canineRuntime.mjs'
import type { CatSpecLike } from './catArt'

// 合成器用了 Object.hasOwn（iOS 15.4 起才有）；小程序要支持到 iOS 14，在这里补上，不去改合成器本身
if (typeof (Object as { hasOwn?: unknown }).hasOwn !== 'function') {
  Object.defineProperty(Object, 'hasOwn', { value: (o: object, k: PropertyKey) => Object.prototype.hasOwnProperty.call(o, k), configurable: true, writable: true })
}

interface CompactCanine {
  schemaVersion: 'canine-layer-catalog-v1'
  artVersion: string
  style: 'pixel'
  status: 'approved'
  rendererVersion: 'canine-rgba-v1'
  size: number
  revision: string
  runtimeSha256: string
  bodies: Record<string, { resource: string; profile: string; breed: string; body: string; eyes: string; expression: string }>
  profiles: Record<string, { slots: Record<string, Record<string, string>>; clearMasks: Record<string, string>; headMask: string }>
  resourceIds: string[]
}

export const CANINE = catalogJson as unknown as CompactCanine
export const CANINE_META = metaJson as { artVersion: string; revision: string; rendererVersion: string; runtimeSha256: string; deliverySha256: string; verifiedAt: string }
export const CANINE_SIZE = CANINE.size

/** 犬种：nutri 外观里 `coat` 这一格对狗来说放的就是犬种 */
export const DOG_BREEDS = ['shiba', 'corgi', 'golden-retriever', 'husky', 'dalmatian', 'poodle'] as const
export type DogBreed = (typeof DOG_BREEDS)[number]
export const DOG_NAMES: Record<DogBreed, string> = { shiba: '柴犬', corgi: '柯基', 'golden-retriever': '金毛', husky: '哈士奇', dalmatian: '斑点狗', poodle: '贵宾' }

/** 存进每只狗的美术身份，和猫的 CatArtIdentity 同形 */
export const DOG_ART_IDENTITY = { styleId: 'canine-pixel', artVersion: CANINE.artVersion, revision: CANINE.revision }

/** (犬种, 体型) → 这一对下面有图的眼型与表情。狗狗包是满格的（6 × 3 × 2 × 2 = 72），每一对都闭合 */
function lateralIndex(): Map<string, { eyes: Set<string>; expressions: Set<string> }> {
  const out = new Map<string, { eyes: Set<string>; expressions: Set<string> }>()
  for (const b of Object.values(CANINE.bodies)) {
    const k = `${b.breed}::${b.body}`
    if (!out.has(k)) out.set(k, { eyes: new Set(), expressions: new Set() })
    out.get(k)!.eyes.add(b.eyes)
    out.get(k)!.expressions.add(b.expression)
  }
  return out
}
const LATERAL = lateralIndex()

/**
 * 可孵化的 (犬种, 体型)：和猫一样要求「闭合且横向落点 ≥ 4」——岛内每种眼型 × 表情都有主体图，
 * 否则狗一换表情就画不出来。
 */
export const DOG_IDENTITY_PAIRS: Array<{ coat: string; body: string }> = [...LATERAL.entries()]
  .map(([k, v]) => { const [coat, body] = k.split('::'); return { coat, body, v } })
  .filter(({ coat, body, v }) =>
    (DOG_BREEDS as readonly string[]).includes(coat)
    && v.eyes.size + v.expressions.size >= 4
    && [...v.eyes].every((eyes) => [...v.expressions].every((expression) => dogBodyId({ coat, body, eyes, expression }) !== undefined)))
  .map(({ coat, body }) => ({ coat, body }))

export function dogLateralFor(breed: string, body: string): { eyes: string[]; expressions: string[] } {
  const v = LATERAL.get(`${breed}::${body}`)
  return { eyes: v ? [...v.eyes].sort() : [], expressions: v ? [...v.expressions].sort() : [] }
}

/** 外观 → 狗狗包里的主体 id。按目录字段逐项匹配，不拼字符串（id 的写法不是契约） */
export function dogBodyId(spec: Pick<CatSpecLike, 'coat' | 'body' | 'eyes' | 'expression'>): string | undefined {
  for (const [id, b] of Object.entries(CANINE.bodies)) {
    if (b.breed === spec.coat && b.body === spec.body && b.eyes === spec.eyes && b.expression === spec.expression) return id
  }
  return undefined
}

/** 这只狗画得出来吗，画得出来就给合成计划（合成器的 resolveCanine 不认识的值会抛错，这里收成 null） */
export function dogPlanFor(spec: CatSpecLike): CaninePlan | null {
  const bodyId = dogBodyId(spec)
  if (!bodyId) return null
  try {
    return resolveCanine(CANINE, { bodyId, back: spec.back, tailTip: spec.tailTip, ears: spec.ears, neck: spec.neck, crown: spec.crown })
  } catch {
    return null
  }
}

/** 合成计划里用到的图层 id（主体、清除遮罩、部件、头部分层遮罩） */
export function dogLayersFor(plan: CaninePlan): string[] {
  return [...new Set([plan.body, ...plan.clearMasks, ...plan.behind, ...plan.front, ...(plan.headMask ? [plan.headMask] : [])])]
}

/** 按计划合成一只 64×64 的狗（straight RGBA）。图层由调用方解码好传进来 */
export function composeDog(plan: CaninePlan, layer: (id: string) => Uint8ClampedArray): Uint8ClampedArray {
  const resources: Record<string, Uint8ClampedArray> = {}
  for (const id of dogLayersFor(plan)) resources[id] = layer(id)
  return composeCanine(plan, resources)
}

export type { CaninePlan }
