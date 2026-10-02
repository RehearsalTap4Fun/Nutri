/**
 * 把 QMonster 的狗狗像素包（canine-1.0.0 · pixel）装进 nutri：校验 → 复制图层 + 一份精简目录 + 原样合成器。
 *
 *   npx tsx scripts/caninePack.ts [--dist <RandomPet>/dist/canine/approved-1.0.0] [--dry]
 *
 * 只接像素风格（毛绒是 1254px 大图，单文件网页与 2MB 的小程序包都装不下，用户定了这次不接）。
 *
 * 打包前校验，任一不过就拒绝：
 *   1. 交付白名单 delivery.json 的 SHA-256 与交接记录一致；只按白名单取文件，不扫 assets 目录
 *   2. 目录 status 为 approved、schema 与渲染器版本是这份实现认识的
 *   3. 目录 revision = 去掉 revision 后规范 JSON 的 SHA-256（目录没被改过）
 *   4. runtime.mjs 的 SHA-256 = 目录里的 runtimeSha256，原样复制到 src/core/vendor/——合成器不重写
 *   5. 每张 PNG：文件摘要、IHDR 尺寸、解码后 straight RGBA 摘要、二值 alpha
 *      （二值 alpha 是放进场景的前提：场景合成把主体非零 alpha 当作不透明）
 *   6. 每个犬型的部件阵容相同，且与猫的 16 件部件一一对应（成长规则直接复用猫的进化链与品质）
 *
 * 运行时只装 bodies + profiles（resolveCanine 只读这两样），资源的摘要校验留在这里做完。
 */
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalJson } from '../src/core/pixelpack'
import { CAT_SLOT_OPTIONS } from '../src/core/pixelcat'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const args = process.argv.slice(2)
const argOf = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
const RP = resolve(process.env.RANDOMPET_DIR ?? join(ROOT, '..', 'RandomPet-master'))
const DIST = resolve(argOf('--dist') ?? join(RP, 'dist', 'canine', 'approved-1.0.0'))
const OUT = join(ROOT, 'src', 'assets', 'caninepack')
const RUNTIME_OUT = join(ROOT, 'src', 'core', 'vendor', 'canineRuntime.mjs')
const DRY = args.includes('--dry')

/** 交接记录（nutri-codex-exchange.md 2026-09-30）里写明的白名单摘要 */
const DELIVERY_SHA256 = 'dfaec5f74107bddb397d6b2e25027434f5cde24bee3f1d572ea76e81609f58c9'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sharp: (i?: unknown, o?: unknown) => any = createRequire(join(RP, 'package.json'))('sharp')
const sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex')
const fail = (m: string): never => { console.error(`✗ ${m}`); process.exit(1) }

interface Res { path: string; sha256: string; rgbaSha256: string; width: number; height: number; kind: string }
interface Catalog {
  schemaVersion: string; artVersion: string; style: string; status: string; rendererVersion: string; size: number
  runtimeSha256: string; revision: string
  resources: Record<string, Res>
  bodies: Record<string, { resource: string; profile: string; breed: string; body: string; eyes: string; expression: string }>
  profiles: Record<string, { slots: Record<string, Record<string, string>>; clearMasks: Record<string, string>; headMask: string }>
}

const deliveryBytes = readFileSync(join(DIST, 'delivery.json'))
if (sha(deliveryBytes) !== DELIVERY_SHA256) fail(`delivery.json 摘要与交接记录不符：${sha(deliveryBytes)}`)
const delivery = JSON.parse(deliveryBytes.toString('utf8')) as { files: Array<{ path: string; sha256: string }> }
const whitelist = new Map(delivery.files.map((f) => [f.path, f.sha256]))
console.log(`✓ 交付白名单 ${delivery.files.length} 个文件，摘要与交接一致`)

const c = JSON.parse(readFileSync(join(DIST, 'pixel', 'catalog.approved.json'), 'utf8')) as Catalog
if (c.schemaVersion !== 'canine-layer-catalog-v1') fail(`不认识的 schema：${c.schemaVersion}`)
if (c.style !== 'pixel' || c.size !== 64) fail('这里只接 64px 的像素风格')
if (c.status !== 'approved') fail(`目录不是 approved：${c.status}`)
if (c.rendererVersion !== 'canine-rgba-v1') fail(`不认识的渲染器：${c.rendererVersion}`)
const { revision, ...signed } = c
if (sha(canonicalJson(signed)) !== revision) fail('目录 revision 与内容不符')
console.log(`✓ 目录 ${c.schemaVersion} · ${c.artVersion} · ${c.status} · revision ${revision.slice(0, 12)}…`)

const runtimeBytes = readFileSync(join(DIST, 'runtime.mjs'))
if (sha(runtimeBytes) !== c.runtimeSha256) fail('runtime.mjs 摘要与目录的 runtimeSha256 不符')
if (whitelist.get('runtime.mjs') !== c.runtimeSha256) fail('runtime.mjs 不在白名单里或摘要不符')
console.log(`✓ 合成器 runtime.mjs 摘要一致（${c.runtimeSha256.slice(0, 12)}…），原样复制`)

const files: Array<{ id: string; bytes: Buffer }> = []
for (const [id, r] of Object.entries(c.resources)) {
  if (whitelist.get(r.path) !== r.sha256) fail(`${r.path} 不在白名单里或摘要不符`)
  const bytes = readFileSync(join(DIST, r.path))
  if (sha(bytes) !== r.sha256) fail(`PNG 摘要不符：${r.path}`)
  if (bytes.readUInt32BE(16) !== 64 || bytes.readUInt32BE(20) !== 64 || r.width !== 64 || r.height !== 64) fail(`尺寸不是 64×64：${r.path}`)
  const d: Buffer = await sharp(bytes).ensureAlpha().raw().toBuffer()
  if (d.length !== 64 * 64 * 4) fail(`解码尺寸不对：${r.path}`)
  if (sha(d) !== r.rgbaSha256) fail(`RGBA 摘要不符：${r.path}`)
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 0 && d[i] !== 255) fail(`alpha 不是二值：${r.path}`)
  files.push({ id, bytes })
}
console.log(`✓ ${files.length} 张图层：文件摘要／尺寸／RGBA 摘要／二值 alpha`)

// 部件阵容：每个犬型一样，且与猫的五个部件槽一一对应
const catParts = Object.fromEntries((['crown', 'ears', 'neck', 'back', 'tailTip'] as const).map((s) => [s, (CAT_SLOT_OPTIONS[s] as readonly string[]).filter((v) => v !== 'none').sort()]))
for (const [pid, p] of Object.entries(c.profiles)) {
  for (const [slot, want] of Object.entries(catParts)) {
    const have = Object.keys(p.slots[slot] ?? {}).sort()
    if (have.join() !== want.join()) fail(`${pid} 的 ${slot} 部件 [${have}] 与猫的 [${want}] 不一致`)
  }
  for (const id of [...Object.values(p.slots).flatMap((m) => Object.values(m)), ...Object.values(p.clearMasks), p.headMask]) {
    if (!c.resources[id]) fail(`${pid} 引用了不存在的资源 ${id}`)
  }
}
for (const [bid, b] of Object.entries(c.bodies)) {
  if (!c.resources[b.resource]) fail(`${bid} 的主体图不存在`)
  if (!c.profiles[b.profile]) fail(`${bid} 的 profile 不存在`)
}
console.log(`✓ ${Object.keys(c.profiles).length} 个犬型的部件阵容一致，与猫的 16 件一一对应；${Object.keys(c.bodies).length} 个主体全部可解析`)

// 精简目录：resolveCanine 读的字段 + 身份。resources 只留 id 列表供打包校验，摘要已在上面核完
const compact = {
  schemaVersion: c.schemaVersion, artVersion: c.artVersion, style: c.style, status: c.status,
  rendererVersion: c.rendererVersion, size: c.size, revision, runtimeSha256: c.runtimeSha256,
  bodies: c.bodies,
  profiles: Object.fromEntries(Object.entries(c.profiles).map(([k, p]) => [k, { slots: p.slots, clearMasks: p.clearMasks, headMask: p.headMask }])),
  resourceIds: files.map((f) => f.id).sort(),
}
const meta = {
  source: '<RandomPet>/dist/canine/approved-1.0.0/pixel',
  artVersion: c.artVersion, revision, rendererVersion: c.rendererVersion, runtimeSha256: c.runtimeSha256,
  deliverySha256: DELIVERY_SHA256, verifiedAt: new Date().toISOString().slice(0, 10),
  checks: { resources: files.length, bodies: Object.keys(c.bodies).length, profiles: Object.keys(c.profiles).length },
}

if (DRY) { console.log('（--dry：只校验，不写文件）'); process.exit(0) }
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
for (const f of files) writeFileSync(join(OUT, `${f.id}.png`), f.bytes)
writeFileSync(join(OUT, 'catalog.json'), JSON.stringify(compact))
writeFileSync(join(OUT, 'meta.json'), JSON.stringify(meta, null, 2) + '\n')
mkdirSync(dirname(RUNTIME_OUT), { recursive: true })
copyFileSync(join(DIST, 'runtime.mjs'), RUNTIME_OUT)
const pngBytes = files.reduce((n, f) => n + f.bytes.length, 0)
console.log(`\n已写入 ${OUT}：catalog.json（${(JSON.stringify(compact).length / 1024).toFixed(1)} KB）+ ${files.length} 张 PNG（${(pngBytes / 1024).toFixed(1)} KB）`)
console.log(`合成器 → ${RUNTIME_OUT}`)
