/**
 * 健康小管家「像素猫」离线素材脚本（试验用）。
 * 输入：RandomPet master 的 v0.10 小猫组合素材（6 花纹 × 3 表情主体 + 11 件异变，共 44 张 1254×1254 PNG）。
 * 输出：<out>/<resourceId>.png（N×N 像素图层，已把模板×注册的定位变换预先应用到最终坐标）+ manifest.json。
 *
 * 像素化流水线（每张图层）：
 *   1254 最终坐标 → lanczos 缩到 4N → 两次 3×3 中值滤波（抹掉毛发纹理，保住边缘）→ lanczos 缩到 N-2
 *   → 饱和度 +10% → 四周留 1px 透明边（给描边用）→ alpha 二值化 → 限成小色板（主体 14 色、部件 8 色，不抖动）→ 去斑两遍
 * 运行时只需按 SDK 同样的层序叠图层 + 1px 选择性描边（src/core/pixelize.ts），再按 2 倍整数放大显示。
 *
 *   npm run pixelcat                                  # 生成到 src/assets/pixelcat（默认 N=64，显示按 2 倍 = 128px）
 *   npm run pixelcat -- --size 56 --out /tmp/p56      # 生成别的档位到别处（对比过 48/56/64：48 脸糊，56 眼睛勉强，64 稳）
 *   npm run pixelcat -- --preview out.png [--out dir] # 用运行时同一份 composeSprite 出对比图
 *   npm run pixelcat -- --source <dir>                # 平涂源图入口：<dir>/<resourceId>.png（1254 最终坐标，可带纯色底）
 *                                                     #   有的图层用平涂源，没有的回退毛绒版，方便小批验证
 *   npm run pixelcat -- --reference <dir>             # 输出 44 张最终坐标的毛绒参考图（给出图时当定位参考）
 *   npm run pixelcat -- --check <solid 目录>            # 收图检查：尺寸/抠底/剪影对齐/清除区覆盖/露出量/色数，输出对比叠加图与报告
 *                                                     #   几何豁免：读 <solid>/../geometry-exceptions.json（或 --exceptions <file>），
 *                                                     #   命中 assetId（且 sourceSha256 一致）的 geometryChanged 条目只跳过位置/剪影项
 *   npm run pixelcat -- --preview out.png --compare dirA,dirB   # 两套生成目录（各自 --out 的产物）同一只猫并排对比
 *
 * 依赖 sharp：从 RandomPet 仓库的 node_modules 里借用，nutri 自己不装（这是偶尔跑一次的美术工具）。
 * 模板几何来自 RandomPet packages/renderer-canvas/src/feline-combination-render.ts 的 FELINE_COMBINATION_TEMPLATE_V1，
 * 注册参数来自同目录 feline-combination-registration.json。
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cornerColor, despeckleRgba, hardenAlpha, insidePolygon, keyBackgroundRgba, type Rgba } from '../src/core/pixelize'
import { composeSprite, type ClearRegions } from '../src/core/pixelcatPlush'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const RP = resolve(process.env.RANDOMPET_DIR ?? join(ROOT, '..', 'RandomPet-master'))
const CANVAS = 1254
const SCALE = 2

const args = process.argv.slice(2)
const argOf = (name: string): string | undefined => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const SIZE = Number(argOf('--size') ?? 64)
const OUT = resolve(argOf('--out') ?? join(ROOT, 'src', 'assets', 'pixelcat'))
const SOURCE = argOf('--source') ? resolve(argOf('--source')!) : null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sharp = any
const requireFromRandomPet = createRequire(join(RP, 'package.json'))
const sharp: (input?: unknown, opts?: unknown) => Sharp = requireFromRandomPet('sharp')

type Pt = [number, number]
interface Transform { scaleX: number; scaleY: number; translateX: number; translateY: number }
const IDENTITY: Transform = { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 }
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

/** 与 RandomPet FELINE_COMBINATION_TEMPLATE_V1 一致（1254 坐标） */
const TEMPLATE = {
  ears: [
    [[210, 0], [490, 0], [470, 190], [220, 290]],
    [[625, 0], [940, 0], [900, 410], [660, 200]],
  ] as Pt[][],
  tailTip: [[895, 350], [1254, 350], [1254, 1160], [930, 1160], [948, 1060], [957, 940], [960, 830], [937, 730], [895, 690]] as Pt[],
  transforms: {
    'dragon-horns': { scaleX: 0.68, scaleY: 0.68, translateX: 137, translateY: -24 },
    antlers: { scaleX: 0.39, scaleY: 0.39, translateX: 310, translateY: -90 },
    'fin-ears': { scaleX: 0.63, scaleY: 0.55, translateX: 150, translateY: 20 },
    'small-wings': { scaleX: 0.8, scaleY: 0.75, translateX: 75, translateY: 200 },
    'small-lion-mane': { scaleX: 0.72, scaleY: 0.38, translateX: 60, translateY: 470 },
    'forked-tail-tip': { scaleX: 0.69, scaleY: 0.875, translateX: 376, translateY: 97 },
  } as Record<string, Transform>,
  /** 这三件按花纹各出一张，模板变换之上还要叠一层按花纹的注册变换 */
  coatBound: ['fin-ears', 'small-lion-mane', 'forked-tail-tip'],
}

interface Catalog {
  catalogVersion: string
  templateVersion: string
  resources: Record<string, { id: string; path: string }>
  mutations: Record<string, Record<string, string>>
}

const COATS = ['brown-tabby', 'orange-white', 'tuxedo', 'calico', 'colorpoint', 'rosetted']
const EXPRESSIONS = ['parted-mouth', 'small-fangs', 'tongue-tip']

function combine(t: Transform, a: Transform): Transform {
  return {
    scaleX: t.scaleX * a.scaleX,
    scaleY: t.scaleY * a.scaleY,
    translateX: t.translateX + t.scaleX * a.translateX,
    translateY: t.translateY + t.scaleY * a.translateY,
  }
}

/** 把一张 1254 图层按 scale+translate 摆到最终坐标（越界部分裁掉），返回 1254 画布 PNG */
async function placeLayer(pngPath: string, t: Transform): Promise<Buffer> {
  const isIdentity = t.scaleX === 1 && t.scaleY === 1 && t.translateX === 0 && t.translateY === 0
  if (isIdentity) return readFileSync(pngPath)
  const w = Math.round(CANVAS * t.scaleX)
  const h = Math.round(CANVAS * t.scaleY)
  const tx = Math.round(t.translateX)
  const ty = Math.round(t.translateY)
  const left = Math.max(0, tx), top = Math.max(0, ty)
  const right = Math.min(CANVAS, tx + w), bottom = Math.min(CANVAS, ty + h)
  if (right <= left || bottom <= top) throw new Error(`图层完全落在画布外: ${pngPath}`)
  const part = await sharp(pngPath).resize(w, h, { fit: 'fill' })
    .extract({ left: left - tx, top: top - ty, width: right - left, height: bottom - top }).png().toBuffer()
  // sharp 管线里 resize 先于 composite 执行，合成结果先落成 buffer 再另起管线
  return sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: TRANSPARENT } })
    .composite([{ input: part, left, top }]).png().toBuffer()
}

/** 像素化：多级去纹理 → 缩到 N-2 → 提饱和 → 留 1px 边 → 硬边 → 小色板 → 去斑 → 小色板 PNG */
async function pixelate(png1254: Buffer, colours: number, flat = false): Promise<Buffer> {
  const inner = SIZE - 2
  // 毛绒源：4N 上做 5×5 + 3×3 中值，2N 上再做一次 3×3，毛发纹理在缩到 N 之前就被抹平；
  // 平涂源：本来就是色块加粗线，只在 4N 上做一次 3×3 去掉生成噪点，保住线条
  const s4 = await sharp(png1254).resize(SIZE * 4, SIZE * 4, { kernel: 'lanczos3' }).png().toBuffer()
  const s4b = flat
    ? await sharp(s4).median(3).png().toBuffer()
    : await sharp(await sharp(s4).median(5).png().toBuffer()).median(3).png().toBuffer()
  const s2 = await sharp(s4b).resize(SIZE * 2, SIZE * 2, { kernel: 'lanczos3' }).png().toBuffer()
  const s2a = flat ? s2 : await sharp(s2).median(3).png().toBuffer()
  const small = await sharp(s2a).resize(inner, inner, { kernel: 'lanczos3' }).modulate({ saturation: flat ? 1.03 : 1.12 }).png().toBuffer()
  const raw: Buffer = await sharp(small)
    .extend({ top: 1, bottom: 1, left: 1, right: 1, background: TRANSPARENT })
    .ensureAlpha().raw().toBuffer()
  const rgba = hardenAlpha(new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.length))
  const asPng = (px: Uint8ClampedArray) =>
    sharp(Buffer.from(px.buffer, px.byteOffset, px.length), { raw: { width: SIZE, height: SIZE, channels: 4 } })
      .png({ palette: true, colours, dither: 0, compressionLevel: 9 }).toBuffer()
  // 先限色，再在色板图上去两遍斑（只合并低对比碎点），最后再按同一色板数落盘
  const quantized: Buffer = await sharp(await asPng(rgba)).ensureAlpha().raw().toBuffer()
  let px = new Uint8ClampedArray(quantized.buffer, quantized.byteOffset, quantized.length)
  px = despeckleRgba(despeckleRgba(px, SIZE), SIZE)
  return asPng(px)
}

/** 平涂源图：要求正方形，缩到 1254；没有真实 alpha（或全不透明）时按四角色抠纯色底 */
async function loadFlatSource(path: string): Promise<Buffer> {
  const meta = await sharp(path).metadata()
  if (!meta.width || meta.width !== meta.height) throw new Error(`平涂源图必须是正方形: ${path}`)
  const raw: Buffer = await sharp(path).resize(CANVAS, CANVAS, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer()
  const rgba = new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.length)
  let opaque = true
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 250) { opaque = false; break }
  const keyed = opaque ? keyBackgroundRgba(rgba, CANVAS, CANVAS, { threshold: 90, erode: 3 }) : rgba
  return sharp(Buffer.from(keyed.buffer, keyed.byteOffset, keyed.length), { raw: { width: CANVAS, height: CANVAS, channels: 4 } }).png().toBuffer()
}

async function generate(): Promise<void> {
  const catalogFile = join(RP, 'packages/asset-catalog/catalog/v0.10.0/catalog.json')
  if (!existsSync(catalogFile)) throw new Error(`找不到 RandomPet 目录文件 ${catalogFile}（可用 RANDOMPET_DIR 指定仓库位置）`)
  const catalog = JSON.parse(readFileSync(catalogFile, 'utf8')) as Catalog
  const registration = JSON.parse(readFileSync(join(RP, 'packages/renderer-canvas/src/feline-combination-registration.json'), 'utf8')) as Record<string, Transform>
  let runtimeRevision = ''
  const snapshot = join(RP, 'dist/hatchery/snapshot.json')
  if (existsSync(snapshot)) runtimeRevision = (JSON.parse(readFileSync(snapshot, 'utf8')) as { runtimeRevision?: string }).runtimeRevision ?? ''

  // 图层任务：resourceId → 变换。同一资源在不同花纹下变换相同（花纹绑定件的 resourceId 本身含花纹）
  const jobs = new Map<string, Transform>()
  for (const coat of COATS) {
    for (const expr of EXPRESSIONS) {
      const id = `${coat}-${expr}`
      if (!catalog.resources[id]) throw new Error(`目录缺主体资源 ${id}`)
      jobs.set(id, IDENTITY)
    }
    for (const [mutation, resourceId] of Object.entries(catalog.mutations[coat] ?? {})) {
      if (!catalog.resources[resourceId]) throw new Error(`目录缺异变资源 ${resourceId}`)
      let t = TEMPLATE.transforms[mutation] ?? IDENTITY
      if (TEMPLATE.coatBound.includes(mutation)) {
        const authored = registration[`${coat}-${mutation}`]
        if (!authored) throw new Error(`缺注册参数 ${coat}-${mutation}`)
        t = combine(t, authored)
      }
      const prev = jobs.get(resourceId)
      if (prev && JSON.stringify(prev) !== JSON.stringify(t)) throw new Error(`资源 ${resourceId} 在不同花纹下变换不一致`)
      jobs.set(resourceId, t)
    }
  }

  mkdirSync(OUT, { recursive: true })
  for (const f of readdirSync(OUT)) if (f.endsWith('.png')) rmSync(join(OUT, f))
  const bodies = new Set(COATS.flatMap((c) => EXPRESSIONS.map((e) => `${c}-${e}`)))
  const layers: Record<string, string> = {}
  const flatLayers: string[] = []
  let total = 0
  for (const [id, t] of jobs) {
    const flatFile = SOURCE ? join(SOURCE, `${id}.png`) : null
    const useFlat = flatFile !== null && existsSync(flatFile)
    const placed = useFlat ? await loadFlatSource(flatFile!) : await placeLayer(join(RP, catalog.resources[id].path), t)
    const buf = await pixelate(placed, bodies.has(id) ? (useFlat ? 12 : 14) : (useFlat ? 6 : 8), useFlat)
    writeFileSync(join(OUT, `${id}.png`), buf)
    layers[id] = `${id}.png`
    if (useFlat) flatLayers.push(id)
    total += buf.length
  }
  // 清除多边形：与图层同一变换（缩到 N-2 再平移 1px）
  const k = (SIZE - 2) / CANVAS
  const scalePoly = (poly: Pt[]) => poly.map(([x, y]) => [Math.round((x * k + 1) * 100) / 100, Math.round((y * k + 1) * 100) / 100] as Pt)
  const manifest = {
    source: {
      runtimeRevision, catalogVersion: catalog.catalogVersion, templateVersion: catalog.templateVersion,
      ...(SOURCE ? { flatSource: SOURCE, flatLayers } : {}),
    },
    size: SIZE,
    scale: SCALE,
    coats: COATS,
    expressions: EXPRESSIONS,
    layers,
    mutations: Object.fromEntries(COATS.map((c) => [c, catalog.mutations[c]])),
    clear: { ears: TEMPLATE.ears.map(scalePoly), tailTip: scalePoly(TEMPLATE.tailTip) },
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  const flatNote = SOURCE ? `，其中 ${flatLayers.length} 张来自平涂源图（${flatLayers.join(', ') || '无'}）` : ''
  console.log(`已生成 ${jobs.size} 张 ${SIZE}px 图层，共 ${(total / 1024).toFixed(0)} KB → ${OUT}${flatNote}`)
}

/** 预览：用运行时同一份 renderOps + composeSprite，在 Node 里复现合成结果 */
/** 读入一个生成目录的全部图层（sharp 解码是异步的，先解好再给同步的 composeSprite 用） */
async function loadLayerDir(dir: string): Promise<{ n: number; clear: ClearRegions; layerOf: (id: string) => Rgba }> {
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as { size: number; clear: ClearRegions }
  const cache = new Map<string, Rgba>()
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.png')) continue
    const raw: Buffer = await sharp(join(dir, f)).ensureAlpha().raw().toBuffer()
    cache.set(f.slice(0, -4), new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.length))
  }
  return {
    n: manifest.size, clear: manifest.clear,
    layerOf: (id) => { const px = cache.get(id); if (!px) throw new Error(`${dir} 缺图层 ${id}`); return px },
  }
}

async function preview(outFile: string, dirs: string[]): Promise<void> {
  const { catForCreature } = await import('../src/core/pixelcat')
  const { renderOps } = await import('../src/core/pixelcatPlush')
  const sets = await Promise.all(dirs.map(loadLayerDir))
  const n = sets[0].n
  if (sets.some((s) => s.n !== n)) throw new Error('对比的目录原生尺寸不一致')
  const label = (text: string, w: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="26"><text x="${w / 2}" y="18" font-size="13" text-anchor="middle" font-family="Helvetica" fill="#2c2e2a">${text}</text></svg>`)

  type Spec = Parameters<typeof renderOps>[0]
  const samples: Array<[string, Spec]> = [
    // 批 0 对照：橘白微张嘴母版 + 小龙角 + 焰尾（平涂源图路线的三张）
    ['橘白 · 普通', { coat: 'orange-white', body: 'standard', eyes: 'round', expression: 'parted-mouth', crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none', backdrop: 'none' }],
    ['橘白 · 小龙角+焰尾', { coat: 'orange-white', body: 'standard', eyes: 'round', expression: 'parted-mouth', crown: 'dragon-horns', ears: 'none', neck: 'none', back: 'none', tailTip: 'flame-tail', backdrop: 'none' }],
    ['三花 · 鳍耳+分叉尾', { coat: 'calico', body: 'standard', eyes: 'round', expression: 'parted-mouth', crown: 'none', ears: 'fin-ears', neck: 'none', back: 'none', tailTip: 'forked-tail-tip', backdrop: 'none' }],
    ['棕虎斑 · 鹿角+小狮鬃', { coat: 'brown-tabby', body: 'standard', eyes: 'round', expression: 'small-fangs', crown: 'antlers', ears: 'none', neck: 'small-lion-mane', back: 'none', tailTip: 'none', backdrop: 'none' }],
    ['燕尾服 · 小龙角+小翅膀+焰尾', { coat: 'tuxedo', body: 'standard', eyes: 'round', expression: 'small-fangs', crown: 'dragon-horns', ears: 'none', neck: 'none', back: 'small-wings', tailTip: 'flame-tail', backdrop: 'none' }],
    ['豹点 · 光环+龙翼+颈膜', { coat: 'rosetted', body: 'standard', eyes: 'round', expression: 'parted-mouth', crown: 'halo', ears: 'none', neck: 'frill-neck', back: 'dragon-wings', tailTip: 'none', backdrop: 'none' }],
    ['橘白 · 羽翼', { coat: 'orange-white', body: 'standard', eyes: 'round', expression: 'small-fangs', crown: 'none', ears: 'none', neck: 'none', back: 'feathered-wings', tailTip: 'none', backdrop: 'none' }],
    ['重点色 · 普通', catForCreature({ id: 'demo-2', mutations: 0 })],
  ]
  // 每个目录一栏：2 倍显示（实际大小）+ 5 倍放大；多目录并排即为对比图
  const up2 = 2, up5 = 5
  const colW = n * up2 + n * up5 + 30
  const rowW = colW * sets.length + 20
  const rowH = n * up5 + 44
  const rows: Buffer[] = []
  for (const [name, spec] of samples) {
    const tiles: Array<{ input: Buffer; left: number; top: number }> = []
    for (const [c, set] of sets.entries()) {
      const px = composeSprite(renderOps(spec), set.layerOf, n, set.clear)
      const x0 = 10 + c * colW
      tiles.push({ input: await toPng(px, n, up2), left: x0, top: 10 })
      tiles.push({ input: await toPng(px, n, up5), left: x0 + n * up2 + 10, top: 6 })
      tiles.push({ input: label(`${name} · ${dirs.length > 1 ? dirs[c].split('/').pop() + ' · ' : ''}${n}px ×${up2} | ×${up5}`, colW), left: x0 - 10, top: rowH - 30 })
    }
    rows.push(await sharp({ create: { width: rowW, height: rowH, channels: 4, background: '#EDE6D6' } }).composite(tiles).png().toBuffer())
  }
  await sharp({ create: { width: rowW, height: rowH * rows.length, channels: 4, background: '#EDE6D6' } })
    .composite(rows.map((r, i) => ({ input: r, left: 0, top: i * rowH }))).png().toFile(outFile)
  console.log(`预览已写到 ${outFile}（${n}px，${dirs.length} 个目录）`)
}

/** 最近邻整数放大成 PNG */
function toPng(px: Rgba, n: number, up: number): Promise<Buffer> {
  return sharp(Buffer.from(px.buffer, px.byteOffset, px.length), { raw: { width: n, height: n, channels: 4 } })
    .resize(n * up, n * up, { kernel: 'nearest' }).png().toBuffer()
}

/** 部件 id → 位置（与 src/core/pixelcat.ts 一致） */
const PART_SLOT: Record<string, 'crown' | 'ears' | 'neck' | 'back' | 'tailTip'> = {
  'dragon-horns': 'crown', antlers: 'crown', halo: 'crown',
  'fin-ears': 'ears',
  'small-lion-mane': 'neck', 'frill-neck': 'neck',
  'small-wings': 'back', 'feathered-wings': 'back', 'dragon-wings': 'back',
  'forked-tail-tip': 'tailTip', 'flame-tail': 'tailTip',
}

/** 解析资源 id：主体 / 绑花纹部件 / 通用部件 */
function parseId(id: string): { kind: 'body'; coat: string; expression: string } | { kind: 'part'; coat: string | null; mutation: string } | null {
  if (PART_SLOT[id]) return { kind: 'part', coat: null, mutation: id }
  for (const coat of COATS) {
    if (!id.startsWith(`${coat}-`)) continue
    const rest = id.slice(coat.length + 1)
    if (EXPRESSIONS.includes(rest)) return { kind: 'body', coat, expression: rest }
    if (PART_SLOT[rest]) return { kind: 'part', coat, mutation: rest }
  }
  return null
}

const alphaMask = (px: Rgba): Uint8Array => { const m = new Uint8Array(px.length / 4); for (let i = 0; i < m.length; i++) m[i] = px[i * 4 + 3] >= 128 ? 1 : 0; return m }
const rawOf = async (png: Buffer): Promise<Rgba> => { const raw: Buffer = await sharp(png).ensureAlpha().raw().toBuffer(); return new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.length) }
function maskStats(m: Uint8Array, n: number) {
  let count = 0, sx = 0, sy = 0, minX = n, minY = n, maxX = -1, maxY = -1
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y * n + x]) { count++; sx += x; sy += y; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
  return { count, cx: count ? sx / count : 0, cy: count ? sy / count : 0, bbox: count ? [minX, minY, maxX, maxY] : null }
}
function polygonMask(n: number, polys: readonly (readonly (readonly number[])[])[]): Uint8Array {
  const m = new Uint8Array(n * n)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (polys.some((p) => insidePolygon(x + 0.5, y + 0.5, p))) m[y * n + x] = 1
  return m
}

/**
 * 收图检查：对 <dir>/<id>.png 逐张验收，把肉眼不可靠的几项量化：
 * 尺寸与抠底、剪影与毛绒版的重合率/质心偏移（主体必须逐像素对齐，否则清除多边形会露馅）、
 * 换耳换尾件对清除区的覆盖率、部件露出身体轮廓的面积（换算成 64px 下的像素数）、色数（疑似渐变）。
 * 每张输出一张剪影叠加图到 <dir>/../check/，并写 check-report.json。
 */
/** 几何豁免登记（与 Codex 约定的格式）：有意改形的部件跳过位置/剪影对齐检查，其余检查照常 */
interface GeometryException { assetId: string; sourceSha256?: string; geometryChanged: boolean; reason: string; exempt?: string[] }
function loadExceptions(dir: string): GeometryException[] {
  const file = argOf('--exceptions') ?? join(dir, '..', 'geometry-exceptions.json')
  if (!existsSync(file)) return []
  const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown
  return Array.isArray(raw) ? (raw as GeometryException[]).filter((e) => e && typeof e.assetId === 'string') : []
}

async function check(dir: string): Promise<void> {
  const catalog = JSON.parse(readFileSync(join(RP, 'packages/asset-catalog/catalog/v0.10.0/catalog.json'), 'utf8')) as Catalog
  const exceptions = loadExceptions(dir)
  const { createHash } = await import('node:crypto')
  const registration = JSON.parse(readFileSync(join(RP, 'packages/renderer-canvas/src/feline-combination-registration.json'), 'utf8')) as Record<string, Transform>
  const outDir = join(dir, '..', 'check')
  mkdirSync(outDir, { recursive: true })
  const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
  if (files.length === 0) { console.log(`目录里没有 PNG: ${dir}`); return }
  const OUT_PX = (SIZE - 2) / CANVAS // 1254 → 64px 图层的比例（留 1px 边）
  const report: Record<string, unknown>[] = []
  const bodyMaskCache = new Map<string, Uint8Array>()
  const bodyMask = async (coat: string): Promise<Uint8Array> => {
    let m = bodyMaskCache.get(coat)
    if (!m) { m = alphaMask(await rawOf(readFileSync(join(RP, catalog.resources[`${coat}-parted-mouth`].path)))); bodyMaskCache.set(coat, m) }
    return m
  }
  for (const f of files) {
    const id = f.slice(0, -4)
    const parsed = parseId(id)
    const issues: string[] = []
    const row: Record<string, unknown> = { id }
    if (!parsed) { issues.push('文件名不是已知资源 id'); report.push({ ...row, issues }); console.log(`✗ ${id}: ${issues.join('；')}`); continue }
    const bytes = readFileSync(join(dir, f))
    const fileSha = createHash('sha256').update(bytes).digest('hex')
    const exception = exceptions.find((e) => e.assetId === id && e.geometryChanged && (!e.sourceSha256 || e.sourceSha256 === fileSha))
    const exemptPosition = !!exception && (exception.exempt ?? ['position', 'silhouette']).some((x) => x === 'position' || x === 'silhouette')
    if (exception) row.geometryException = exception.reason
    const meta = await sharp(join(dir, f)).metadata()
    row.size = `${meta.width}×${meta.height}`
    if (meta.width !== meta.height) issues.push('不是正方形')
    else if (meta.width !== CANVAS) issues.push(`尺寸 ${meta.width}，会缩放到 1254`)
    // 抠底
    const raw = await rawOf(await sharp(join(dir, f)).resize(CANVAS, CANVAS, { kernel: 'lanczos3' }).png().toBuffer())
    let opaque = true
    for (let i = 3; i < raw.length; i += 4) if (raw[i] < 250) { opaque = false; break }
    let keyed: Rgba
    if (opaque) {
      const bg = cornerColor(raw, CANVAS, CANVAS)
      row.background = `#${bg.map((v) => v.toString(16).padStart(2, '0')).join('')}`
      const nearMagenta = Math.hypot(bg[0] - 255, bg[1], bg[2] - 255) < 40
      if (!nearMagenta) issues.push(`底色 ${row.background} 不是洋红`)
      let ambiguous = 0
      for (let i = 0; i < raw.length; i += 4) { const d = Math.hypot(raw[i] - bg[0], raw[i + 1] - bg[1], raw[i + 2] - bg[2]); if (d >= 50 && d < 130) ambiguous++ }
      row.ambiguousPct = +((ambiguous / (CANVAS * CANVAS)) * 100).toFixed(2)
      if ((row.ambiguousPct as number) > 1.5) issues.push(`与底色相近的模糊像素 ${row.ambiguousPct}%（可能有渐变/暗角/软边）`)
      keyed = keyBackgroundRgba(raw, CANVAS, CANVAS, { threshold: 90, erode: 3 })
    } else { row.background = '自带 alpha'; keyed = hardenAlpha(new Uint8ClampedArray(raw)) }
    const A = alphaMask(keyed)
    const a = maskStats(A, CANVAS)
    if (a.count === 0) { issues.push('抠底后没有主体'); report.push({ ...row, issues }); console.log(`✗ ${id}: ${issues.join('；')}`); continue }
    // 色数（6 位/通道粗略计）
    const colors = new Set<number>()
    for (let i = 0; i < keyed.length; i += 4) if (keyed[i + 3]) colors.add(((keyed[i] >> 2) << 12) | ((keyed[i + 1] >> 2) << 6) | (keyed[i + 2] >> 2))
    row.colors = colors.size
    // AI 赛璐璐画带抗锯齿边与毛尖笔触，6 位色计数几千很正常；超过一万才提示（批 0 母版 7599 通过）
    if (colors.size > 10000) issues.push(`色数 ${colors.size}，疑似渐变或纹理，不够平涂`)
    // 参考剪影
    let B: Uint8Array
    if (parsed.kind === 'body') B = alphaMask(await rawOf(readFileSync(join(RP, catalog.resources[id].path))))
    else {
      let t = TEMPLATE.transforms[parsed.mutation] ?? IDENTITY
      if (parsed.coat && TEMPLATE.coatBound.includes(parsed.mutation)) t = combine(t, registration[`${parsed.coat}-${parsed.mutation}`])
      B = alphaMask(await rawOf(await placeLayer(join(RP, catalog.resources[id].path), t)))
    }
    const b = maskStats(B, CANVAS)
    let inter = 0, union = 0
    for (let i = 0; i < A.length; i++) { if (A[i] && B[i]) inter++; if (A[i] || B[i]) union++ }
    row.iou = +(inter / union).toFixed(3)
    row.centroidOffset = [Math.round(a.cx - b.cx), Math.round(a.cy - b.cy)]
    row.bbox = a.bbox
    if (parsed.kind === 'body') {
      if (exemptPosition) { /* 登记过的有意改形，不检查对齐 */ }
      else if ((row.iou as number) < 0.85) issues.push(`剪影重合率 ${row.iou}，与毛绒版对不上`)
      else if ((row.iou as number) < 0.92) issues.push(`剪影重合率 ${row.iou}，偏低`)
      const [dx, dy] = row.centroidOffset as number[]
      if (!exemptPosition && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) issues.push(`质心偏移 (${dx}, ${dy})px`)
    } else {
      const slot = PART_SLOT[parsed.mutation]
      const body = await bodyMask(parsed.coat ?? 'orange-white')
      if (slot === 'ears' || slot === 'tailTip') {
        // 清除区里真正"必须盖住"的只有官方同名部件也盖住的那部分（其余是被有意抠掉的原耳/原尾），
        // 官方件按定义为 1.0；来图低于它就会在合成时露出缺口
        const poly = polygonMask(CANVAS, slot === 'ears' ? TEMPLATE.ears : [TEMPLATE.tailTip])
        let must = 0, covered = 0
        for (let i = 0; i < A.length; i++) if (body[i] && poly[i] && B[i]) { must++; if (A[i]) covered++ }
        row.clearCoverage = must ? +(covered / must).toFixed(3) : 1
        row.gap64px = Math.round((must - covered) * OUT_PX * OUT_PX)
        if ((row.clearCoverage as number) < 0.97 && (row.gap64px as number) >= 2) issues.push(`清除区覆盖率 ${row.clearCoverage}，合成后约有 ${row.gap64px} 个 64px 像素的缺口露出原${slot === 'ears' ? '耳' : '尾'}位置`)
      } else {
        // 外挂件（额顶/颈/背）：露出身体轮廓外的面积换算到 64px，太小缩放后就看不见（官方光环 15 是已知偏细的反例）
        let outside = 0
        for (let i = 0; i < A.length; i++) if (A[i] && !body[i]) outside++
        row.visibleOutsideBody64px = Math.round(outside * OUT_PX * OUT_PX)
        if ((row.visibleOutsideBody64px as number) < 12) issues.push(`露出身体外的面积只有 ${row.visibleOutsideBody64px} 个 64px 像素，缩小后看不见`)
        else if ((row.visibleOutsideBody64px as number) < 30) issues.push(`露出身体外的面积 ${row.visibleOutsideBody64px} 个 64px 像素，偏小（官方光环是 15，已知偏细）`)
      }
      if (!exemptPosition && (row.iou as number) < 0.3) issues.push(`与参考位置重合率 ${row.iou}，位置或大小可能偏了`)
    }
    // 叠加图：蓝=只有毛绒参考，红=只有来图，灰=重合；缩到 627
    const ov = Buffer.alloc(CANVAS * CANVAS * 4)
    for (let i = 0; i < A.length; i++) {
      const o = i * 4
      if (A[i] && B[i]) { ov[o] = 120; ov[o + 1] = 120; ov[o + 2] = 120; ov[o + 3] = 255 }
      else if (B[i]) { ov[o] = 60; ov[o + 1] = 110; ov[o + 2] = 230; ov[o + 3] = 255 }
      else if (A[i]) { ov[o] = 230; ov[o + 1] = 70; ov[o + 2] = 60; ov[o + 3] = 255 }
      else { ov[o] = 237; ov[o + 1] = 230; ov[o + 2] = 214; ov[o + 3] = 255 }
    }
    await sharp(ov, { raw: { width: CANVAS, height: CANVAS, channels: 4 } }).resize(627, 627).png().toFile(join(outDir, `${id}.png`))
    row.issues = issues
    report.push(row)
    const summary = parsed.kind === 'body'
      ? `重合 ${row.iou} 偏移 (${(row.centroidOffset as number[]).join(',')}) 色数 ${row.colors}`
      : `位置重合 ${row.iou}${row.clearCoverage !== undefined ? ` 清除区覆盖 ${row.clearCoverage}` : ''}${row.visibleOutsideBody64px !== undefined ? ` 露出 ${row.visibleOutsideBody64px}px²` : ''} 色数 ${row.colors}`
    const note = exception ? `（几何例外：${exception.reason}）` : ''
    console.log(`${issues.length ? '✗' : '✓'} ${id}: ${summary}${note}${issues.length ? '\n    - ' + issues.join('\n    - ') : ''}`)
  }
  writeFileSync(join(outDir, 'check-report.json'), JSON.stringify(report, null, 2) + '\n')
  const bad = report.filter((r) => (r.issues as string[] | undefined)?.length).length
  console.log(`检查 ${report.length} 张，${bad} 张有问题；叠加图与 check-report.json 在 ${outDir}（蓝=毛绒参考独有，红=来图独有，灰=重合）`)
}

/** 输出 44 张最终坐标的毛绒参考图（部件已按模板×注册变换摆好），出平涂图时当作定位/形状参考 */
async function emitReference(dir: string): Promise<void> {
  const catalog = JSON.parse(readFileSync(join(RP, 'packages/asset-catalog/catalog/v0.10.0/catalog.json'), 'utf8')) as Catalog
  const registration = JSON.parse(readFileSync(join(RP, 'packages/renderer-canvas/src/feline-combination-registration.json'), 'utf8')) as Record<string, Transform>
  mkdirSync(dir, { recursive: true })
  const done = new Set<string>()
  for (const coat of COATS) {
    for (const [mutation, resourceId] of Object.entries(catalog.mutations[coat] ?? {})) {
      if (done.has(resourceId)) continue
      let t = TEMPLATE.transforms[mutation] ?? IDENTITY
      if (TEMPLATE.coatBound.includes(mutation)) t = combine(t, registration[`${coat}-${mutation}`])
      const placed = await placeLayer(join(RP, catalog.resources[resourceId].path), t)
      writeFileSync(join(dir, `${resourceId}.png`), await sharp(placed).png({ compressionLevel: 9 }).toBuffer())
      done.add(resourceId)
    }
  }
  console.log(`已输出 ${done.size} 张部件参考图（1254 最终坐标）→ ${dir}；主体图直接用 packages/asset-catalog/assets/v0.10.0/<coat>-<expression>.png`)
}

const pv = argOf('--preview')
const ref = argOf('--reference')
const chk = argOf('--check')
if (pv !== undefined) await preview(resolve(pv), (argOf('--compare') ?? OUT).split(',').map((d) => resolve(d.trim())))
else if (ref !== undefined) await emitReference(resolve(ref))
else if (chk !== undefined) await check(resolve(chk))
else await generate()
