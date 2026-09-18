/**
 * 小程序侧的状态层。
 *
 * 网页版的 `src/store/storage.ts` 里，只有 loadState / saveState 两个函数碰 localStorage，
 * 其余（defaultState / normalizeState / exportJson / uid）都是纯函数。所以这里不复制任何
 * 逻辑，只把那两个函数换成 wx 的同步存储，其余原样 re-export。
 *
 * 存储上限：单 key 1MB、总量 10MB。整份状态存在一个 key 里，与网页版一致。
 */
import Taro from '@tarojs/taro'
import { STORAGE_KEY, defaultState, normalizeState } from '@store/storage'
import type { AppState } from '@store/storage'

export { STORAGE_KEY, defaultState, normalizeState, uid, exportJson, importJson } from '@store/storage'
export type { AppState, CustomFood } from '@store/storage'

export function loadState(): AppState {
  try {
    const text = Taro.getStorageSync(STORAGE_KEY)
    if (!text) return defaultState()
    return normalizeState(JSON.parse(text))
  } catch {
    return defaultState()
  }
}

export function saveState(s: AppState): void {
  try {
    Taro.setStorageSync(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // 存储满时静默失败，界面仍可用
  }
}

// ── 极简全局 store：小程序每个页面是独立实例，用订阅让四个 tab 看到同一份状态 ──

type Listener = (s: AppState) => void

let current: AppState | null = null
const listeners = new Set<Listener>()

export function getState(): AppState {
  if (!current) current = loadState()
  return current
}

export function setState(fn: (s: AppState) => AppState): AppState {
  const next = fn(getState())
  current = next
  saveState(next)
  for (const l of listeners) l(next)
  return next
}

export function subscribe(l: Listener): () => void {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
