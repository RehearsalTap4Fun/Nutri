/**
 * 生成页内小图标：node scripts/genIcons.mjs
 *
 * 路径与线宽直接抄自网页版 `src/ui/icons.tsx`，保证两端是同一组图标。
 * 小程序没有 svg 元素，只能出位图；每个图标按用到的颜色各渲染一张。
 *
 * tabBar 的四个图标在 genTabIcons.mjs 里单独生成，那边尺寸和配色要求不同。
 */
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sharp = createRequire('/Users/tap4fun/Demo/RandomPet-master/package.json')('sharp')

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'src', 'assets', 'icons')
mkdirSync(outDir, { recursive: true })

/** [路径, 线宽]，与网页版一一对应 */
const ICONS = {
  bowl: [
    `<path d="M3.5 11.5h17c0 4.5-3.2 8-8.5 8s-8.5-3.5-8.5-8Z"/>
     <path d="M8 19.5v1.5M16 19.5v1.5M9 8.5c0-1.6 1-2 1-3.5M13 8.5c0-1.6 1-2 1-3.5"/>`,
    1.75,
  ],
  plus: ['<path d="M12 5v14M5 12h14"/>', 2.2],
  close: ['<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', 2.2],
  check: ['<path d="M5 12.5l4.3 4.3L19 7.5"/>', 2.4],
  alert: ['<path d="M12 5v9M12 18.4v.4"/>', 2.6],
  info: ['<path d="M12 11v7M12 6.2v.4"/>', 2.6],
  chevron: ['<path d="M9 6l6 6-6 6"/>', 2.2],
  scan: [
    `<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>
     <path d="M4 12h16"/>`,
    1.9,
  ],
}

/** 用到的颜色，与 app.scss 的 token 对应 */
const COLORS = {
  ink: '#2c2e2a',
  muted: '#6b6e68',
  bad: '#b83a26',
  accent: '#2e7a1f',
  white: '#ffffff',
}

/** 每个图标只出用得上的颜色，别把包撑大 */
const WANT = {
  bowl: ['ink', 'muted'],
  plus: ['ink', 'white'],
  close: ['ink', 'muted'],
  check: ['ink', 'white'],
  alert: ['bad', 'ink'],
  info: ['accent', 'muted'],
  chevron: ['accent', 'muted'],
  scan: ['ink'],
}

const SIZE = 72

let n = 0
for (const [name, [body, sw]] of Object.entries(ICONS)) {
  for (const tone of WANT[name]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${SIZE}" height="${SIZE}"
      fill="none" stroke="${COLORS[tone]}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
    // density 会按更高分辨率渲染，显式 resize 回目标尺寸
    await sharp(Buffer.from(svg), { density: 600 })
      .resize(SIZE, SIZE)
      .png({ compressionLevel: 9, palette: true })
      .toFile(join(outDir, `${name}-${tone}.png`))
    n++
  }
}
console.log(`${n} 张图标 → ${outDir}`)
