/**
 * 狗狗包回放：用 nutri 自己装进来的图层 + nutri 的翻译层重算 QMonster 固定的摘要，逐条比 straight RGBA。
 *
 *   npx tsx scripts/caninePackReplay.ts [--dist <RandomPet>/dist/canine/approved-1.0.0] [--qa <RandomPet>/docs/qa/canine-v1] [--report <out.json>] [--quick]
 *
 * 走的是运行时真实路径：选择 → 翻译成 nutri 的外观（犬种放在 coat）→ `dogPlanFor` → `composeDog`。
 * 所以它验的不只是合成器（那是原样复制的），还有 nutri 把外观翻成选择对象这一步。
 *
 *   1. fixtures.json 里 1,512 条像素固定案例
 *   2. combinations/pixel.jsonl.gz 里全部 92,160 种合法组合（--quick 跳过）
 *   3. 狗 × 背景：每个犬型 × (none + 三张背景)，用 nutri 的场景合成器出摘要，写进报告给 QMonster 复核
 *      ——场景包只用猫验过，狗放进去之前先自己跑一遍
 *
 * 图层用 sharp 解码（Node 下的无损解码，与 QMonster 回放同一口径），不用 Canvas。
 */
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join, resolve } from 'node:path'
import { CANINE, CANINE_META, composeDog, dogPlanFor } from '../src/core/dogArt'
import { SCENE, SCENE_BACKDROPS, SCENE_GEOMETRY, SCENE_META, backdropLayer } from '../src/core/catScene'
import { composeScene } from '../src/core/pixelscene'
import { CAT_SLOT_OPTIONS, type CatSpec } from '../src/core/pixelcat'

const ROOT = resolve('.')
const args = process.argv.slice(2)
const argOf = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
const RP = resolve(process.env.RANDOMPET_DIR ?? join(ROOT, '..', 'RandomPet-master'))
const DIST = resolve(argOf('--dist') ?? join(RP, 'dist', 'canine', 'approved-1.0.0'))
const QA = resolve(argOf('--qa') ?? join(RP, 'docs', 'qa', 'canine-v1'))
const REPORT = argOf('--report')
const QUICK = args.includes('--quick')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sharp: (i?: unknown, o?: unknown) => any = createRequire(join(RP, 'package.json'))('sharp')
const sha = (b: Uint8Array | Uint8ClampedArray | Buffer) => createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex')

// nutri 装进来的图层（不是 RandomPet 的 dist）：验的是我们真正发布出去的那一份
const layers = new Map<string, Uint8ClampedArray>()
for (const id of CANINE.resourceIds) {
  const d: Buffer = await sharp(readFileSync(join(ROOT, 'src', 'assets', 'caninepack', `${id}.png`))).ensureAlpha().raw().toBuffer()
  layers.set(id, new Uint8ClampedArray(d.buffer, d.byteOffset, d.length))
}
const layer = (id: string) => { const d = layers.get(id); if (!d) throw new Error(`缺图层 ${id}`); return d }
console.log(`狗狗包 ${CANINE_META.artVersion} · revision ${CANINE.revision.slice(0, 12)}… · ${layers.size} 张图层（nutri 副本）`)

type Selection = { bodyId: string; back?: string; tailTip?: string; ears?: string; neck?: string; crown?: string }
/** QMonster 的选择 → nutri 的外观。主体 id 拆回目录字段，不靠字符串格式 */
function specOf(sel: Selection, backdrop: CatSpec['backdrop'] = 'none'): CatSpec {
  const b = CANINE.bodies[sel.bodyId]
  if (!b) throw new Error(`未知主体 ${sel.bodyId}`)
  return {
    species: 'dog', coat: b.breed as CatSpec['coat'], body: b.body as CatSpec['body'], eyes: b.eyes as CatSpec['eyes'], expression: b.expression as CatSpec['expression'],
    crown: (sel.crown ?? 'none') as CatSpec['crown'], ears: (sel.ears ?? 'none') as CatSpec['ears'], neck: (sel.neck ?? 'none') as CatSpec['neck'],
    back: (sel.back ?? 'none') as CatSpec['back'], tailTip: (sel.tailTip ?? 'none') as CatSpec['tailTip'], backdrop,
  }
}
function renderDog(spec: CatSpec): Uint8ClampedArray {
  const plan = dogPlanFor(spec)
  if (!plan) throw new Error(`画不出来：${JSON.stringify(spec)}`)
  return composeDog(plan, layer)
}

function replay(label: string, rows: Array<{ selection: Selection; rgbaSha256: string; id?: string }>): { passed: number; failed: number } {
  let passed = 0
  const failed: string[] = []
  for (const r of rows) {
    if (sha(renderDog(specOf(r.selection))) === r.rgbaSha256) passed++
    else failed.push(r.id ?? JSON.stringify(r.selection))
  }
  console.log(`${failed.length ? '✗' : '✓'} ${label}：${passed} 通过，${failed.length} 失败${failed.length ? '\n  ' + failed.slice(0, 5).join('\n  ') : ''}`)
  return { passed, failed: failed.length }
}

const fixtures = (JSON.parse(readFileSync(join(DIST, 'fixtures.json'), 'utf8')) as { rows: Array<{ style: string; id: string; selection: Selection; rgbaSha256: string }> }).rows.filter((r) => r.style === 'pixel')
const fx = replay('固定案例（fixtures.json · pixel）', fixtures)

let full: { passed: number; failed: number } | null = null
if (!QUICK) {
  const lines = gunzipSync(readFileSync(join(QA, 'combinations', 'pixel.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean)
  full = replay('全量组合（combinations/pixel.jsonl.gz）', lines.map((l) => JSON.parse(l)))
}

// 狗 × 背景：每个犬型取一个代表主体（四件部件全开，最容易出界），配 none + 三张背景
const sceneRows: Array<{ id: string; selection: Selection; backdrop: string; rgbaSha256: string }> = []
const backdropPixels = new Map<string, Uint8ClampedArray>()
for (const bd of SCENE_BACKDROPS) {
  const id = backdropLayer(bd)!
  const d: Buffer = await sharp(readFileSync(join(ROOT, 'src', 'assets', 'pixelscene', `${id}.png`))).ensureAlpha().raw().toBuffer()
  backdropPixels.set(bd, new Uint8ClampedArray(d.buffer, d.byteOffset, d.length))
}
const top = (slot: 'crown' | 'ears' | 'neck' | 'back' | 'tailTip') => { const o = CAT_SLOT_OPTIONS[slot] as readonly string[]; return o[o.length - 1] }
const profileBodies = new Map<string, string>()
for (const [bodyId, b] of Object.entries(CANINE.bodies)) if (!profileBodies.has(b.profile)) profileBodies.set(b.profile, bodyId)
let sceneBad = 0
for (const [profile, bodyId] of [...profileBodies.entries()].sort()) {
  for (const parts of [{}, { crown: top('crown'), ears: top('ears'), neck: top('neck'), back: top('back'), tailTip: top('tailTip') }]) {
    const selection: Selection = { bodyId, ...parts }
    for (const bd of ['none', ...SCENE_BACKDROPS]) {
      const dog = renderDog(specOf(selection))
      const px = composeScene(bd === 'none' ? null : backdropPixels.get(bd)!, dog, SCENE_GEOMETRY)
      if (px.length !== SCENE_GEOMETRY.canvas.width * SCENE_GEOMETRY.canvas.height * 4) sceneBad++
      sceneRows.push({ id: `${profile}/${Object.keys(parts).length ? 'all-top' : 'bare'}/${bd}`, selection, backdrop: bd, rgbaSha256: sha(px) })
    }
  }
}
console.log(`${sceneBad ? '✗' : '✓'} 狗 × 背景：${sceneRows.length} 幕（${profileBodies.size} 个犬型 × 裸/满配 × none+${SCENE_BACKDROPS.length} 张背景），全部 ${SCENE_GEOMETRY.canvas.width}×${SCENE_GEOMETRY.canvas.height}`)

const ok = fx.failed === 0 && (!full || full.failed === 0) && sceneBad === 0
if (REPORT) {
  const report = {
    schemaVersion: 'nutri-canine-replay-v1',
    decision: ok ? 'pass' : 'fail',
    canine: { artVersion: CANINE.artVersion, revision: CANINE.revision, runtimeSha256: CANINE.runtimeSha256, deliverySha256: CANINE_META.deliverySha256 },
    scene: { sceneVersion: SCENE_META.sceneVersion, revision: SCENE.revision },
    path: 'selection → nutri spec (coat = breed) → dogPlanFor → composeDog (vendored runtime.mjs) · layers decoded from nutri src/assets/caninepack with sharp',
    fixtures: fx,
    combinations: full,
    dogScenes: { note: '场景包只用猫验过；这是 nutri 侧把狗放进 96×64 场景（锚 (16,0)、背景四邻描边 ×0.36）的结果，请 QMonster 复核', rows: sceneRows },
  }
  writeFileSync(resolve(REPORT), JSON.stringify(report, null, 2) + '\n')
  console.log(`报告 → ${REPORT}`)
}
if (!ok) process.exit(1)
console.log('\n✓ 全部一致')
