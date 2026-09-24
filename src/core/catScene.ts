/**
 * 场景访问层：背景由 QMonster 的场景包提供，这里是 nutri 侧的唯一入口，对应 `catArt.ts` 之于猫。
 *
 * 背景和猫是两个 catalog，**刻意不合并**：猫那边 35,840 条 coverage 是槽位的笛卡尔积，
 * 背景乘进去就是 107,520 条；而背景与猫之间没有逐组合的遮挡关系要确认，叠加是机械的。
 * 所以背景走 `pixel-scene-catalog-v1`，猫的 profile／coverage 一条没动，猫的表现型也不含背景。
 *
 * 目录与 3 张 PNG 由 `npm run scenepack` 校验后装进来（schema／描边参数／二值 alpha／
 * 尺寸与画布一致／依赖的猫包 revision 与本地一致）。图层 URL 同样由 UI 层取，这里不碰 DOM。
 */
import catalogJson from '../assets/pixelscene/catalog.json'
import metaJson from '../assets/pixelscene/meta.json'
import { backdropOrder, geometryOf, type SceneCatalog, type SceneGeometry } from './pixelscene'

export const SCENE: SceneCatalog = catalogJson as unknown as SceneCatalog
export const SCENE_META = metaJson as { sceneVersion: string; revision: string; rendererVersion: string; subjectArtVersion: string; verifiedAt: string }

/** 场景画布与猫的落点 */
export const SCENE_GEOMETRY: SceneGeometry = geometryOf(SCENE)
export const SCENE_W = SCENE_GEOMETRY.canvas.width
export const SCENE_H = SCENE_GEOMETRY.canvas.height
/** 显示倍数与猫一致（64→128），所以场景是 192×128 */
export const SCENE_SCALE = 2
export const SCENE_DISPLAY_W = SCENE_W * SCENE_SCALE
export const SCENE_DISPLAY_H = SCENE_H * SCENE_SCALE

/** 包里有哪些背景，按成长顺序（低阶在前） */
export const SCENE_BACKDROPS: string[] = backdropOrder(SCENE)

/** 某个背景的图层 id；`none` 与不认识的值都返回 null（没有背景不是错误状态） */
export function backdropLayer(backdrop: string): string | null {
  if (backdrop === 'none') return null
  const b = SCENE.backdrops[backdrop]
  return b ? b.resourceId : null
}

/** 某个背景的品质档；不认识的返回 null */
export function backdropRarity(backdrop: string): 'N' | 'R' | 'L' | null {
  const b = SCENE.backdrops[backdrop]
  return b ? b.rarity : null
}
