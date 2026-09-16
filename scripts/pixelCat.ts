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
 *
 * 依赖 sharp：从 RandomPet 仓库的 node_modules 里借用，nutri 自己不装（这是偶尔跑一次的美术工具）。
 * 模板几何来自 RandomPet packages/renderer-canvas/src/feline-combination-render.ts 的 FELINE_COMBINATION_TEMPLATE_V1，
 * 注册参数来自同目录 feline-combination-registration.json。
 */
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { composeSprite, despeckleRgba, hardenAlpha, keyBackgroundRgba, type ClearRegions, type Rgba } from '../src/core/pixelize'

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
async function preview(outFile: string): Promise<void> {
  const { renderOps, catForCreature } = await import('../src/core/pixelcat')
  const manifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')) as { size: number; clear: ClearRegions }
  const n = manifest.size
  const cache = new Map<string, Rgba>()
  const layerOf = (id: string): Rgba => {
    let px = cache.get(id)
    if (!px) {
      const raw: Buffer = require_sync_raw(join(OUT, `${id}.png`))
      px = new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.length)
      cache.set(id, px)
    }
    return px
  }
  // sharp 解码是异步的，先把所有图层解出来
  const rawCache = new Map<string, Buffer>()
  for (const f of readdirSync(OUT)) if (f.endsWith('.png')) rawCache.set(f.slice(0, -4), await sharp(join(OUT, f)).ensureAlpha().raw().toBuffer())
  function require_sync_raw(path: string): Buffer {
    const id = path.split('/').pop()!.slice(0, -4)
    const buf = rawCache.get(id)
    if (!buf) throw new Error(`预览缺图层 ${id}`)
    return buf
  }
  const toPng = (px: Rgba, up: number) => sharp(Buffer.from(px.buffer, px.byteOffset, px.length), { raw: { width: n, height: n, channels: 4 } })
    .resize(n * up, n * up, { kernel: 'nearest' }).png().toBuffer()
  const label = (text: string, w: number) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="26"><text x="${w / 2}" y="18" font-size="14" text-anchor="middle" font-family="Helvetica" fill="#2c2e2a">${text}</text></svg>`)

  type Spec = Parameters<typeof renderOps>[0]
  const samples: Array<[string, Spec]> = [
    ['三花 · 鳍耳+分叉尾', { coat: 'calico', expression: 'parted-mouth', crown: 'none', ears: 'fin-ears', neck: 'none', back: 'none', tailTip: 'forked-tail-tip' }],
    ['棕虎斑 · 鹿角+小狮鬃', { coat: 'brown-tabby', expression: 'tongue-tip', crown: 'antlers', ears: 'none', neck: 'small-lion-mane', back: 'none', tailTip: 'none' }],
    ['燕尾服 · 小龙角+小翅膀+焰尾', { coat: 'tuxedo', expression: 'small-fangs', crown: 'dragon-horns', ears: 'none', neck: 'none', back: 'small-wings', tailTip: 'flame-tail' }],
    ['豹点 · 光环+龙翼+颈膜', { coat: 'rosetted', expression: 'parted-mouth', crown: 'halo', ears: 'none', neck: 'frill-neck', back: 'dragon-wings', tailTip: 'none' }],
    ['橘白 · 羽翼', { coat: 'orange-white', expression: 'small-fangs', crown: 'none', ears: 'none', neck: 'none', back: 'feathered-wings', tailTip: 'none' }],
    ['重点色 · 普通', catForCreature({ id: 'demo-2', mutations: 0 })],
  ]
  // 每行：2 倍显示（实际尺寸）×3 只 + 6 倍放大看细节
  const up2 = 2, up6 = 6
  const rowW = n * up2 * 3 + n * up6 + 80
  const rowH = n * up6 + 40
  const rows: Buffer[] = []
  for (let i = 0; i < samples.length; i += 1) {
    const [name, spec] = samples[i]
    const px = composeSprite(renderOps(spec), layerOf, n, manifest.clear)
    const small = await toPng(px, up2)
    const big = await toPng(px, up6)
    const tiles = [
      { input: small, left: 10, top: 10 },
      { input: small, left: 20 + n * up2, top: 10 },
      { input: small, left: 30 + n * up2 * 2, top: 10 },
      { input: big, left: 60 + n * up2 * 3, top: 6 },
      { input: label(`${name} · ${n}px ×${up2}（实际大小，三只并排）| 右：×${up6} 放大`, rowW), left: 0, top: rowH - 28 },
    ]
    rows.push(await sharp({ create: { width: rowW, height: rowH, channels: 4, background: '#EDE6D6' } }).composite(tiles).png().toBuffer())
  }
  await sharp({ create: { width: rowW, height: rowH * rows.length, channels: 4, background: '#EDE6D6' } })
    .composite(rows.map((r, i) => ({ input: r, left: 0, top: i * rowH }))).png().toFile(outFile)
  console.log(`预览已写到 ${outFile}（${n}px）`)
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
if (pv !== undefined) await preview(resolve(pv))
else if (ref !== undefined) await emitReference(resolve(ref))
else await generate()
