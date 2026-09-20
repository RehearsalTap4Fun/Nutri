/**
 * 扫产物里小程序不接受的新语法：node scripts/checkSyntax.mjs
 *
 * 开发者工具上传时只会给一句 `invalid file: xxx.js, 1:1872 SyntaxError`，
 * 定位很费劲，所以在本地先拦一道。踩过两次：
 *  - babel 没写 targets，共享源码里的可选链原样留下
 *  - node_modules（@noble）默认不过 babel，它的可选链也留下了
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

// 注意可选链要求 `?.` 后面跟标识符、`[` 或 `(`。
// 直接匹配 `?.` 会把压缩后的三元 `x ? .85 : .8` 误报成可选链。
const RULES = [
  ['可选链', /\?\.[A-Za-z_$[(]/g],
  ['空值合并', /\?\?[^)]/g],
  ['可选 catch 绑定', /catch\s*\{/g],
  ['逻辑赋值', /(\|\|=|&&=|\?\?=)/g],
  ['私有字段', /#[a-zA-Z_]\w*\s*[=;(]/g],
]

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.js')) out.push(p)
  }
  return out
}

let bad = 0
for (const file of walk(dist)) {
  const src = readFileSync(file, 'utf8')
  for (const [name, re] of RULES) {
    const hits = src.match(re)
    if (!hits) continue
    bad += hits.length
    const at = src.search(re)
    console.error(`✗ ${file.slice(dist.length + 1)}  ${name} ×${hits.length}`)
    console.error(`    ${src.slice(Math.max(0, at - 50), at + 40).replace(/\n/g, ' ')}`)
  }
}

if (bad) {
  console.error(`\n共 ${bad} 处。检查 babel.config.js 的 targets，以及 config/index.ts 里 compile.include 有没有覆盖到出问题的依赖。`)
  process.exit(1)
}
console.log('产物语法检查通过：没有小程序不接受的新语法')
