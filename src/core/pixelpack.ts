/**
 * QMonster 像素包（pixel-art-catalog-v1）的 nutri 侧消费：按契约「构建期用 SDK 校验，运行时只消费目录与 PNG」。
 * 这里只做纯函数：表现型映射、覆盖查找、按 profile 生成合成计划、缓存键、目录规范 JSON。
 * 语义与 QMonster packages/asset-catalog/src/pixel-art-catalog.ts 逐条对应（resolvePixelArt / phenotypeKey / canonicalJson / pixelArtKey），
 * 改任何一处都要重跑 scripts/pixelPackReplay.ts 的 14 组 RGBA 回放。
 */
import type { CatSpec } from './pixelcat'
import type { PixelOp } from './pixelize'

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
export type AnyPixelCatalog = PixelCatalog | PixelCatalogV2

export interface PackAdapter {
  version: 1 | 2
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
  throw new Error('不认识的像素包 schema（只支持 pixel-art-catalog-v1 / v2）')
}

/** 内部别名，避免与适配层同名 */
const planPixelArtA = planPixelArt
