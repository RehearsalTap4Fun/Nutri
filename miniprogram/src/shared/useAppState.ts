import { useEffect, useState } from 'react'
import type { AppState } from './state'
import { getState, setState, subscribe } from './state'

/** 订阅全局状态。四个 tab 各自是独立页面实例，靠这个看到同一份数据。 */
export function useAppState(): [AppState, (fn: (s: AppState) => AppState) => void] {
  const [s, set] = useState<AppState>(getState)
  useEffect(() => subscribe(set), [])
  return [s, setState]
}
