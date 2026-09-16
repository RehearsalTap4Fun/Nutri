/**
 * QMonster 像素包接入验证（契约方案 b）：构建期校验目录 revision 与每张 PNG 摘要/尺寸/二值 alpha，
 * 再用 nutri 自己的 composePlan 按 profile 合成目录里全部 coverage 组合，逐个比对 rgbaSha256（原生 RGBA，不比 PNG 文件）。
 *
 *   npx tsx scripts/pixelPackReplay.ts [--pack ../RandomPet-master/dist/pixel-art/approved] [--preview out.png]
 *
 * 任一组合不一致即退出码 1。sharp 仍从 RandomPet 的 node_modules 借。
 */
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PIXEL_PACK_SIZE, catalogRevisionInput, isPixelCatalog, planPixelArt, type PixelCatalog } from '../src/core/pixelpack'
import { composePlan, type Rgba } from '../src/core/pixelize'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const RP = resolve(process.env.RANDOMPET_DIR ?? join(ROOT, '..', 'RandomPet-master'))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sharp: (input?: unknown, opts?: unknown) => any = createRequire(join(RP, 'package.json'))('sharp')

const args = process.argv.slice(2)
const argOf = (name: string): string | undefined => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const PACK = resolve(argOf('--pack') ?? join(RP, 'dist', 'pixel-art', 'approved'))
const sha256 = (b: Uint8Array | Uint8ClampedArray) => createHash('sha256').update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)).digest('hex')
const N = PIXEL_PACK_SIZE

const catalogFile = join(PACK, 'catalog.json')
if (!existsSync(catalogFile)) throw new Error(`找不到 ${catalogFile}（先在 RandomPet 里 npm run build:pixel）`)
const raw: unknown = JSON.parse(readFileSync(catalogFile, 'utf8'))
if (!isPixelCatalog(raw)) throw new Error('catalog.json 不是 pixel-art-catalog-v1')
const catalog: PixelCatalog = raw

// 1. 目录 revision
const rev = sha256(Buffer.from(catalogRevisionInput(catalog)))
if (rev !== catalog.revision) throw new Error(`目录 revision 不一致：算得 ${rev}，目录写 ${catalog.revision}`)
console.log(`目录 ${catalog.styleId} ${catalog.artVersion} · rendererVersion ${catalog.rendererVersion} · revision ${catalog.revision.slice(0, 12)}… 校验通过`)

// 2. PNG 摘要、IHDR 尺寸、解码后二值 alpha
const layers = new Map<string, Rgba>()
for (const [id, res] of Object.entries(catalog.resources)) {
  const bytes = readFileSync(join(PACK, res.path))
  if (sha256(bytes) !== res.sha256) throw new Error(`PNG 摘要不一致: ${res.path}`)
  if (bytes.readUInt32BE(16) !== res.width || bytes.readUInt32BE(20) !== res.height) throw new Error(`PNG 尺寸不一致: ${res.path}`)
  const decoded: Buffer = await sharp(bytes).ensureAlpha().raw().toBuffer()
  const px = new Uint8ClampedArray(decoded.buffer, decoded.byteOffset, decoded.length)
  if (px.length !== N * N * 4) throw new Error(`解码尺寸不对: ${res.path}`)
  for (let i = 3; i < px.length; i += 4) if (px[i] !== 0 && px[i] !== 255) throw new Error(`alpha 不是二值: ${res.path}`)
  layers.set(id, px)
}
console.log(`${layers.size} 张图层摘要/尺寸/二值 alpha 校验通过`)

// 3. 回放
let pass = 0
const results: Array<{ id: string; ok: boolean; px: Rgba }> = []
for (const c of catalog.coverage) {
  const plan = planPixelArt(catalog, c.phenotype)
  if (!plan) { console.log(`✗ ${c.id}: 生成计划失败（资源缺失或 profile 缺失）`); results.push({ id: c.id, ok: false, px: new Uint8ClampedArray(N * N * 4) }); continue }
  const px = composePlan(plan.ops, (id) => { const l = layers.get(id); if (!l) throw new Error(`缺图层 ${id}`); return l }, N)
  const ok = sha256(px) === c.rgbaSha256
  if (ok) pass++
  console.log(`${ok ? '✓' : '✗'} ${c.id.padEnd(26)} ${c.label}${ok ? '' : `  算得 ${sha256(px).slice(0, 12)}… 目录 ${c.rgbaSha256.slice(0, 12)}…`}`)
  results.push({ id: c.id, ok, px })
}
// 输入图层未被修改
for (const [id, res] of Object.entries(catalog.resources)) {
  const decoded: Buffer = await sharp(readFileSync(join(PACK, res.path))).ensureAlpha().raw().toBuffer()
  if (Buffer.compare(decoded, Buffer.from(layers.get(id)!.buffer, layers.get(id)!.byteOffset, layers.get(id)!.length)) !== 0) throw new Error(`图层在合成过程中被改动: ${id}`)
}
console.log(`回放 ${pass}/${catalog.coverage.length} 一致；可生成白名单 ${catalog.generatable.length} 条；输入图层未被修改`)

const pv = argOf('--preview')
if (pv) {
  const up = 4
  const tile = N * up + 16
  const cols = 5
  const rows = Math.ceil(results.length / cols)
  const label = (text: string) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="22"><text x="${tile / 2}" y="15" font-size="11" text-anchor="middle" font-family="Helvetica" fill="#2c2e2a">${text}</text></svg>`)
  const tiles: Array<{ input: Buffer; left: number; top: number }> = []
  for (const [i, r] of results.entries()) {
    const png: Buffer = await sharp(Buffer.from(r.px.buffer, r.px.byteOffset, r.px.length), { raw: { width: N, height: N, channels: 4 } }).resize(N * up, N * up, { kernel: 'nearest' }).png().toBuffer()
    const x = (i % cols) * tile, y = Math.floor(i / cols) * (tile + 22)
    tiles.push({ input: png, left: x + 8, top: y + 8 }, { input: label(`${r.ok ? '✓' : '✗'} ${r.id}`), left: x, top: y + N * up + 10 })
  }
  await sharp({ create: { width: cols * tile, height: rows * (tile + 22), channels: 4, background: '#EDE6D6' } }).composite(tiles).png().toFile(resolve(pv))
  console.log(`预览已写到 ${resolve(pv)}`)
}
if (pass !== catalog.coverage.length) process.exit(1)
