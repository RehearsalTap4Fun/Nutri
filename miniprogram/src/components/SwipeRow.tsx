/**
 * 左滑露出删除。复刻网页版 Today 里那套手势：
 * 只在水平位移占优时跟手，松手超过阈值就停在打开态，再点别处或再滑回去收起。
 *
 * 小程序没有现成的 swipe-action 组件，但 View 上的 touch 事件够用，
 * 所以这里不引第三方 UI 库，手势参数照抄网页版（最多 -96，阈值 -44，露出 88）。
 */
import { useRef, useState } from 'react'
import { View, Text } from '@tarojs/components'
import type { ITouchEvent } from '@tarojs/components'
import type { ReactNode } from 'react'

const MAX = -96
const OPEN_AT = -44
const OPEN_X = -88

export function SwipeRow({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const [dx, setDx] = useState<number | null>(null)
  const start = useRef<{ x: number; y: number; dx: number } | null>(null)

  const onStart = (e: ITouchEvent) => {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY, dx: 0 }
  }

  const onMove = (e: ITouchEvent) => {
    const s = start.current
    if (!s) return
    const t = e.touches[0]
    const mx = t.clientX - s.x
    const my = t.clientY - s.y
    // 竖向占优就当成滚动，不拦
    if (Math.abs(my) > Math.abs(mx)) return
    s.dx = Math.max(MAX, Math.min(0, mx + (open ? OPEN_X : 0)))
    setDx(s.dx)
  }

  const onEnd = () => {
    const s = start.current
    if (!s) return
    setOpen(s.dx < OPEN_AT)
    setDx(null)
    start.current = null
  }

  const x = dx !== null ? dx : open ? OPEN_X : 0

  return (
    <View className="swipe">
      <View
        className="swipe-body"
        style={{ transform: `translateX(${x}px)`, transition: dx === null ? undefined : 'none' }}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onTouchCancel={onEnd}
      >
        {children}
      </View>
      <Text
        className="swipe-del"
        onClick={() => {
          setOpen(false)
          onDelete()
        }}
      >
        删除
      </Text>
    </View>
  )
}
