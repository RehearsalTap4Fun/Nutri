import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { swPlugin } from './scripts/swPlugin'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
const now = new Date()
const two = (n: number) => String(n).padStart(2, '0')
// 本地时间 YYYYMMDDHHmm，和 npm run deploy 打印的一致，方便肉眼对版本
const buildId = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}${two(now.getHours())}${two(now.getMinutes())}`
let gitHash = ''
try {
  gitHash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  // 有未提交改动时加 +，提醒这次构建不完全对应该提交
  if (execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()) gitHash += '+'
} catch { /* 无 git 时留空 */ }

// 单文件构建：JS/CSS 全部内联进一个 HTML，file:// 双击即可运行；
// 同时输出 manifest / 图标 / sw.js，丢到任意静态托管（含子路径）就是可安装、可离线的 PWA
export default defineConfig({
  base: './',
  // 本地开发时把 /api 转到线上同步服务，便于用两个源（localhost / 127.0.0.1）模拟两台设备
  server: { proxy: { '/api': { target: 'http://47.109.97.108/nutri', changeOrigin: true } } },
  plugins: [react(), viteSingleFile(), swPlugin({ version: buildId })],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(buildId),
    __GIT_HASH__: JSON.stringify(gitHash),
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as any)
