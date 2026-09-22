/**
 * 导航选中态：由**页面**告诉导航栏自己是谁，导航栏不猜路由。
 *
 * 原来的写法是导航栏自己读 `Taro.getCurrentPages()` 反推当前是哪个页签，错在三处：
 *
 *  1. **每个 tab 页各有一份导航栏实例，而 tab 页一旦访问过就不会销毁。**
 *     所以 `go()` 里那句乐观的 `setActive(t.key)` 是写在**你正要离开的那个页面**的实例上的。
 *     那份状态会跟着那个页面一直留着，下次切回来就是「高亮在别处」。
 *  2. **`getCurrentPages()` 的时机不可靠**：导航栏实例创建与页面入栈的先后没有保证，
 *     读到的可能还是上一个页面。
 *  3. **记一笔页面（`pages/log/index`）不是 tab**，路由匹配不到任何页签，
 *     `currentKey()` 就静默落回「今日」。从「我的」进记一笔再回来，高亮会跳到今日。
 *
 * 现在按微信官方那套来：页面在 `onShow` 里报出自己的 key。页面是编译期就知道的，
 * 不存在猜错。状态放在模块级——同一个 JS 环境里所有导航栏实例共享一份，
 * 不会再出现「各页面各记一套」的分叉，而且只有当前页的那份是可见的，共享正好是对的。
 */
import { useEffect, useState } from 'react'
import { useDidShow } from '@tarojs/taro'

export const TAB_KEYS = ['today', 'plan', 'analysis', 'me'] as const
export type TabKey = (typeof TAB_KEYS)[number]

let current: TabKey = 'today'
const subscribers = new Set<(k: TabKey) => void>()

export function setTab(k: TabKey): void {
  if (k === current) return
  current = k
  for (const f of subscribers) f(k)
}

export function getTab(): TabKey {
  return current
}

/** 导航栏用：订阅选中态 */
export function useTabSelection(): TabKey {
  const [active, setActive] = useState<TabKey>(getTab)
  useEffect(() => {
    subscribers.add(setActive)
    // 订阅建立之前可能已经变过（实例是切页时才挂的），补一次
    setActive(getTab())
    return () => {
      subscribers.delete(setActive)
    }
  }, [])
  return active
}

/** tab 页用：每次显示时报出自己是哪个页签。非 tab 页不要调 */
export function useDeclareTab(key: TabKey): void {
  useDidShow(() => {
    setTab(key)
  })
}
