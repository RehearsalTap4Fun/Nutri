import { useEffect, useRef, useState } from 'react'

/** 数字滚动到目标值；尊重系统的「减少动态效果」 */
export function useCountUp(target: number, duration = 500): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const from = fromRef.current
    if (reduce || from === target) { fromRef.current = target; setValue(target); return }
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - k, 3)
      setValue(from + (target - from) * eased)
      if (k < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

export interface ToastMsg {
  id: number
  text: string
  actionLabel?: string
  onAction?: () => void
}

export function useToast(ttl = 4500) {
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const timer = useRef<number | null>(null)
  const show = (text: string, action?: { label: string; run: () => void }) => {
    if (timer.current) window.clearTimeout(timer.current)
    const id = Date.now()
    setToast({ id, text, actionLabel: action?.label, onAction: action?.run })
    timer.current = window.setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), ttl)
  }
  const dismiss = () => { if (timer.current) window.clearTimeout(timer.current); setToast(null) }
  return { toast, show, dismiss }
}
