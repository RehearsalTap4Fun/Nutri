/**
 * 自定义底部导航。
 *
 * 原生 tabBar 只能改颜色，做不出网页版那条**不规则胶囊描边的浮岛**，
 * 也做不出选中项图标底下垫一块绿色。所以开 `custom: true` 自己画，
 * 结构和类名对着网页版 App.tsx 的 `.nav / .nav-inner` 抄。
 *
 * 选中态**不在这里判断**。导航栏不读路由——每个 tab 页各有一份导航栏实例，
 * 而 tab 页访问过就不销毁，在这里记状态会各页面记出一套，切几次就错乱。
 * 改成由页面在 onShow 里报出自己是哪个页签，见 `selection.ts` 里的三条原因。
 *
 * 官方模板用 cover-view，但它的 CSS 只支持一个子集，吃不下椭圆圆角，
 * 而那正是这条导航的签名。用 `canvas type="2d"` 之后画布不再是老式原生组件，
 * 不会盖住普通 view，所以这里用 View。
 */
import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import { getTab, setTab, useTabSelection, type TabKey } from './selection'

import './index.scss'

const TABS: Array<{ key: TabKey; path: string; label: string; icon: string }> = [
  { key: 'today', path: '/pages/today/index', label: '今日', icon: 'today' },
  { key: 'plan', path: '/pages/plan/index', label: '推荐', icon: 'plan' },
  { key: 'analysis', path: '/pages/analysis/index', label: '分析', icon: 'analysis' },
  { key: 'me', path: '/pages/me/index', label: '我的', icon: 'me' },
]

export default function CustomTabBar() {
  const active = useTabSelection()

  const go = (t: (typeof TABS)[number]) => {
    if (t.key === active) return
    // 先切给点即时反馈；状态是共享的，所以不会像以前那样只改到当前实例。
    // 目标页 onShow 会把同一个值再确认一遍；真切不过去就退回原样，不留下假高亮。
    const from = getTab()
    setTab(t.key)
    Taro.switchTab({ url: t.path, fail: () => setTab(from) })
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
