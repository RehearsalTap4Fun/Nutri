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
export function catalogRevisionInput(catalog: PixelCatalog): string {
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
