import { PropsWithChildren } from 'react'
import { useDidShow, useLaunch } from '@tarojs/taro'

import { autoSyncOnShow, startAutoSync } from './shared/autoSync'
import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    // 订阅状态变化，同步相关的数据变了就防抖上传
    startAutoSync()
  })

  useDidShow(() => {
    // 回到前台先拉一次，换设备记过的东西能及时出现
    autoSyncOnShow()
  })

  // children 是将要会渲染的页面
  return children
}

export default App
