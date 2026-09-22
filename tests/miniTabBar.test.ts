/**
 * 小程序自定义导航的选中态：静态守卫。
 *
 * 起因：切几次页签后高亮和实际页面对不上。根因是导航栏自己读 `getCurrentPages()` 反推当前页，
 * 而每个 tab 页各有一份导航栏实例、tab 页访问过又不销毁，状态就各记一套。
 * 改成由页面在 onShow 里报出自己是哪个页签（`useDeclareTab`）。
 *
 * 这套机制的失效方式很安静：漏调 `useDeclareTab` 不会报错，只是高亮停在上一个页签，
 * 而这正是本来那个 bug 的样子。运行时行为没法在这里测（要 Taro 的页面生命周期），
 * 所以退一步守住能静态检查的部分：谁该报、报的名字对不对、旧写法有没有溜回来。
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const MINI = join(import.meta.dirname ?? __dirname, '..', 'miniprogram')
const read = (...p: string[]) => readFileSync(join(MINI, ...p), 'utf8')

const appConfig = read('src', 'app.config.ts')
const selection = read('src', 'custom-tab-bar', 'selection.ts')
const tabBar = read('src', 'custom-tab-bar', 'index.tsx')

/** 从 app.config.ts 的 tabBar.list 里取出每个页签的 pagePath */
function tabPagePaths(): string[] {
  const list = appConfig.slice(appConfig.indexOf('tabBar:'))
  return [...list.matchAll(/pagePath:\s*'([^']+)'/g)].map((m) => m[1])
}

/** 从 selection.ts 的 TAB_KEYS 里取出页签 key */
function tabKeys(): string[] {
  const m = selection.match(/TAB_KEYS\s*=\s*\[([^\]]+)\]/)
  expect(m, 'selection.ts 里找不到 TAB_KEYS').toBeTruthy()
  return [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

describe('小程序导航选中态', () => {
  it('app.config 的页签与 TAB_KEYS 一一对应，顺序一致', () => {
    const fromConfig = tabPagePaths().map((p) => p.replace(/^pages\//, '').replace(/\/index$/, ''))
    expect(fromConfig.length).toBeGreaterThan(0)
    expect(tabKeys()).toEqual(fromConfig)
  })

  it('每个 tab 页都报出了自己的页签，且名字与它所在的目录一致', () => {
    for (const path of tabPagePaths()) {
      const src = read('src', `${path}.tsx`)
      const key = path.replace(/^pages\//, '').replace(/\/index$/, '')
      expect(src, `${path} 没有调 useDeclareTab`).toContain('useDeclareTab')
      expect(src, `${path} 报的 key 不是 ${key}`).toContain(`useDeclareTab('${key}')`)
    }
  })

  it('useDeclareTab 在组件的第一行，不能落在提前 return 之后', () => {
    for (const path of tabPagePaths()) {
      const src = read('src', `${path}.tsx`)
      const body = src.slice(src.search(/export default function \w+\([^)]*\) \{/))
      const declare = body.indexOf('useDeclareTab(')
      const earlyReturn = body.indexOf('return (')
      expect(declare, `${path}`).toBeGreaterThan(0)
      // 只要在第一个 return 之前就行；React 不允许 hook 落在条件返回之后
      expect(declare, `${path} 的 useDeclareTab 落在了 return 之后`).toBeLessThan(earlyReturn)
    }
  })

  it('非 tab 页不报页签（记一笔是压在栈上的页面，不是页签）', () => {
    const all = [...appConfig.slice(0, appConfig.indexOf('window:')).matchAll(/'(pages\/[^']+)'/g)].map((m) => m[1])
    const nonTabs = all.filter((p) => !tabPagePaths().includes(p))
    expect(nonTabs, '预期至少有一个非页签页面（记一笔）').not.toHaveLength(0)
    for (const path of nonTabs) {
      expect(read('src', `${path}.tsx`), `${path} 不该报页签`).not.toContain('useDeclareTab')
    }
  })

  it('导航栏不再自己猜路由', () => {
    expect(tabBar, '导航栏又开始读页面栈了：选中态该由页面报，见 selection.ts').not.toContain('getCurrentPages')
    expect(tabBar, '导航栏不该自己存选中态，那会每个实例各记一套').not.toContain('useState')
  })
})
