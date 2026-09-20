import { useEffect, useState } from 'react'
import type { AppState } from './state'
import { getState, setState, subscribe } from './state'

/** 同步这类异步流程里要拿「此刻最新」的状态，不能用闭包里那份快照 */
export { getState as getLatest } from './state'

/** 订阅全局状态。四个 tab 各自是独立页面实例，靠这个看到同一份数据。 */
export function useAppState(): [AppState, (fn: (s: AppState) => AppState) => void] {
  const [s, set] = useState<AppState>(getState)
  useEffect(() => subscribe(set), [])
  return [s, setState]
}
