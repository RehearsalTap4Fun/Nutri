/**
 * QMonster 像素包（pixel-art-catalog-v1）的 nutri 侧消费：按契约「构建期用 SDK 校验，运行时只消费目录与 PNG」。
 * 这里只做纯函数：表现型映射、覆盖查找、按 profile 生成合成计划、缓存键、目录规范 JSON。
 * 语义与 QMonster packages/asset-catalog/src/pixel-art-catalog.ts 逐条对应（resolvePixelArt / phenotypeKey / canonicalJson / pixelArtKey），
 * 改任何一处都要重跑 scripts/pixelPackReplay.ts 的 14 组 RGBA 回放。
 */
import type { CatSpec } from './pixelcat'
import type { PixelOp } from './pixelize'
export type { PixelOp }

export const PIXEL_STYLE_FLAT = 'pixel-flat'
/** nutri 自己的回退风格（毛绒源自动像素化），不在 QMonster 目录里，由 nutri 的存档联合类型承载 */
export const NUTRI_STYLE_PLUSH = 'nutri-pixel-plush-v1'
export const PIXEL_PACK_SIZE = 64

export const PHENOTYPE_TRAITS = ['body', 'coat', 'expression', 'crown', 'ears', 'neck', 'back', 'tailTip'] as const
export type PhenotypeTrait = (typeof PHENOTYPE_TRAITS)[number]
export interface Phenotype {
  schemaVersion: 'feline-phenotype-v1'
  body: string; coat: string; expression: string
  crown: string; ears: string; neck: string; back: string; tailTip: string
}

export type PixelPolygon = number[][]
export interface PixelStep {
  slot: 'back' | 'crown' | 'body' | 'ears' | 'tailTip' | 'neck'
  target: 'frame' | 'subject'
  resources: Record<string, string>
  clear: PixelPolygon[]
  occlusion: PixelPolygon[]
}
export interface PixelProfile { id: string; body: string; coat: string; expression: string; steps: PixelStep[] }
export interface PixelCoverage { id: string; label: string; phenotype: Phenotype; profileId: string; review: 'approved' | 'pending'; rgbaSha256: string }
export interface PixelResource { path: string; sha256: string; width: number; height: number }
export interface PixelCatalog {
  schemaVersion: 'pixel-art-catalog-v1'
  styleId: string
  artVersion: string
  revision: string
  rendererVersion: string
  size: number
  resources: Record<string, PixelResource>
  profiles: PixelProfile[]
  coverage: PixelCoverage[]
  generatable: string[]
  evidence: Record<string, string>
}

/** 存档里的美术身份：覆盖到的用像素包，覆盖不到的整只走 nutri 回退风格 */
export type ArtIdentity =
  | { styleId: typeof PIXEL_STYLE_FLAT; artVersion: string; revision: string }
  | { styleId: typeof NUTRI_STYLE_PLUSH; rules: string }

/** nutri 的 CatSpec → QMonster 表现型；body 目前 nutri 尚未存，默认标准体型 */
export function phenotypeOf(cat: CatSpec, body = 'standard'): Phenotype {
  return {
    schemaVersion: 'feline-phenotype-v1', body, coat: cat.coat, expression: cat.expression,
    crown: cat.crown, ears: cat.ears, neck: cat.neck, back: cat.back, tailTip: cat.tailTip,
  }
}

/** 与 QMonster phenotypeKey 一致：8 个性状按固定顺序的 JSON 数组 */
export function phenotypeKey(p: Phenotype): string {
  return JSON.stringify(PHENOTYPE_TRAITS.map((k) => p[k]))
}

/** 与 QMonster canonicalJson 一致：对象键排序、数组保序、标量走 JSON.stringify */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** 目录 revision 的被签内容：去掉 revision 字段后的规范 JSON（调用方对其做 SHA-256 与 revision 比对） */
export function catalogRevisionInput(catalog: AnyPixelCatalog): string {
  const { revision: _revision, ...content } = catalog
  return canonicalJson(content)
}

/** 与 QMonster pixelArtKey 一致 */
export function pixelArtKey(p: Phenotype, catalog: Pick<PixelCatalog, 'styleId' | 'artVersion' | 'revision'>): string {
  return JSON.stringify([catalog.styleId, catalog.artVersion, catalog.revision, phenotypeKey(p)])
}

/** 轻量结构校验（运行时不带 zod；revision 与 PNG 摘要在构建期由脚本校验） */
export function isPixelCatalog(x: unknown): x is PixelCatalog {
  if (typeof x !== 'object' || x === null) return false
  const c = x as Record<string, unknown>
  return c.schemaVersion === 'pixel-art-catalog-v1' && c.size === PIXEL_PACK_SIZE && typeof c.revision === 'string'
    && typeof c.resources === 'object' && Array.isArray(c.profiles) && Array.isArray(c.coverage) && Array.isArray(c.generatable)
}

/** 只认整份表现型完全一致的覆盖条目；部件 PNG 都在不等于组合已支持 */
export function findCoverage(catalog: PixelCatalog, p: Phenotype): PixelCoverage | null {
  const key = phenotypeKey(p)
  return catalog.coverage.find((c) => phenotypeKey(c.phenotype) === key) ?? null
}

/**
 * 按 profile 的 steps 生成合成计划（与 resolvePixelArt 一致）：
 * 槽位值为 none 整步跳过（含 clear）；body 步用 expression 查资源；有 clear 先推 clear 再推 draw；
 * 资源缺失视为未覆盖，返回 null 而不是拼凑。
 */
export function planPixelArt(catalog: PixelCatalog, p: Phenotype): { ops: PixelOp[]; coverage: PixelCoverage } | null {
  const coverage = findCoverage(catalog, p)
  if (!coverage) return null
  const profile = catalog.profiles.find((x) => x.id === coverage.profileId)
  if (!profile) return null
  const ops: PixelOp[] = []
  for (const s of profile.steps) {
    const selected = s.slot === 'body' ? p.expression : p[s.slot]
    if (selected === 'none') continue
    const layer = s.resources[selected]
    if (!layer || !catalog.resources[layer]) return null
    if (s.clear.length) ops.push({ kind: 'clear', polygons: s.clear })
    ops.push({ kind: 'draw', layer, target: s.target, occlusion: s.occlusion })
  }
  return { ops, coverage }
}

/** 可生成白名单对应的表现型（供未来生长规则参考；nutri 目前不受其限制） */
export function generatablePhenotypes(catalog: PixelCatalog): Phenotype[] {
  return catalog.generatable.map((id) => catalog.coverage.find((c) => c.id === id)?.phenotype).filter((x): x is Phenotype => !!x)
}

// ──────────────────────────────────────────────────────────────────────────
// 像素包 v2（`pixel-art-catalog-v2`，QMonster 1.2.0 起）：表现型必填 `eyes`，
// 九字段键，profile 选择子为 body + coat + eyes + expression，美术身份为 `feline-appearance-v2`。
// 与 v1 严格区分：缺 `eyes` 的数据不是 v2，不做隐式补齐。渲染语义未变，仍复用 composePlan。
// ──────────────────────────────────────────────────────────────────────────

export const PHENOTYPE_TRAITS_V2 = ['body', 'coat', 'eyes', 'expression', 'crown', 'ears', 'neck', 'back', 'tailTip'] as const
export type PhenotypeTraitV2 = (typeof PHENOTYPE_TRAITS_V2)[number]
export interface PhenotypeV2 {
  schemaVersion: 'feline-phenotype-v2'
  body: string; coat: string; eyes: string; expression: string
  crown: string; ears: string; neck: string; back: string; tailTip: string
}

export interface PixelProfileV2 extends Omit<PixelProfile, 'id'> { id: string; eyes: string }
export interface PixelCoverageV2 extends Omit<PixelCoverage, 'phenotype'> { phenotype: PhenotypeV2 }
export interface PixelCatalogV2 extends Omit<PixelCatalog, 'schemaVersion' | 'profiles' | 'coverage'> {
  schemaVersion: 'pixel-art-catalog-v2'
  profiles: PixelProfileV2[]
  coverage: PixelCoverageV2[]
}

export function isPhenotypeV2(x: unknown): x is PhenotypeV2 {
  if (typeof x !== 'object' || x === null) return false
  const p = x as Record<string, unknown>
  return p.schemaVersion === 'feline-phenotype-v2' && PHENOTYPE_TRAITS_V2.every((k) => typeof p[k] === 'string')
}

export function isPixelCatalogV2(x: unknown): x is PixelCatalogV2 {
  if (typeof x !== 'object' || x === null) return false
  const c = x as Record<string, unknown>
  return c.schemaVersion === 'pixel-art-catalog-v2' && c.size === PIXEL_PACK_SIZE && typeof c.revision === 'string'
    && typeof c.resources === 'object' && Array.isArray(c.profiles) && Array.isArray(c.coverage) && Array.isArray(c.generatable)
}

/** 与 QMonster phenotypeKeyV2 一致：九个性状按固定顺序。缺 eyes 的 v1 数据在这里被拒绝，不隐式补齐 */
export function phenotypeKeyV2(p: PhenotypeV2): string {
  if (!isPhenotypeV2(p)) throw new Error('不是 feline-phenotype-v2（eyes 必填）')
  return canonicalJson(PHENOTYPE_TRAITS_V2.map((k) => p[k]))
}

export function pixelArtKeyV2(p: PhenotypeV2, catalog: Pick<PixelCatalogV2, 'styleId' | 'artVersion' | 'revision'>): string {
  return canonicalJson([catalog.styleId, catalog.artVersion, catalog.revision, phenotypeKeyV2(p)])
}

/** nutri 的 CatSpec → v2 表现型。eyes 与 body 目前 nutri 尚未存，必须显式传入，不给默认值 */
export function phenotypeV2Of(cat: CatSpec, body: string, eyes: string): PhenotypeV2 {
  return {
    schemaVersion: 'feline-phenotype-v2', body, coat: cat.coat, eyes, expression: cat.expression,
    crown: cat.crown, ears: cat.ears, neck: cat.neck, back: cat.back, tailTip: cat.tailTip,
  }
}

export function findCoverageV2(catalog: PixelCatalogV2, p: PhenotypeV2): PixelCoverageV2 | null {
  const key = phenotypeKeyV2(p)
  return catalog.coverage.find((c) => phenotypeKeyV2(c.phenotype) === key) ?? null
}

/** 与 resolvePixelArtV2 一致；步骤语义与 v1 相同（none 整步跳过、body 用 expression 查资源、先 clear 再 draw） */
export function planPixelArtV2(catalog: PixelCatalogV2, p: PhenotypeV2): { ops: PixelOp[]; coverage: PixelCoverageV2 } | null {
  const coverage = findCoverageV2(catalog, p)
  if (!coverage) return null
  const profile = catalog.profiles.find((x) => x.id === coverage.profileId)
  if (!profile) return null
  // 选择子必须四项全等，避免拿错 profile
  if (profile.body !== p.body || profile.coat !== p.coat || profile.eyes !== p.eyes || profile.expression !== p.expression) return null
  const ops: PixelOp[] = []
  for (const s of profile.steps) {
    const selected = s.slot === 'body' ? p.expression : p[s.slot]
    if (selected === 'none') continue
    const layer = s.resources[selected]
    if (!layer || !catalog.resources[layer]) return null
    if (s.clear.length) ops.push({ kind: 'clear', polygons: s.clear })
    ops.push({ kind: 'draw', layer, target: s.target, occlusion: s.occlusion })
  }
  return { ops, coverage }
}

// ── 版本无关的薄适配层：脚本用它，各版本的严格校验留在各自实现里 ──

export type AnyPhenotype = Phenotype | PhenotypeV2
export type AnyPixelCatalog = PixelCatalog | PixelCatalogV2 | PixelCatalogV3

export interface PackAdapter {
  version: 1 | 2 | 3
  catalog: AnyPixelCatalog
  traits: readonly string[]
  /** 该包在表现型里表达、但 nutri 的成长规则尚未建模的性状（目前是 eyes） */
  extraTraits: readonly string[]
  keyOf(p: AnyPhenotype): string
  artKeyOf(p: AnyPhenotype): string
  plan(p: AnyPhenotype): { ops: PixelOp[]; coverage: { id: string; label: string; review: string; rgbaSha256: string } } | null
  coverage(): Array<{ id: string; label: string; review: string; rgbaSha256: string; phenotype: AnyPhenotype }>
  generatable(): AnyPhenotype[]
}

/** 打开一个像素包目录：按 schemaVersion 严格分派，不认识的版本直接报错 */
export function openPack(raw: unknown): PackAdapter {
  if (isPixelCatalogV3(raw)) {
    const catalog = raw
    return {
      version: 3, catalog, traits: PHENOTYPE_TRAITS_V2, extraTraits: ['eyes'],
      keyOf: (p) => phenotypeKeyV2(p as PhenotypeV2),
      artKeyOf: (p) => pixelArtKeyV3(p as PhenotypeV2, catalog),
      plan: (p) => planPixelArtV3(catalog, p as PhenotypeV2),
      coverage: () => catalog.coverage,
      generatable: () => catalog.generatable.map((id) => catalog.coverage.find((c) => c.id === id)?.phenotype).filter((x): x is PhenotypeV2 => !!x),
    }
  }
  if (isPixelCatalogV2(raw)) {
    const catalog = raw
    return {
      version: 2, catalog, traits: PHENOTYPE_TRAITS_V2, extraTraits: ['eyes'],
      keyOf: (p) => phenotypeKeyV2(p as PhenotypeV2),
      artKeyOf: (p) => pixelArtKeyV2(p as PhenotypeV2, catalog),
      plan: (p) => planPixelArtV2(catalog, p as PhenotypeV2),
      coverage: () => catalog.coverage,
      generatable: () => catalog.generatable.map((id) => catalog.coverage.find((c) => c.id === id)?.phenotype).filter((x): x is PhenotypeV2 => !!x),
    }
  }
  if (isPixelCatalog(raw)) {
    const catalog = raw
    return {
      version: 1, catalog, traits: PHENOTYPE_TRAITS, extraTraits: [],
      keyOf: (p) => phenotypeKey(p as Phenotype),
      artKeyOf: (p) => pixelArtKey(p as Phenotype, catalog),
      plan: (p) => planPixelArtA(catalog, p as Phenotype),
      coverage: () => catalog.coverage,
      generatable: () => generatablePhenotypes(catalog),
    }
  }
  throw new Error('不认识的像素包 schema（只支持 pixel-art-catalog-v1 / v2 / v3）')
}

/** 内部别名，避免与适配层同名 */
const planPixelArtA = planPixelArt

// ──────────────────────────────────────────────────────────────────────────
// 像素包 v3（`pixel-art-catalog-v3`，QMonster 1.3.0 起）：表现型仍是 `feline-phenotype-v2`（九字段），
// 目录多了 `steps[].variants`——**按性状覆盖该步的渲染层级**（target／clear／occlusion）。
// 它解决的是"同一个槽位里不同部件要画在主体前 / 后"（小狮鬃在前、颈膜在后）。
// 渲染语义没变，仍是 `pixel-rgba-v1`，composePlan 复用。与 v1/v2 严格区分，不做隐式兼容。
// ──────────────────────────────────────────────────────────────────────────

/** 按性状覆盖的渲染方式；缺省时沿用该步自身的 target／clear／occlusion */
export interface PixelVariantRendering {
  target: 'frame' | 'subject'
  clear: PixelPolygon[]
  occlusion: PixelPolygon[]
}
export interface PixelStepV3 extends PixelStep {
  variants?: Record<string, PixelVariantRendering>
}
export interface PixelProfileV3 extends Omit<PixelProfileV2, 'steps'> { steps: PixelStepV3[] }
export interface PixelCatalogV3 extends Omit<PixelCatalogV2, 'schemaVersion' | 'profiles'> {
  schemaVersion: 'pixel-art-catalog-v3'
  profiles: PixelProfileV3[]
}

export function isPixelCatalogV3(x: unknown): x is PixelCatalogV3 {
  if (typeof x !== 'object' || x === null) return false
  const c = x as Record<string, unknown>
  return c.schemaVersion === 'pixel-art-catalog-v3' && c.size === PIXEL_PACK_SIZE && typeof c.revision === 'string'
    && typeof c.resources === 'object' && Array.isArray(c.profiles) && Array.isArray(c.coverage) && Array.isArray(c.generatable)
}

export function findCoverageV3(catalog: PixelCatalogV3, p: PhenotypeV2): PixelCoverageV2 | null {
  const key = phenotypeKeyV2(p)
  return catalog.coverage.find((c) => phenotypeKeyV2(c.phenotype) === key) ?? null
}

export function pixelArtKeyV3(p: PhenotypeV2, catalog: Pick<PixelCatalogV3, 'styleId' | 'artVersion' | 'revision'>): string {
  return canonicalJson([catalog.styleId, catalog.artVersion, catalog.revision, phenotypeKeyV2(p)])
}

/**
 * 与 resolvePixelArtV3 一致。唯一的新增是 `const rendering = step.variants?.[selected] ?? step`：
 * 选中的性状若在 variants 里有条目，就用它的 target／clear／occlusion，否则用该步的默认值。
 */
export function planPixelArtV3(catalog: PixelCatalogV3, p: PhenotypeV2): { ops: PixelOp[]; coverage: PixelCoverageV2 } | null {
  const coverage = findCoverageV3(catalog, p)
  if (!coverage) return null
  const profile = catalog.profiles.find((x) => x.id === coverage.profileId)
  if (!profile) return null
  if (profile.body !== p.body || profile.coat !== p.coat || profile.eyes !== p.eyes || profile.expression !== p.expression) return null
  const ops: PixelOp[] = []
  for (const s of profile.steps) {
    const selected = s.slot === 'body' ? p.expression : p[s.slot]
    if (selected === 'none') continue
    const layer = s.resources[selected]
    if (!layer || !catalog.resources[layer]) return null
    const rendering: PixelVariantRendering = s.variants?.[selected] ?? { target: s.target, clear: s.clear, occlusion: s.occlusion }
    if (rendering.clear.length) ops.push({ kind: 'clear', polygons: rendering.clear })
    ops.push({ kind: 'draw', layer, target: rendering.target, occlusion: rendering.occlusion })
  }
  return { ops, coverage }
}

// ──────────────────────────────────────────────────────────────────────────
// 「岛」：按身份性状（coat、body）切分的独立区域。
// nutri 的性状分两类——身份性状（coat／body）一只猫一生不变，横向性状（eyes／expression）随时会换。
// 所以不同 (coat, body) 之间**不需要互相连通**，但同一个岛内部必须闭合：
// 岛内任何已覆盖状态的任何横向变化，落点都还在岛内，否则猫一换表情就掉出覆盖。
// 这条性质让毛色可以一种一种补、每补完一种立刻可用；nutri 只要限制孵化落在闭合的岛上。
// ──────────────────────────────────────────────────────────────────────────

export interface PackIsland {
  coat: string
  body: string
  /** 岛内已覆盖的状态数 */
  states: number
  /** 岛内出现过的横向取值 */
  eyes: string[]
  expressions: string[]
  /** 闭合：岛内每个状态的每个横向变化都落在岛内（按岛自己的取值集合判定） */
  closed: boolean
  /** 完整：岛的横向取值覆盖了整个目录的并集（比闭合更强，衡量丰富度） */
  full: boolean
  /** 未闭合时具体缺哪些落点（去重后的前若干条，供补图排期） */
  missing: string[]
}

/**
 * 按 (coat, body) 分岛并判定闭合／完整。
 * 只看横向性状的连通性；部件槽位的连通性由 pixelPackCoverage 单独报告，两者互不替代。
 */
export function packIslands(pack: PackAdapter): PackIsland[] {
  const cov = pack.coverage() as unknown as Array<{ phenotype: Record<string, string> }>
  const lateral = ['expression', ...pack.extraTraits] // v1 只有 expression；v2/v3 还有 eyes
  const allValues = new Map<string, Set<string>>()
  for (const t of lateral) allValues.set(t, new Set(cov.map((c) => c.phenotype[t])))

  const groups = new Map<string, Array<Record<string, string>>>()
  for (const c of cov) {
    const key = `${c.phenotype.coat}::${c.phenotype.body}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c.phenotype)
  }

  const islands: PackIsland[] = []
  for (const [key, states] of groups) {
    const [coat, body] = key.split('::')
    const own = new Map<string, Set<string>>()
    for (const t of lateral) own.set(t, new Set(states.map((p) => p[t])))
    const keys = new Set(states.map((p) => pack.keyOf(p as unknown as AnyPhenotype)))
    const missing = new Set<string>()
    for (const p of states) {
      for (const t of lateral) {
        for (const to of own.get(t)!) {
          if (to === p[t]) continue
          const nextKey = pack.keyOf({ ...p, [t]: to } as unknown as AnyPhenotype)
          if (!keys.has(nextKey)) missing.add(nextKey)
        }
      }
    }
    islands.push({
      coat, body, states: states.length,
      eyes: [...(own.get('eyes') ?? [])].sort(),
      expressions: [...own.get('expression')!].sort(),
      closed: missing.size === 0,
      full: lateral.every((t) => own.get(t)!.size === allValues.get(t)!.size),
      missing: [...missing].slice(0, 8),
    })
  }
  return islands.sort((a, b) => a.coat.localeCompare(b.coat) || a.body.localeCompare(b.body))
}

// ──────────────────────────────────────────────────────────────────────────
// 压缩形态：nutri 是单文件应用，装不下完整目录（1.3.1 的 catalog.json 有 1.6MB，
// 其中 coverage 数组占 1.09MB；将来补齐 6 毛色会到 3.8MB 以上）。
//
// 但 coverage 在"格子补满"的目录里，**恰好等于按 profile 槽位映射做笛卡尔积**的结果。
// 实测：1.3.0 与 1.3.1 显式 coverage 与推导集合完全一致；而格子有空洞的 1.2.1 不一致
// （显式 32 vs 推导 100）——所以这个等价性**必须在构建期逐条校验**，不能假定。
// 校验通过后运行时只装 profiles + resources，约 19KB（原 1140KB 的 1.7%）。
//
// 注意：这不是 Codex 拒绝过的「profile 完备」契约变更。目录那边仍然逐条登记、逐条带
// rgbaSha256、逐条可回放；这里只是消费端在**校验过等价之后**的本地压缩。
// ──────────────────────────────────────────────────────────────────────────

/** 压缩目录：去掉 coverage／generatable／evidence，只留渲染必需的部分 */
export type CompactCatalog = Omit<PixelCatalogV3, 'coverage' | 'generatable' | 'evidence'>

export function compactOf(catalog: PixelCatalogV3): CompactCatalog {
  const { coverage: _c, generatable: _g, evidence: _e, ...rest } = catalog
  return rest
}

/** 某 profile 下各异变槽位可选的值（含 none） */
function slotChoices(profile: PixelProfileV3): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const st of profile.steps) if (st.slot !== 'body') out[st.slot] = ['none', ...Object.keys(st.resources)]
  return out
}

const MUTATION_SLOT_ORDER = ['crown', 'ears', 'neck', 'back', 'tailTip'] as const

/**
 * 构建期安全检查：显式 coverage 是否恰好等于按 profile 推导的笛卡尔积。
 * 不等价就不允许压缩——格子有空洞时，推导会把未登记的组合当成已覆盖。
 */
export function coverageEquivalent(catalog: PixelCatalogV3): { ok: boolean; explicit: number; derived: number; onlyExplicit: string[]; onlyDerived: string[] } {
  const pack = openPack(catalog)
  const explicit = new Set(pack.coverage().map((c) => pack.keyOf(c.phenotype)))
  const derived = new Set<string>()
  for (const profile of catalog.profiles) {
    const choices = slotChoices(profile)
    const walk = (i: number, acc: Record<string, string>) => {
      if (i === MUTATION_SLOT_ORDER.length) {
        derived.add(phenotypeKeyV2({
          schemaVersion: 'feline-phenotype-v2', body: profile.body, coat: profile.coat,
          eyes: profile.eyes, expression: profile.expression, ...acc,
        } as PhenotypeV2))
        return
      }
      const slot = MUTATION_SLOT_ORDER[i]
      for (const v of choices[slot] ?? ['none']) walk(i + 1, { ...acc, [slot]: v })
    }
    walk(0, {})
  }
  const onlyExplicit = [...explicit].filter((k) => !derived.has(k))
  const onlyDerived = [...derived].filter((k) => !explicit.has(k))
  return { ok: onlyExplicit.length === 0 && onlyDerived.length === 0, explicit: explicit.size, derived: derived.size, onlyExplicit: onlyExplicit.slice(0, 5), onlyDerived: onlyDerived.slice(0, 5) }
}

/** 运行时的覆盖判定：找到四项全等的 profile，且每个非 none 的部件都在该步的资源里 */
export function findProfileCompact(compact: CompactCatalog, p: PhenotypeV2): PixelProfileV3 | null {
  const profile = compact.profiles.find((x) => x.body === p.body && x.coat === p.coat && x.eyes === p.eyes && x.expression === p.expression)
  if (!profile) return null
  for (const st of profile.steps) {
    const selected = st.slot === 'body' ? p.expression : p[st.slot]
    if (selected === 'none') continue
    if (!(selected in st.resources)) return null
  }
  return profile
}

export function isCoveredCompact(compact: CompactCatalog, p: PhenotypeV2): boolean {
  return findProfileCompact(compact, p) !== null
}

/** 运行时合成计划：与 planPixelArtV3 同语义，只是覆盖判定改为按 profile 推导 */
export function planFromCompact(compact: CompactCatalog, p: PhenotypeV2): PixelOp[] | null {
  const profile = findProfileCompact(compact, p)
  if (!profile) return null
  const ops: PixelOp[] = []
  for (const s of profile.steps) {
    const selected = s.slot === 'body' ? p.expression : p[s.slot]
    if (selected === 'none') continue
    const layer = s.resources[selected]
    if (!layer || !compact.resources[layer]) return null
    const rendering: PixelVariantRendering = s.variants?.[selected] ?? { target: s.target, clear: s.clear, occlusion: s.occlusion }
    if (rendering.clear.length) ops.push({ kind: 'clear', polygons: rendering.clear })
    ops.push({ kind: 'draw', layer, target: rendering.target, occlusion: rendering.occlusion })
  }
  return ops
}

/**
 * 运行时的岛报告：只看 profiles。格子补满是压缩形态的前提，所以岛是否闭合
 * 只取决于 (eyes × expression) 是否成完整矩阵。
 */
export function islandsFromProfiles(compact: CompactCatalog): PackIsland[] {
  const groups = new Map<string, PixelProfileV3[]>()
  for (const p of compact.profiles) {
    const key = `${p.coat}::${p.body}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }
  const allEyes = new Set(compact.profiles.map((p) => p.eyes))
  const allExpr = new Set(compact.profiles.map((p) => p.expression))
  const islands: PackIsland[] = []
  for (const [key, profiles] of groups) {
    const [coat, body] = key.split('::')
    const eyes = [...new Set(profiles.map((p) => p.eyes))].sort()
    const expressions = [...new Set(profiles.map((p) => p.expression))].sort()
    const have = new Set(profiles.map((p) => `${p.eyes}::${p.expression}`))
    const missing: string[] = []
    for (const e of eyes) for (const x of expressions) if (!have.has(`${e}::${x}`)) missing.push(`${coat}/${body}/${e}/${x}`)
    const states = profiles.reduce((n, p) => n + Object.values(slotChoices(p)).reduce((m, c) => m * c.length, 1), 0)
    islands.push({
      coat, body, states, eyes, expressions,
      closed: missing.length === 0,
      full: eyes.length === allEyes.size && expressions.length === allExpr.size,
      missing: missing.slice(0, 8),
    })
  }
  return islands.sort((a, b) => a.coat.localeCompare(b.coat) || a.body.localeCompare(b.body))
}

/**
 * 可孵化的岛：闭合，且横向取值够多。
 * 「够多」= 表情数 + 眼型数 ≥ 4，即每个状态至少有 2 个横向落点——
 * 只有 1 个落点时，横向变化会变成机械交替 A→B→A→B，读起来不像"变化"。
 */
export function hatchableIslands(compact: CompactCatalog): PackIsland[] {
  return islandsFromProfiles(compact).filter((i) => i.closed && i.expressions.length + i.eyes.length >= 4)
}
