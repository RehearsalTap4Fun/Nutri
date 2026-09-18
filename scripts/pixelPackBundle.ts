/**
 * 把 QMonster 像素包打成 nutri 运行时能装下的包，并在打包前做全套校验。
 *
 *   npx tsx scripts/pixelPackBundle.ts [--pack <dir>] [--out src/assets/pixelpack] [--dry]
 *
 * 为什么要打包：完整目录太大。1.3.1 的 catalog.json 有 1.6MB，其中 coverage 数组占 1.09MB；
 * 补齐 6 毛色后会到 3.8MB 以上。而 nutri 是单文件应用（当前 899KB）。
 *
 * 怎么压：在"格子补满"的目录里，coverage 恰好等于按 profile 槽位映射做的笛卡尔积，
 * 所以运行时只需要 profiles + resources（约 19KB）。**但这个等价性必须逐条校验**——
 * 格子有空洞时推导会把未登记的组合误判为已覆盖（实测 1.2.1 就是这种情况：显式 32 vs 推导 100）。
 * 校验不通过就拒绝打包，不做静默降级。
 *
 * 打包前依次校验：
 *   1. 目录 schema 与 revision（canonical JSON 的 SHA-256）
 *   2. 每张 PNG 的 SHA-256、IHDR 尺寸、解码后二值 alpha
 *   3. 全部 coverage 的 RGBA 与目录 rgbaSha256 逐字节一致（用 nutri 自己的合成器）
 *   4. 显式 coverage ≡ 按 profile 推导的笛卡尔积
 *   5. 压缩目录的 planFromCompact 与完整目录的 planPixelArtV3 对每条 coverage 给出相同计划
 *
 * 产物：<out>/catalog.json（压缩目录）+ <out>/<layer>.png（原字节）+ <out>/meta.json（校验留痕）
 */
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  catalogRevisionInput, compactOf, coverageEquivalent, hatchableIslands, islandsFromProfiles,
  isPixelCatalogV3, planFromCompact, planPixelArtV3, type PhenotypeV2, type PixelCatalogV3,
} from '../src/core/pixelpack'
import { composePlan, type Rgba } from '../src/core/pixelize'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RP = resolve(process.env.RANDOMPET_DIR ?? join(ROOT, '..', 'RandomPet-master'))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sharp: (input?: unknown, opts?: unknown) => any = createRequire(join(RP, 'package.json'))('sharp')

const args = process.argv.slice(2)
const argOf = (n: string): string | undefined => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
const PACK = resolve(argOf('--pack') ?? join(RP, 'dist', 'pixel-art', 'v3-approved-1.3.1'))
const OUT = resolve(argOf('--out') ?? join(ROOT, 'src', 'assets', 'pixelpack'))
const DRY = args.includes('--dry')

const sha256 = (b: Uint8Array | Uint8ClampedArray) => createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex')
const fail = (msg: string): never => { console.error(`✗ ${msg}`); process.exit(1) }

// ── 1. 目录与 revision ──
const raw: unknown = JSON.parse(readFileSync(join(PACK, 'catalog.json'), 'utf8'))
if (!isPixelCatalogV3(raw)) fail('只支持 pixel-art-catalog-v3（压缩形态依赖 profile 推导，旧 schema 请先升级）')
const catalog = raw as PixelCatalogV3
const rev = createHash('sha256').update(catalogRevisionInput(catalog)).digest('hex')
if (rev !== catalog.revision) fail(`目录 revision 不一致：算得 ${rev}，目录写 ${catalog.revision}`)
console.log(`✓ 目录 ${catalog.artVersion} · renderer ${catalog.rendererVersion} · revision ${catalog.revision.slice(0, 12)}…`)

// ── 2. 图层 ──
const layers = new Map<string, Rgba>()
const bytes = new Map<string, Buffer>()
for (const [id, res] of Object.entries(catalog.resources)) {
  const buf = readFileSync(join(PACK, res.path))
  if (sha256(buf) !== res.sha256) fail(`PNG 摘要不一致: ${res.path}`)
  if (buf.readUInt32BE(16) !== res.width || buf.readUInt32BE(20) !== res.height) fail(`PNG 尺寸不一致: ${res.path}`)
  const decoded: Buffer = await sharp(buf).ensureAlpha().raw().toBuffer()
  const px = new Uint8ClampedArray(decoded.buffer, decoded.byteOffset, decoded.length)
  if (px.length !== catalog.size * catalog.size * 4) fail(`解码尺寸不对: ${res.path}`)
  for (let i = 3; i < px.length; i += 4) if (px[i] !== 0 && px[i] !== 255) fail(`alpha 不是二值: ${res.path}`)
  layers.set(id, px)
  bytes.set(id, buf)
}
console.log(`✓ ${layers.size} 张图层：摘要、尺寸、二值 alpha`)

// ── 3. 全量逐字节回放 ──
const layerOf = (id: string): Rgba => { const l = layers.get(id); if (!l) fail(`缺图层 ${id}`); return l! }
let replayed = 0
for (const c of catalog.coverage) {
  const plan = planPixelArtV3(catalog, c.phenotype)
  if (!plan) fail(`生成计划失败: ${c.id}`)
  if (sha256(composePlan(plan!.ops, layerOf, catalog.size)) !== c.rgbaSha256) fail(`RGBA 不一致: ${c.id}`)
  replayed++
}
console.log(`✓ ${replayed}/${catalog.coverage.length} 条 coverage 逐字节一致`)

// ── 4. 等价性（压缩的前提） ──
const eq = coverageEquivalent(catalog)
if (!eq.ok) {
  console.error(`✗ 显式 coverage 与按 profile 推导的集合不等价：显式 ${eq.explicit}、推导 ${eq.derived}`)
  for (const k of eq.onlyExplicit) console.error(`    仅显式有 ${k}`)
  for (const k of eq.onlyDerived) console.error(`    仅推导有 ${k}（格子有空洞，压缩会把它误判为已覆盖）`)
  fail('拒绝打包：格子未补满的目录不能用压缩形态')
}
console.log(`✓ 显式 coverage ≡ 推导集合（各 ${eq.explicit} 条）`)

// ── 5. 压缩目录给出的计划与完整目录一致 ──
const compact = compactOf(catalog)
for (const c of catalog.coverage) {
  const a = planPixelArtV3(catalog, c.phenotype)
  const b = planFromCompact(compact, c.phenotype as PhenotypeV2)
  if (!b || JSON.stringify(a!.ops) !== JSON.stringify(b)) fail(`压缩目录的计划与完整目录不一致: ${c.id}`)
}
console.log(`✓ 压缩目录对全部 ${catalog.coverage.length} 条给出相同计划`)

// ── 报告 ──
const islands = islandsFromProfiles(compact)
const hatchable = hatchableIslands(compact)
const fullSize = JSON.stringify(catalog).length
const smallSize = JSON.stringify(compact).length
const pngSize = [...bytes.values()].reduce((n, b) => n + b.length, 0)
console.log('')
console.log(`目录 ${(fullSize / 1024).toFixed(0)} KB → 压缩 ${(smallSize / 1024).toFixed(1)} KB（${(smallSize / fullSize * 100).toFixed(1)}%）· 图层 ${(pngSize / 1024).toFixed(0)} KB`)
console.log(`岛 ${islands.length} 座 · 闭合 ${islands.filter((i) => i.closed).length} · 可孵化 ${hatchable.length}`)
for (const i of islands) {
  const ok = hatchable.some((h) => h.coat === i.coat && h.body === i.body)
  console.log(`  ${`${i.coat}/${i.body}`.padEnd(34)}表情 ${i.expressions.length} 眼型 ${i.eyes.length} · ${i.closed ? '闭合' : '未闭合'} · ${ok ? '可孵化' : '不可孵化'}`)
}
console.log(`可孵化的毛色：${[...new Set(hatchable.map((i) => i.coat))].join(', ') || '（无）'}`)

if (DRY) { console.log('\n--dry：只校验不落盘'); process.exit(0) }

// ── 落盘 ──
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) if (f.endsWith('.png') || f.endsWith('.json')) rmSync(join(OUT, f))
for (const [id, buf] of bytes) writeFileSync(join(OUT, `${id}.png`), buf)
// 资源路径改写成扁平文件名，运行时用 import.meta.glob 取
const flat = { ...compact, resources: Object.fromEntries(Object.entries(compact.resources).map(([id, r]) => [id, { ...r, path: `${id}.png` }])) }
writeFileSync(join(OUT, 'catalog.json'), JSON.stringify(flat, null, 2) + '\n')
writeFileSync(join(OUT, 'meta.json'), JSON.stringify({
  source: PACK.replace(RP, '<RandomPet>'),
  artVersion: catalog.artVersion, revision: catalog.revision, rendererVersion: catalog.rendererVersion,
  verifiedAt: new Date().toISOString().slice(0, 10),
  checks: { layers: layers.size, replayed, coverageEquivalent: eq.explicit, compactPlanMatch: catalog.coverage.length },
  islands: islands.map((i) => ({ coat: i.coat, body: i.body, eyes: i.eyes, expressions: i.expressions, closed: i.closed, hatchable: hatchable.some((h) => h.coat === i.coat && h.body === i.body) })),
}, null, 2) + '\n')
console.log(`\n已写入 ${OUT}：catalog.json（${(JSON.stringify(flat).length / 1024).toFixed(1)} KB）+ ${bytes.size} 张 PNG + meta.json`)
