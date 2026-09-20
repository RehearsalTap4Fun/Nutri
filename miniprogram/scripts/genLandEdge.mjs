/**
 * 生成陆地下沿的岸线图：node scripts/genLandEdge.mjs
 *
 * 网页版 `src/ui/Today.tsx` 里那条岸线是一段 SVG 路径，小程序没有 svg 元素。
 * 用不规则圆角近似过，但圆角只能给出平滑曲线，手绘的起伏丢掉了。
 * 所以把同一条路径原样渲染成图片，当 `.land` 下沿的背景贴上去。
 *
 * 只取 y=82~100 这一段（就是岸线本身），上面的实心部分交给 CSS 的纯色背景，
 * 这样陆地高度随内容变化时，只有这一条固定高度的窄带被横向拉伸，起伏不会走形。
 */
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sharp = createRequire('/Users/tap4fun/Demo/RandomPet-master/package.json')('sharp')

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'src', 'assets', 'land')
mkdirSync(outDir, { recursive: true })

/** 与网页版 Today.tsx 里的 land-fill / land-coast 逐字一致 */
const FILL = 'M0 0H100V82C94 83.5 87 90 76 93C60 97.5 44 92 28 96C17 98.8 7 100 0 100Z'
const COAST = 'M100 82C94 83.5 87 90 76 93C60 97.5 44 92 28 96C17 98.8 7 100 0 100'

const LAND = '#8ed462'
const CORAL = '#ff6b5a'

/** 取 y=82~100 这 18 个单位，横向 100。放大成 750 宽的窄带 */
// 只有两三种颜色，用调色板 PNG，几 KB 就够
const W = 750
const H = Math.round((18 / 100) * W)

const variants = [
  { name: 'land-edge', coast: null },
  // 超出预算时网页版会把岸线描成珊瑚色
  { name: 'land-edge-over', coast: CORAL },
]

for (const v of variants) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 82 100 18" width="${W}" height="${H}" preserveAspectRatio="none">
    <path d="${FILL}" fill="${LAND}"/>
    ${v.coast ? `<path d="${COAST}" fill="none" stroke="${v.coast}" stroke-width="1.2" stroke-linecap="round"/>` : ''}
  </svg>`
  const file = join(outDir, `${v.name}.png`)
  // density 会让 sharp 按更高分辨率渲染 SVG，这里显式 resize 回目标尺寸，
  // 免得出一张 6250 宽的图在真机上白白占内存
  await sharp(Buffer.from(svg), { density: 600 })
    .resize(W, H)
    .png({ compressionLevel: 9, palette: true })
    .toFile(file)
  const meta = await sharp(file).metadata()
  console.log(`${v.name}.png  ${meta.width}×${meta.height}`)
}
// 导航条上方那道浅浅的岸线：米色从内容上方漫过来，路径同样抄自网页版 App.tsx 的 .nav-shore
const SHORE = 'M0 10V6.5C18 3 34 9 52 5.5C70 2 84 8 100 4.5V10Z'
const SHORE_W = 750
const SHORE_H = 75
const shoreSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 10" width="${SHORE_W}" height="${SHORE_H}" preserveAspectRatio="none">
  <path d="${SHORE}" fill="#f5f1e4"/>
</svg>`
const shoreFile = join(outDir, 'nav-shore.png')
await sharp(Buffer.from(shoreSvg), { density: 600 })
  .resize(SHORE_W, SHORE_H)
  .png({ compressionLevel: 9, palette: true })
  .toFile(shoreFile)
console.log(`nav-shore.png  ${SHORE_W}×${SHORE_H}`)

console.log(`→ ${outDir}`)
