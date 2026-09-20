/**
 * 自定义底部导航。
 *
 * 原生 tabBar 只能改颜色，做不出网页版那条**不规则胶囊描边的浮岛**，
 * 也做不出选中项图标底下垫一块绿色。所以开 `custom: true` 自己画，
 * 结构和类名对着网页版 App.tsx 的 `.nav / .nav-inner` 抄。
 *
 * 选中态靠当前路由判断：自定义 tabBar 每个页面各有一份实例，
 * 切页时会重新挂载，所以在 useDidShow 里读一次路由就够了。
 *
 * 官方模板用 cover-view，但它的 CSS 只支持一个子集，吃不下椭圆圆角，
 * 而那正是这条导航的签名。用 `canvas type="2d"` 之后画布不再是老式原生组件，
 * 不会盖住普通 view，所以这里用 View。
 */
import { useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'

const TABS = [
  { key: 'today', path: '/pages/today/index', label: '今日', icon: 'today' },
  { key: 'plan', path: '/pages/plan/index', label: '计划', icon: 'plan' },
  { key: 'analysis', path: '/pages/analysis/index', label: '分析', icon: 'analysis' },
  { key: 'me', path: '/pages/me/index', label: '我的', icon: 'me' },
]

export default function CustomTabBar() {
  const [active, setActive] = useState('')

  useDidShow(() => {
    const inst = Taro.getCurrentInstance()
    const path = inst.router ? inst.router.path : ''
    const hit = TABS.find((t) => path && path.indexOf(t.key) >= 0)
    if (hit) setActive(hit.key)
  })

  const go = (t: (typeof TABS)[number]) => {
    if (t.key === active) return
    setActive(t.key)
    Taro.switchTab({ url: t.path })
  }

  return (
    <View className="nav">
      {/* 导航上方那道岸线，米色从内容上漫过来 */}
      <Image className="nav-shore" src="/assets/land/nav-shore.png" />
      <View className="nav-inner">
        {TABS.map((t) => (
          <View
            className={t.key === active ? 'nav-btn nav-btn-on' : 'nav-btn'}
            key={t.key}
            onClick={() => go(t)}
          >
            <View className="nav-ico">
              <Image
                className="nav-img"
                src={`/assets/tabbar/${t.icon}-${t.key === active ? 'on' : 'off'}.png`}
              />
            </View>
            <Text className="nav-lbl">{t.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
