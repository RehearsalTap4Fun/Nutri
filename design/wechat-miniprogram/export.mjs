/** 从 logo.svg 重新导出上传用的两张 PNG：node export.mjs */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// nutri 本身不依赖 sharp，借用同机 RandomPet 里的那份
const sharp = createRequire('/Users/tap4fun/Demo/RandomPet-master/package.json')('sharp')
const here = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(join(here, 'logo.svg'))

for (const s of [144, 512]) {
  const out = join(here, `logo-${s}.png`)
  await sharp(svg, { density: 1200 }).resize(s, s)
    .png({ compressionLevel: 9, palette: true }).toFile(out)
  const { width, height, hasAlpha } = await sharp(out).metadata()
  console.log(`logo-${s}.png  ${width}×${height}  透明通道:${hasAlpha ? '有（微信不接受，需排查）' : '无'}`)
}
