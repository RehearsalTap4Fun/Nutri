/**
 * 把共用的狗狗图层（src/assets/caninepack）同步进小程序包：node scripts/genCaninePack.mjs
 *
 * 和猫、背景那两个脚本不同，**不生成 base64 兜底表**：狗狗包 414 张图层 259 KB，
 * base64 再加 350 KB，主包 2 MB 的预算撑不住。小程序只走包内真实 PNG（config 里的 copy 规则会带上）。
 *
 * 狗狗包更新后（`npm run caninepack` 重新导出）要重跑这个脚本。
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..', '..', 'src', 'assets', 'caninepack')
const pngDir = join(here, '..', 'src', 'assets', 'caninepack')
const outFile = join(here, '..', 'src', 'assets', 'caninepackData.ts')

const files = readdirSync(srcDir).filter((f) => f.endsWith('.png')).sort()
rmSync(pngDir, { recursive: true, force: true })
mkdirSync(pngDir, { recursive: true })
let raw = 0
for (const f of files) { copyFileSync(join(srcDir, f), join(pngDir, f)); raw += statSync(join(srcDir, f)).size }

writeFileSync(outFile, `/**
 * 自动生成，请勿手改。来源：../../src/assets/caninepack/*.png（${files.length} 张，${(raw / 1024).toFixed(1)} KB）
 * 重新生成：node scripts/genCaninePack.mjs
 *
 * 狗狗图层只走包内文件，没有 base64 兜底（体积原因，见脚本说明）。
 */
export const CANINE_PATH = '/assets/caninepack'
`)

// 校验：目录里列的每张图层都在
const catalog = JSON.parse(readFileSync(join(srcDir, 'catalog.json'), 'utf8'))
const have = new Set(files.map((f) => f.replace(/\.png$/, '')))
const missing = catalog.resourceIds.filter((id) => !have.has(id))
if (missing.length) { console.error(`✗ 缺图层 ${missing.length} 张：${missing.slice(0, 5).join(', ')}`); process.exit(1) }
console.log(`${files.length} 张 PNG（${(raw / 1024).toFixed(1)} KB）→ ${pngDir}；目录列出的 ${catalog.resourceIds.length} 张全部就位`)
