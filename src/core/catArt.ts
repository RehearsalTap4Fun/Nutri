/**
 * 美术访问层：小管家的形象由 QMonster 像素包提供，这里是 nutri 侧的唯一入口。
 *
 * 装的是**压缩目录**（只有 profiles + resources，59.6 KB）而不是完整目录（4 MB）。
 * 压缩的合法性由 `npm run pixelpack` 在打包前逐条校验：目录 revision、每张 PNG 的摘要与
 * 二值 alpha、全部 coverage 的 RGBA 逐字节回放、显式 coverage ≡ profile 推导集合、
 * 压缩目录与完整目录给出相同计划。五项任一不过就拒绝打包，所以运行时可以信任推导。
 *
 * 这一层只读目录、不碰 DOM，图层的 URL 由 UI 层用 import.meta.glob 取（Node 测试才跑得起来）。
 */
import catalogJson from '../assets/pixelpack/catalog.json'
import metaJson from '../assets/pixelpack/meta.json'
import { hatchableIslands, islandsFromProfiles, planFromCompact, type CompactCatalog, type PackIsland, type PhenotypeV2, type PixelOp } from './pixelpack'

export const PACK: CompactCatalog = catalogJson as unknown as CompactCatalog
export const PACK_META = metaJson as { artVersion: string; revision: string; rendererVersion: string; verifiedAt: string }

/** 原生像素尺寸与显示倍数：显示尺寸 = size × scale，整数倍才有整齐的像素格 */
export const ART_SIZE = PACK.size
export const ART_SCALE = 2
export const ART_DISPLAY = ART_SIZE * ART_SCALE

/** 美术身份：存进每只猫，将来换包时能知道它是按哪版画的 */
export interface CatArtIdentity {
  styleId: string
  artVersion: string
  revision: string
}
export const ART_IDENTITY: CatArtIdentity = { styleId: PACK.styleId, artVersion: PACK.artVersion, revision: PACK.revision }

export function isCatArtIdentity(x: unknown): x is CatArtIdentity {
  if (typeof x !== 'object' || x === null) return false
  const a = x as Record<string, unknown>
  return typeof a.styleId === 'string' && typeof a.artVersion === 'string' && typeof a.revision === 'string'
}

/** 所有岛（coat × body），含未达标的 */
export const ART_ISLANDS: PackIsland[] = islandsFromProfiles(PACK)

/**
 * 可孵化的岛：闭合（岛内横向变化不会掉出覆盖）且横向落点 ≥2（否则满级后是机械交替）。
 * 孵化只能落在这些岛上，这条保证一只猫终其一生都画得出来。
 */
export const ART_HATCHABLE: PackIsland[] = hatchableIslands(PACK)

/** 可孵化的 (coat, body) 对，孵化时从这里随机挑 */
export const ART_IDENTITY_PAIRS: Array<{ coat: string; body: string }> = ART_HATCHABLE.map((i) => ({ coat: i.coat, body: i.body }))

/** 某个可孵化岛支持的横向取值 */
export function artLateralFor(coat: string, body: string): { eyes: string[]; expressions: string[] } {
  const island = ART_HATCHABLE.find((i) => i.coat === coat && i.body === body)
  return { eyes: island?.eyes ?? [], expressions: island?.expressions ?? [] }
}

/** 包里出现过的横向取值并集（供 UI 展示与规则取交集用） */
export const ART_EYES: string[] = [...new Set(ART_HATCHABLE.flatMap((i) => i.eyes))].sort()
export const ART_EXPRESSIONS: string[] = [...new Set(ART_HATCHABLE.flatMap((i) => i.expressions))].sort()

/** 包里各异变槽位实际有图的部件（按 profile 的资源映射取并集） */
export function artPartsBySlot(): Record<string, string[]> {
  const out: Record<string, Set<string>> = {}
  for (const profile of PACK.profiles) {
    for (const step of profile.steps) {
      if (step.slot === 'body') continue
      out[step.slot] ??= new Set()
      for (const trait of Object.keys(step.resources)) out[step.slot].add(trait)
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort()]))
}

/**
 * nutri 的外观 → QMonster 表现型。用结构类型而不是 import CatSpec，避免
 * `pixelcat → catArt → pixelcat` 的循环依赖。
 */
export interface CatSpecLike {
  coat: string; body: string; eyes: string; expression: string
  crown: string; ears: string; neck: string; back: string; tailTip: string
}

export function phenotypeOfCat(spec: CatSpecLike): PhenotypeV2 {
  return {
    schemaVersion: 'feline-phenotype-v2',
    body: spec.body, coat: spec.coat, eyes: spec.eyes, expression: spec.expression,
    crown: spec.crown, ears: spec.ears, neck: spec.neck, back: spec.back, tailTip: spec.tailTip,
  }
}

/** 这只猫画得出来吗，画得出来就给合成计划 */
export function artPlanForCat(spec: CatSpecLike): PixelOp[] | null {
  return planFromCompact(PACK, phenotypeOfCat(spec))
}

/** 这个表现型画得出来吗（按 profile 推导，等价性已在打包时校验） */
export function artPlanFor(p: PhenotypeV2): PixelOp[] | null {
  return planFromCompact(PACK, p)
}

/** 合成计划里用到的图层 id */
export function artLayersFor(ops: readonly PixelOp[]): string[] {
  return ops.flatMap((op) => (op.kind === 'draw' ? [op.layer] : []))
}
