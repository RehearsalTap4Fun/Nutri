/**
 * 扫产物：node scripts/checkSyntax.mjs
 *
 * 两类检查，都是踩过之后补的：
 *
 * 1. **语法**：小程序不接受的新语法。上传时只会给一句
 *    `invalid file: xxx.js, 1:1872 SyntaxError`，定位很费劲，所以本地先拦一道。
 *     - babel 没写 targets，共享源码里的可选链原样留下
 *     - node_modules（@noble）默认不过 babel，它的可选链也留下了
 *
 * 2. **全局**：真机 JSCore 没有、而开发者工具（Chromium）有的浏览器全局。
 *    这类问题在工具里 100% 测不出来，只在真机上炸。正式版 1.0.2 的同步就是这么挂的：
 *    `@noble/hashes` 的 `utf8ToBytes` 用了 `TextEncoder`，我们自己源码里一处都没写，
 *    所以垫片漏了它，上线才发现。
 *
 *    这里不维护第二份名单：补了哪些全局直接从 `src/shared/cryptoPolyfill.ts` 解析，
 *    产物里凡是用到 MISSING_GLOBALS 里的全局、而垫片没补的，就让构建失败。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

// 注意可选链要求 `?.` 后面跟标识符、`[` 或 `(`。
// 直接匹配 `?.` 会把压缩后的三元 `x ? .85 : .8` 误报成可选链。
const RULES = [
  ['可选链', /\?\.[A-Za-z_$[(]/g],
  ['空值合并', /\?\?[^)]/g],
  ['可选 catch 绑定', /catch\s*\{/g],
  ['逻辑赋值', /(\|\|=|&&=|\?\?=)/g],
  ['私有字段', /#[a-zA-Z_]\w*\s*[=;(]/g],
]

/**
 * 真机 JSCore 缺、Chromium 有的全局。值是在压缩产物里判定"确实用了它"的写法：
 * 只认构造与调用，不认光出现标识符——Taro 运行时里满是 `URLSearchParams:function(){…}`
 * 这种自己实现的同名导出，按标识符匹配会全是误报。
 */
const MISSING_GLOBALS = {
  TextEncoder: /new\s+TextEncoder\b/,
  TextDecoder: /new\s+TextDecoder\b/,
  btoa: /(^|[^.\w$])btoa\s*\(/,
  atob: /(^|[^.\w$])atob\s*\(/,
  crypto: /(^|[^.\w$])crypto\s*\.\s*(getRandomValues|subtle|randomUUID)\b/,
  URL: /new\s+URL\s*\(/,
  URLSearchParams: /new\s+URLSearchParams\b/,
  Blob: /new\s+Blob\b/,
  FileReader: /new\s+FileReader\b/,
  FormData: /new\s+FormData\b/,
  XMLHttpRequest: /new\s+XMLHttpRequest\b/,
  fetch: /(^|[^.\w$])fetch\s*\(/,
  structuredClone: /(^|[^.\w$])structuredClone\s*\(/,
  localStorage: /(^|[^.\w$])localStorage\s*\./,
  sessionStorage: /(^|[^.\w$])sessionStorage\s*\./,
  WebAssembly: /(^|[^.\w$])WebAssembly\s*\./,
}

/** 垫片补了哪些全局：认 `g.X = ` 这一种写法，与 cryptoPolyfill.ts 的实际写法一致 */
function installedGlobals() {
  const src = readFileSync(join(root, 'src', 'shared', 'cryptoPolyfill.ts'), 'utf8')
  const found = new Set()
  for (const m of src.matchAll(/\bg\.([A-Za-z_$][\w$]*)\s*=[^=]/g)) found.add(m[1])
  return found
}

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

const installed = installedGlobals()
let missing = 0
for (const file of walk(dist)) {
  const src = readFileSync(file, 'utf8')
  for (const [name, re] of Object.entries(MISSING_GLOBALS)) {
    if (installed.has(name) || !re.test(src)) continue
    missing++
    const at = src.search(re)
    console.error(`✗ ${file.slice(dist.length + 1)}  用了 ${name}，但垫片没补它`)
    console.error(`    ${src.slice(Math.max(0, at - 60), at + 50).replace(/\n/g, ' ')}`)
  }
}

if (missing) {
  console.error(
    `\n共 ${missing} 处。这些全局真机 JSCore 没有、开发者工具里有，工具上测不出来。` +
      `\n要么在 src/shared/cryptoPolyfill.ts 里补上并确保 installCryptoPolyfill() 在用到之前跑过，` +
      `\n要么改掉调用方。确认某处不会被执行到，也请写进 cryptoPolyfill.ts 的注释里说明，别在这里开豁免。`,
  )
  process.exit(1)
}
console.log(`产物全局检查通过：缺失全局都由垫片补齐（${[...installed].join('、')}）`)
