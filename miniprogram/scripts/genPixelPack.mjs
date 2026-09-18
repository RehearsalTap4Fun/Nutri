/**
 * 把共用的像素包图层烤成 base64 静态表：node scripts/genPixelPack.mjs
 *
 * 网页版用 `import.meta.glob` 一次性拿到 58 张 PNG 的 URL，小程序没有这个能力，
 * webpack 的图片管线对 sourceRoot 之外的资源又有一堆边界情况。直接生成一份
 * data URI 表最省事：58 张一共 40 KB，base64 之后约 54 KB，都在主包预算里。
 *
 * 像素包更新后（`npm run pixelpack` 重新导出）要重跑这个脚本。
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const packDir = join(here, '..', '..', 'src', 'assets', 'pixelpack')
const outFile = join(here, '..', 'src', 'assets', 'pixelpackData.ts')

const files = readdirSync(packDir)
  .filter((f) => f.endsWith('.png'))
  .sort()

let raw = 0
const lines = files.map((f) => {
  const buf = readFileSync(join(packDir, f))
  raw += buf.length
  const id = f.replace(/\.png$/, '')
  return `  '${id}': 'data:image/png;base64,${buf.toString('base64')}',`
})

const body = `/**
 * 自动生成，请勿手改。来源：../../src/assets/pixelpack/*.png
 * 重新生成：node scripts/genPixelPack.mjs
 *
 * 共 ${files.length} 张图层，原始 ${(raw / 1024).toFixed(1)} KB。
 */
export const LAYER_DATA: Record<string, string> = {
${lines.join('\n')}
}
`

writeFileSync(outFile, body)
const outSize = Buffer.byteLength(body)
console.log(`${files.length} 张图层 → ${outFile}`)
console.log(`原始 ${(raw / 1024).toFixed(1)} KB，生成文件 ${(outSize / 1024).toFixed(1)} KB`)

// 校验：目录声明的每个图层都要在表里，profile 里的每处引用也要解析得到。
// 少一张图层不会让构建失败，只会让某些猫在运行时画不出来，所以在这里拦。
const catalog = JSON.parse(readFileSync(join(packDir, 'catalog.json'), 'utf8'))
const have = new Set(files.map((f) => f.replace(/\.png$/, '')))
const declared = Object.keys(catalog.resources)
const missing = declared.filter((id) => !have.has(id))
const extra = [...have].filter((id) => !declared.includes(id))

let unresolved = 0
for (const profile of catalog.profiles) {
  for (const step of profile.steps) {
    for (const rid of Object.values(step.resources)) {
      if (!have.has(rid)) unresolved++
    }
  }
}

if (missing.length || unresolved) {
  console.error(`✗ 缺图层 ${missing.length} 张${missing.length ? '：' + missing.join(', ') : ''}`)
  console.error(`✗ profile 里解析不到的引用 ${unresolved} 处`)
  process.exit(1)
}
console.log(`校验通过：目录声明 ${declared.length} 张，全部就位${extra.length ? `（另有 ${extra.length} 张未被目录引用）` : ''}`)
