/**
 * 场景包回放：用 nutri 自己的合成器重算 QMonster 固定的那几个场景，逐条比 RGBA 摘要。
 *
 *   npx tsx scripts/pixelSceneReplay.ts [--scene <dir>] [--pack <猫包 dir>] [--report <report.json>]
 *
 * 和 `pixelPackReplay.ts` 分开：那个验的是猫（64×64、pixel-rgba-v1），这个验的是场景
 * （96×64、pixel-scene-rgba-v1）。场景依赖一份**已验过的**猫包，所以这里也会把猫先算出来对一遍——
 * 猫错了场景不可能对，先分清是哪一层错的。
 */
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { openPack, type AnyPixelCatalog } from '../src/core/pixelpack'
import { composePlan, type Rgba } from '../src/core/pixelize'
import { composeScene, geometryOf, isSceneCatalog, type SceneCatalog } from '../src/core/pixelscene'

const args = process.argv.slice(2)
const argOf = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
const RP = resolve(process.env.RANDOMPET_DIR ?? join(resolve('.'), '..', 'RandomPet-master'))
const SCENE = resolve(argOf('--scene') ?? join(RP, 'dist', 'pixel-scene', 'backdrop-candidate'))
const PACK = resolve(argOf('--pack') ?? join(RP, 'dist', 'pixel-art', 'v3-approved-1.6.1'))
const REPORT = resolve(argOf('--report') ?? join(RP, 'docs', 'qa', 'pixel-scene-backdrops', 'report.json'))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sharp: (i?: unknown, o?: unknown) => any = createRequire(join(RP, 'package.json'))('sharp')
const sha = (b: Uint8Array | Uint8ClampedArray) => createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex')

const sceneCatalog: unknown = JSON.parse(readFileSync(join(SCENE, 'catalog.json'), 'utf8'))
if (!isSceneCatalog(sceneCatalog)) throw new Error('场景目录不符合 pixel-scene-catalog-v1（schema／renderer／描边参数任一不符都会到这里）')
const scene: SceneCatalog = sceneCatalog
const geo = geometryOf(scene)
console.log(`场景目录 ${scene.schemaVersion} · ${scene.sceneVersion} · renderer ${scene.rendererVersion} · revision ${scene.revision.slice(0, 12)}…`)
console.log(`画布 ${geo.canvas.width}×${geo.canvas.height}，猫 ${geo.subject.width}×${geo.subject.height} 锚 (${geo.subject.anchor.x},${geo.subject.anchor.y})，描边 ${scene.outline.neighborhood}/${scene.outline.width}px/×${scene.outline.factor}`)

// 背景图层
const backdrops = new Map<string, Rgba>()
for (const [id, res] of Object.entries(scene.resources)) {
  const bytes = readFileSync(join(SCENE, res.path))
  if (sha(bytes) !== res.sha256) throw new Error(`背景 PNG 摘要不一致: ${res.path}`)
  if (bytes.readUInt32BE(16) !== res.width || bytes.readUInt32BE(20) !== res.height) throw new Error(`背景 PNG 尺寸不一致: ${res.path}`)
  const d: Buffer = await sharp(bytes).ensureAlpha().raw().toBuffer()
  const px = new Uint8ClampedArray(d.buffer, d.byteOffset, d.length)
  if (px.length !== res.width * res.height * 4) throw new Error(`背景解码尺寸不对: ${res.path}`)
  for (let i = 3; i < px.length; i += 4) if (px[i] !== 0 && px[i] !== 255) throw new Error(`背景 alpha 不是二值: ${res.path}`)
  backdrops.set(id, px)
}
console.log(`${backdrops.size} 张背景：摘要／尺寸／二值 alpha 校验通过`)

// 猫包
const pack = openPack(JSON.parse(readFileSync(join(PACK, 'catalog.json'), 'utf8')))
const catCatalog = pack.catalog as AnyPixelCatalog
// 场景是叠在猫上的：猫包对不上，QMonster 算出来的场景摘要就不作数
const want = (scene as unknown as { validatedSubject?: { revision?: string; artVersion?: string } }).validatedSubject
if (want?.revision && want.revision !== catCatalog.revision) {
  throw new Error(`场景声明依赖猫包 ${want.artVersion}（${want.revision.slice(0, 12)}…），这里给的是 ${catCatalog.artVersion}（${catCatalog.revision.slice(0, 12)}…）`)
}
console.log(`猫包 ${catCatalog.artVersion} · revision ${catCatalog.revision.slice(0, 12)}… 与场景声明一致`)
const layers = new Map<string, Rgba>()
for (const [id, res] of Object.entries(catCatalog.resources)) {
  const d: Buffer = await sharp(readFileSync(join(PACK, res.path))).ensureAlpha().raw().toBuffer()
  layers.set(id, new Uint8ClampedArray(d.buffer, d.byteOffset, d.length))
}

const report = JSON.parse(readFileSync(REPORT, 'utf8'))
const rows = report.samples as Array<{ id: string; backdrop: string; phenotype: Record<string, string>; coverageId: string; catRgbaSha256: string; sceneRgbaSha256: string; pngSha256: string; file: string }>

let bad = 0
console.log('\n| # | 背景 | coverageId | 猫 RGBA | 场景 RGBA | PNG |')
console.log('| - | - | - | - | - | - |')
for (const r of rows) {
  const plan = pack.plan(r.phenotype as never)
  const cat = plan ? composePlan(plan.ops, (id) => layers.get(id)!, geo.subject.width) : null
  const catOk = !!cat && sha(cat) === r.catRgbaSha256
  const bd = scene.backdrops[r.backdrop]
  const px = bd ? backdrops.get(bd.resourceId)! : null
  const out = cat ? composeScene(px, cat, geo) : null
  const sceneOk = !!out && sha(out) === r.sceneRgbaSha256
  const pngOk = sha(readFileSync(join(RP, r.file))) === r.pngSha256
  if (!catOk || !sceneOk || !pngOk) bad++
  console.log(`| ${r.id} | ${r.backdrop} | ${r.coverageId} | ${catOk ? '✓' : '✗'} | ${sceneOk ? '✓' : '✗'} | ${pngOk ? '✓' : '✗'} |`)
}

// none 档：复用 sourceSample 那只猫，只在内存里合成，不落 PNG
const none = report.noneCase as { sourceSample: string; outputWritten: boolean; width: number; height: number; sceneRgbaSha256: string }
const src = rows.find((r) => r.id === none.sourceSample)
if (!src) throw new Error(`noneCase 指向的样本 ${none.sourceSample} 不在列表里`)
const nonePlan = pack.plan(src.phenotype as never)
const noneCat = nonePlan ? composePlan(nonePlan.ops, (id) => layers.get(id)!, geo.subject.width) : null
const noneOut = noneCat ? composeScene(null, noneCat, geo) : null
const noneOk = !!noneOut && sha(noneOut) === none.sceneRgbaSha256
const noneSize = none.width === geo.canvas.width && none.height === geo.canvas.height
if (!noneOk || !noneSize || none.outputWritten) bad++
console.log(`\nbackdrop: none（取样本 ${none.sourceSample} 的猫）`)
console.log(`  RGBA 一致：${noneOk ? '✓' : `✗ 算得 ${noneOut ? sha(noneOut).slice(0, 12) : '—'}… 目录 ${none.sceneRgbaSha256.slice(0, 12)}…`}`)
console.log(`  仍是 ${geo.canvas.width}×${geo.canvas.height}（没背景也不缩成方的）：${noneSize ? '✓' : '✗'}`)
console.log(`  不落第十张 PNG：${none.outputWritten ? '✗ 报告说写了' : '✓'}`)

if (bad) { console.error(`\n✗ ${bad} 处不一致`); process.exit(1) }
console.log(`\n✓ ${rows.length} 个场景 + none 全部一致`)
