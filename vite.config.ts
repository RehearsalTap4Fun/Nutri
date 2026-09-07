import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { swPlugin } from './scripts/swPlugin'

// 单文件构建：JS/CSS 全部内联进一个 HTML，file:// 双击即可运行；
// 同时输出 manifest / 图标 / sw.js，丢到任意静态托管（含子路径）就是可安装、可离线的 PWA
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile(), swPlugin()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
} as any)
