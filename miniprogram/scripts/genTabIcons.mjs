/**
 * 生成 tabBar 图标：node scripts/genTabIcons.mjs
 *
 * 路径直接抄自网页版 `src/ui/icons.tsx`，保证两端是同一组图标。
 * 小程序 tabBar 只吃位图，所以把同一份 SVG 用两种颜色各渲染一张：
 * 未选中用 --ink-2，选中用 --ink。官方建议 81×81，这里出 3 倍图。
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sharp = createRequire('/Users/tap4fun/Demo/RandomPet-master/package.json')('sharp')

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'src', 'assets', 'tabbar')
mkdirSync(outDir, { recursive: true })

/** 与网页版 icons.tsx 的 base 一致：1.75 线宽、圆头圆角、不填充 */
const ICONS = {
  today: `<path d="M3.5 11.5h17c0 4.5-3.2 8-8.5 8s-8.5-3.5-8.5-8Z"/>
          <path d="M8 19.5v1.5M16 19.5v1.5M9 8.5c0-1.6 1-2 1-3.5M13 8.5c0-1.6 1-2 1-3.5"/>`,
  plan: `<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14Z"/>
         <path d="M5 19c3-4 6-7 10-10"/>`,
  analysis: `<path d="M4 19.5h16"/>
             <path d="M6.5 16.5v-5M11 16.5V7.5M15.5 16.5v-3M20 16.5V10"/>`,
  me: `<circle cx="12" cy="8" r="3.5"/>
       <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>`,
}

const COLORS = { off: '#5a5d58', on: '#2c2e2a' }
const SIZE = 81

let n = 0
for (const [name, body] of Object.entries(ICONS)) {
  for (const [state, color] of Object.entries(COLORS)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${SIZE}" height="${SIZE}"
      fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
    const file = join(outDir, `${name}-${state}.png`)
    await sharp(Buffer.from(svg), { density: 900 }).resize(SIZE, SIZE).png({ compressionLevel: 9 }).toFile(file)
    n++
  }
}
console.log(`${n} 张 tabBar 图标 → ${outDir}`)
