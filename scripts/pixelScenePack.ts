/**
 * 把 QMonster 的场景包装进 nutri：校验 → 复制 3 张背景 + 一份精简目录到 src/assets/pixelscene。
 *
 *   npx tsx scripts/pixelScenePack.ts [--scene <dir>] [--pack <猫包 dir>] [--out src/assets/pixelscene] [--dry]
 *
 * 和猫包那个 `pixelPackBundle.ts` 分开，因为两者的压缩前提不一样：
 * 猫包能压是因为 coverage 恰好等于 profile 的笛卡尔积；场景包压根没有 coverage 网格——
 * 背景与猫之间没有逐组合的遮挡关系，叠加是机械的，所以目录本来就小，原样带上即可。
 *
 * 打包前校验：
 *   1. 目录 schema／renderer／描边参数（描边写在目录里、实现在我们这边，飘开了不会报错只会画错）
 *   2. 每张背景 PNG 的 sha256、IHDR 尺寸、解码后二值 alpha
 *   3. 背景声明的尺寸 = 场景画布尺寸
 *   4. 场景声明依赖的猫包 revision 与本地装着的猫包一致（场景是叠在猫上的，猫换了场景摘要就不作数）
 */
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isSceneCatalog, type SceneCatalog } from '../src/core/pixelscene'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const args = process.argv.slice(2)
const argOf = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
const RP = resolve(process.env.RANDOMPET_DIR ?? join(ROOT, '..', 'RandomPet-master'))
const SCENE = resolve(argOf('--scene') ?? join(RP, 'dist', 'pixel-scene', 'backdrop-candidate'))
const OUT = resolve(argOf('--out') ?? join(ROOT, 'src', 'assets', 'pixelscene'))
const DRY = args.includes('--dry')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sharp: (i?: unknown, o?: unknown) => any = createRequire(join(RP, 'package.json'))('sharp')
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')

const fail = (m: string): never => { console.error(`✗ ${m}`); process.exit(1) }

const raw: unknown = JSON.parse(readFileSync(join(SCENE, 'catalog.json'), 'utf8'))
if (!isSceneCatalog(raw)) fail('场景目录不符合 pixel-scene-catalog-v1（schema／renderer／描边参数任一不符都会到这里）')
const c: SceneCatalog = raw as SceneCatalog
console.log(`✓ 目录 ${c.schemaVersion} · ${c.sceneVersion} · renderer ${c.rendererVersion} · revision ${c.revision.slice(0, 12)}…`)
console.log(`✓ 描边归渲染器：${c.outline.neighborhood} 邻 ${c.outline.width}px × ${c.outline.factor}`)

const files: Array<{ name: string; bytes: Buffer }> = []
for (const [id, res] of Object.entries(c.resources)) {
  const bytes = readFileSync(join(SCENE, res.path))
  if (sha(bytes) !== res.sha256) fail(`背景 PNG 摘要不一致: ${res.path}`)
  if (bytes.readUInt32BE(16) !== res.width || bytes.readUInt32BE(20) !== res.height) fail(`背景 PNG 尺寸不一致: ${res.path}`)
  if (res.width !== c.canvas.width || res.height !== c.canvas.height) fail(`背景 ${id} 尺寸 ${res.width}×${res.height} 与画布 ${c.canvas.width}×${c.canvas.height} 不符`)
  const d: Buffer = await sharp(bytes).ensureAlpha().raw().toBuffer()
  const px = new Uint8ClampedArray(d.buffer, d.byteOffset, d.length)
  if (px.length !== res.width * res.height * 4) fail(`背景解码尺寸不对: ${res.path}`)
  for (let i = 3; i < px.length; i += 4) if (px[i] !== 0 && px[i] !== 255) fail(`背景 alpha 不是二值: ${res.path}`)
  files.push({ name: `${id}.png`, bytes })
}
console.log(`✓ ${files.length} 张背景：摘要／尺寸／二值 alpha`)

// 场景是叠在猫上的：猫包对不上，QMonster 那边算出来的场景摘要就不作数
const catMeta = JSON.parse(readFileSync(join(ROOT, 'src', 'assets', 'pixelpack', 'meta.json'), 'utf8')) as { revision: string; artVersion: string }
const want = (c as unknown as { validatedSubject?: { revision?: string; artVersion?: string } }).validatedSubject
if (want?.revision && want.revision !== catMeta.revision) {
  fail(`场景声明依赖猫包 ${want.artVersion}（${want.revision.slice(0, 12)}…），本地装的是 ${catMeta.artVersion}（${catMeta.revision.slice(0, 12)}…）。先换猫包。`)
}
console.log(`✓ 依赖的猫包一致：${catMeta.artVersion}`)

if (DRY) { console.log('\n--dry：未写入'); process.exit(0) }

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
for (const f of files) writeFileSync(join(OUT, f.name), f.bytes)
writeFileSync(join(OUT, 'catalog.json'), JSON.stringify(c))
writeFileSync(join(OUT, 'meta.json'), JSON.stringify({
  source: SCENE.replace(RP, '<RandomPet>'),
  sceneVersion: c.sceneVersion,
  revision: c.revision,
  rendererVersion: c.rendererVersion,
  subjectArtVersion: catMeta.artVersion,
  verifiedAt: new Date().toISOString().slice(0, 10),
  checks: { backdrops: files.length, canvas: `${c.canvas.width}x${c.canvas.height}`, anchor: c.subject.anchor },
}, null, 2))
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`
console.log(`\n已写入 ${OUT}：catalog.json（${kb(JSON.stringify(c).length)}）+ ${files.length} 张 PNG（${kb(files.reduce((n, f) => n + f.bytes.length, 0))}）`)
console.log(readdirSync(OUT).join('  '))
