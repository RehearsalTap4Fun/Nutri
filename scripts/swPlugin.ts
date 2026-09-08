import type { Plugin } from 'vite'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 构建结束时生成 dist/sw.js。缓存名带构建时间戳，每次发版自动失效旧缓存。
 * 策略：应用壳（./ 与清单、图标）预缓存；同源 GET 网络优先、断网回退缓存，保证联网时总拿到最新版。
 */
export function swPlugin(opts: { version?: string } = {}): Plugin {
  let outDir = 'dist'
  return {
    name: 'nutri-sw',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir },
    closeBundle() {
      const version = opts.version || new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)
      const sw = `// 饮食日记 service worker · build ${version}
const CACHE = 'nutri-${version}'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('nutri-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // 模型接口等跨域请求不经过缓存
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
        return res
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)).then((r) => r || new Response('离线且无缓存', { status: 503 }))),
  )
})
`
      writeFileSync(join(outDir, 'sw.js'), sw)
      writeFileSync(join(outDir, 'version.json'), JSON.stringify({ version }))
    },
  }
}
