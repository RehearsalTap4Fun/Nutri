/**
 * 场景层：96×64 的画布，先画背景，再把 64×64 的猫放到 (16,0)。
 *
 * 为什么背景不做成猫的第六个图层槽：背景和猫是**两个 catalog**。猫那边 35,840 条 coverage
 * 是槽位的笛卡尔积，背景再乘进去就是 107,520 条；而背景与猫之间没有任何遮挡关系需要逐组合确认，
 * 叠加是机械的。所以 QMonster 把它单独发成 `pixel-scene-catalog-v1`，猫的 profile／coverage 一条没动。
 *
 * 描边归场景渲染器：shipped 的背景 PNG **不含**描边，由这里对背景描一圈再合成猫。
 * 用的是 `pixelize.ts` 那个 `outlineRgba`（四邻、均色 ×0.36），和猫共用一份实现。
 */
import { outlineRgba, type Rgba } from './pixelize'

export const SCENE_SCHEMA = 'pixel-scene-catalog-v1'
export const SCENE_RENDERER = 'pixel-scene-rgba-v1'

export interface SceneResource {
  path: string
  sha256: string
  width: number
  height: number
}

export interface SceneBackdrop {
  resourceId: string
  rarity: 'N' | 'R' | 'L'
  growthRank: number
  review?: string
}

export interface SceneCatalog {
  schemaVersion: string
  sceneVersion: string
  revision: string
  rendererVersion: string
  canvas: { width: number; height: number }
  subject: { width: number; height: number; anchor: { x: number; y: number }; rendererVersion: string }
  outline: { owner: string; neighborhood: string; width: number; color: string; factor: number }
  resources: Record<string, SceneResource>
  backdrops: Record<string, SceneBackdrop>
  growth: { slot: string; order: string[] }
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

/**
 * 只认住这份实现真正依赖的东西，别的字段随它去。
 * 描边参数也要核：它写在目录里、实现在我们这边，两边对不上就会画出不一样的边，
 * 而那种错不会报错，只会让图悄悄不一致。
 */
export function isSceneCatalog(raw: unknown): raw is SceneCatalog {
  if (!isObj(raw)) return false
  const c = raw as Partial<SceneCatalog>
  if (c.schemaVersion !== SCENE_SCHEMA || c.rendererVersion !== SCENE_RENDERER) return false
  if (!isObj(c.canvas) || !isObj(c.subject) || !isObj(c.outline)) return false
  if (!isObj(c.resources) || !isObj(c.backdrops) || !isObj(c.growth)) return false
  const o = c.outline as SceneCatalog['outline']
  if (o.owner !== 'scene-renderer' || o.neighborhood !== 'four' || o.width !== 1) return false
  if (o.color !== 'adjacent-mean-darken' || o.factor !== OUTLINE_DARKEN) return false
  const s = c.subject as SceneCatalog['subject']
  if (s.rendererVersion !== 'pixel-rgba-v1') return false
  return true
}

/** 与 `pixel-scene-rgba-v1` 的 `outline.factor` 一致；不一致时 isSceneCatalog 会拒绝目录 */
export const OUTLINE_DARKEN = 0.36

export interface SceneGeometry {
  canvas: { width: number; height: number }
  subject: { width: number; height: number; anchor: { x: number; y: number } }
}

/**
 * 合成一张场景：背景描边 → 猫按锚点盖上去。
 *
 * 猫是二值 alpha，透明处让背景透出来；猫自己的描边在 64×64 那步就画好了，这里不再描。
 * 没有背景时（`backdrop: none`）传 null，得到的是一张只有猫的 96×64，猫仍在 (16,0)——
 * 尺寸不随背景有无变化，否则版面会跳。
 */
export function composeScene(backdrop: Rgba | null, cat: Rgba, geo: SceneGeometry): Rgba {
  const { width: W, height: H } = geo.canvas
  const { width: cw, height: ch, anchor } = geo.subject
  if (cat.length !== cw * ch * 4) throw new Error(`猫的尺寸不对：应为 ${cw}×${ch}`)

  const out = new Uint8ClampedArray(W * H * 4)
  if (backdrop) {
    if (backdrop.length !== W * H * 4) throw new Error(`背景尺寸不对：应为 ${W}×${H}`)
    out.set(outlineRgba(backdrop, W, OUTLINE_DARKEN, H))
  }
  for (let y = 0; y < ch; y++) {
    const oy = y + anchor.y
    if (oy < 0 || oy >= H) continue
    for (let x = 0; x < cw; x++) {
      const ox = x + anchor.x
      if (ox < 0 || ox >= W) continue
      const si = (y * cw + x) * 4
      if (cat[si + 3] === 0) continue
      const di = (oy * W + ox) * 4
      out[di] = cat[si]; out[di + 1] = cat[si + 1]; out[di + 2] = cat[si + 2]; out[di + 3] = 255
    }
  }
  return out
}

export function geometryOf(c: SceneCatalog): SceneGeometry {
  return { canvas: c.canvas, subject: { width: c.subject.width, height: c.subject.height, anchor: c.subject.anchor } }
}

/** 背景按 growthRank 从低到高；成长链要按这个顺序升阶 */
export function backdropOrder(c: SceneCatalog): string[] {
  return [...c.growth.order]
}
