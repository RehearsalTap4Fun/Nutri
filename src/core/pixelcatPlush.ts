/**
 * 毛绒轨（自动像素化）的合成代码：把 RandomPet v0.10 的毛绒立绘离线像素化成 96px 图层后，
 * 按固定层序叠出一只猫。这是接入 QMonster 像素包之前的过渡实现。
 *
 * **应用运行时已不再使用它**（形象改由 `catArt.ts` 的像素包提供），留在这里只为两件事：
 *   1. `scripts/pixelCat.ts` 还靠它出离线预览与对照图；
 *   2. 万一要回看当初的效果，不必去翻 git 历史。
 * 它的素材（`src/assets/pixelcat/`）因此不被应用 import，也就不会进打包产物。
 */
import manifest from '../assets/pixelcat/manifest.json'
import { composePlan, hardenAlpha, type PixelOp, type Rgba } from './pixelize'
import { MUTATION_SLOTS, type CatSpec } from './pixelcat'

/** 毛绒轨的原生尺寸与显示倍数（与像素包的 64/2 不同，它是 96/1） */
export const PLUSH_SIZE: number = manifest.size
export const PLUSH_SCALE: number = manifest.scale

export type RenderOp =
  | { kind: 'draw'; layer: string; target: 'frame' | 'subject' }
  | { kind: 'clear'; region: 'ears' | 'tailTip' }

/**
 * 合成顺序与 RandomPet 渲染器一致：背部、额顶先画在身体后面（frame），身体画在 subject，
 * 鳍耳要先抠掉原耳再画到 subject，替换尾要先抠掉原尾再画到 frame（尾根藏在臀部后），颈部件最后画到 frame；
 * 最后 subject 盖到 frame 上。
 */
export function renderOps(spec: CatSpec): RenderOp[] {
  const m = manifest.mutations[spec.coat as keyof typeof manifest.mutations] as Record<string, string>
  const draw = (layer: string, target: 'frame' | 'subject'): RenderOp => ({ kind: 'draw', layer, target })
  const ops: RenderOp[] = []
  if (spec.back !== 'none') ops.push(draw(m[spec.back], 'frame'))
  if (spec.crown !== 'none') ops.push(draw(m[spec.crown], 'frame'))
  ops.push(draw(`${spec.coat}-${spec.expression}`, 'subject'))
  if (spec.ears !== 'none') ops.push({ kind: 'clear', region: 'ears' }, draw(m[spec.ears], 'subject'))
  if (spec.tailTip !== 'none') ops.push({ kind: 'clear', region: 'tailTip' }, draw(m[spec.tailTip], 'frame'))
  if (spec.neck !== 'none') ops.push(draw(m[spec.neck], 'frame'))
  return ops
}

export function layersFor(spec: CatSpec): string[] {
  return renderOps(spec).flatMap((op) => (op.kind === 'draw' ? [op.layer] : []))
}

export const CLEAR_POLYGONS: { ears: number[][][]; tailTip: number[][] } = manifest.clear

/** 毛绒轨渲染时忽略像素包才有的性状（body／eyes），它的素材里没有这两维 */
export const PLUSH_IGNORES = ['body', 'eyes'] as const
export { MUTATION_SLOTS }

export interface ClearRegions {
  ears: readonly (readonly (readonly number[])[])[]
  tailTip: readonly (readonly number[])[]
}

/**
 * 按渲染计划合成一只像素猫：后层部件各自描边后叠到 frame；身体层叠到 subject（先抠再画替换耳）；
 * subject 整体描一次边再盖到 frame 上，部件与身体之间就有了分隔线。
 */
export function composeSprite(ops: readonly RenderOp[], layer: (id: string) => Rgba, n: number, clear: ClearRegions): Rgba {
  // 老轨（毛绒像素化）的计划翻译成通用计划；图层先二值化，语义与像素包同一份 composePlan
  const plan: PixelOp[] = ops.map((op) => op.kind === 'clear'
    ? { kind: 'clear', polygons: op.region === 'ears' ? clear.ears : [clear.tailTip] }
    : { kind: 'draw', layer: op.layer, target: op.target, occlusion: [] })
  return composePlan(plan, (id) => hardenAlpha(new Uint8ClampedArray(layer(id))), n)
}
