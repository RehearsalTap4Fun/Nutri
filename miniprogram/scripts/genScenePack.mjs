/**
 * 把共用的场景包（背景）烤进小程序：node scripts/genScenePack.mjs
 *
 * 和 `genPixelPack.mjs` 同一套路子、同样的理由——小程序没有 `import.meta.glob`，
 * 真机上 canvas 对 base64 data URI 的支持又不可靠，所以主路径是包内真实 PNG，
 * base64 只作兜底。区别只有一个：背景是 96×64，猫是 64×64，解码时不能套用方图尺寸。
 *
 * 场景包更新后（`npm run scenepack` 重新导出）要重跑这个脚本。
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const sceneDir = join(here, '..', '..', 'src', 'assets', 'pixelscene')
const outFile = join(here, '..', 'src', 'assets', 'pixelsceneData.ts')
const pngDir = join(here, '..', 'src', 'assets', 'pixelscene')

const files = readdirSync(sceneDir).filter((f) => f.endsWith('.png')).sort()
const catalog = JSON.parse(readFileSync(join(sceneDir, 'catalog.json'), 'utf8'))

rmSync(pngDir, { recursive: true, force: true })
mkdirSync(pngDir, { recursive: true })
for (const f of files) copyFileSync(join(sceneDir, f), join(pngDir, f))

let raw = 0
const lines = files.map((f) => {
  const buf = readFileSync(join(sceneDir, f))
  raw += buf.length
  return `  '${f.replace(/\.png$/, '')}': 'data:image/png;base64,${buf.toString('base64')}',`
})

const body = `/**
 * 自动生成，请勿手改。来源：../../src/assets/pixelscene/*.png
 * 重新生成：node scripts/genScenePack.mjs
 *
 * 共 ${files.length} 张背景，原始 ${(raw / 1024).toFixed(1)} KB，画布 ${catalog.canvas.width}×${catalog.canvas.height}。
 *
 * 主路径是包内 PNG 文件（SCENE_PATH），这张 base64 表只作为兜底。
 */
export const SCENE_PATH = '/assets/pixelscene'

export const SCENE_IDS: string[] = [
${files.map((f) => `  '${f.replace(/\.png$/, '')}',`).join('\n')}
]

export const SCENE_DATA: Record<string, string> = {
${lines.join('\n')}
}
`
writeFileSync(outFile, body)
console.log(`${files.length} 张背景 PNG → ${pngDir}`)
console.log(`base64 兜底表 → ${outFile}`)
console.log(`原始 ${(raw / 1024).toFixed(1)} KB，生成文件 ${(Buffer.byteLength(body) / 1024).toFixed(1)} KB`)

// 目录声明的每张背景都要就位，且尺寸必须等于画布——背景尺寸不对，合成时才会炸，太晚了
const have = new Set(files.map((f) => f.replace(/\.png$/, '')))
const declared = Object.keys(catalog.resources)
const missing = declared.filter((id) => !have.has(id))
const wrongSize = declared.filter((id) => {
  const r = catalog.resources[id]
  return r.width !== catalog.canvas.width || r.height !== catalog.canvas.height
})
const unresolved = Object.entries(catalog.backdrops).filter(([, b]) => !have.has(b.resourceId)).map(([k]) => k)

if (missing.length || wrongSize.length || unresolved.length) {
  if (missing.length) console.error(`✗ 缺背景 ${missing.length} 张：${missing.join(', ')}`)
  if (wrongSize.length) console.error(`✗ 尺寸与画布不符：${wrongSize.join(', ')}`)
  if (unresolved.length) console.error(`✗ backdrops 里解析不到资源：${unresolved.join(', ')}`)
  process.exit(1)
}
console.log(`校验通过：${declared.length} 张背景全部就位，尺寸均为 ${catalog.canvas.width}×${catalog.canvas.height}`)
