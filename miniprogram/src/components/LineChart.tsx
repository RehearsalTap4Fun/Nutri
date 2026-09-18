/**
 * 折线图（体重趋势用）。
 *
 * 小程序没有 svg 元素，网页版那三张手写 SVG 图里，柱状图和占比条用普通视图就能画，
 * 只有折线必须走 canvas。这里用的是新版 `Canvas 2D`（`type="2d"`），接口与浏览器一致，
 * 旧的 `wx.createCanvasContext` 那套不用。
 */
import { useEffect, useRef } from 'react'
import Taro from '@tarojs/taro'
import { Canvas, View, Text } from '@tarojs/components'

export interface Point {
  /** 横轴位置，单位是「距最早一天的天数」 */
  x: number
  y: number
  label: string
}

interface Props {
  id: string
  points: Point[]
  height?: number
  /** 参考线，例如目标体重 */
  guide?: number
  unit?: string
}

const INK = '#2c2e2a'
const MUTED = '#8a8c86'
const LINE = '#e4ddc9'
const ACCENT = '#8ed462'

/** getSystemInfoSync 已标记废弃，新基础库用 getWindowInfo */
function pixelRatio(): number {
  const api = Taro as unknown as { getWindowInfo?: () => { pixelRatio?: number } }
  if (typeof api.getWindowInfo === 'function') {
    const r = api.getWindowInfo().pixelRatio
    if (r) return r
  }
  return Taro.getSystemInfoSync().pixelRatio || 2
}

export function LineChart({ id, points, height = 180, guide, unit = '' }: Props) {
  const drawn = useRef('')

  useEffect(() => {
    if (points.length < 2) return
    // 数据没变就不重绘，避免每次渲染都查一次节点
    const sig = `${points.length}|${points[0].x},${points[0].y}|${points[points.length - 1].x},${points[points.length - 1].y}|${guide ?? ''}`
    if (drawn.current === sig) return

    // 首屏偶尔查不到节点（canvas 还没布局完），查不到就下一帧再试一次
    let retried = false
    const run = () => {
      Taro.createSelectorQuery()
        .select(`#${id}`)
        .fields({ node: true, size: true })
        .exec((res) => {
        const item = res && res[0]
        if (!item || !item.node) {
          if (!retried) {
            retried = true
            setTimeout(run, 60)
          }
          return
        }
        const canvas = item.node
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = pixelRatio()
        const w = item.width
        const h = item.height
        canvas.width = w * dpr
        canvas.height = h * dpr
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, w, h)

        const padL = 38
        const padR = 8
        const padT = 12
        const padB = 22
        const plotW = w - padL - padR
        const plotH = h - padT - padB

        const xs = points.map((p) => p.x)
        const ys = points.map((p) => p.y)
        if (guide !== undefined) ys.push(guide)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        let minY = Math.min(...ys)
        let maxY = Math.max(...ys)
        if (maxY - minY < 1) {
          minY -= 0.5
          maxY += 0.5
        }
        const padY = (maxY - minY) * 0.15
        minY -= padY
        maxY += padY

        const sx = (x: number) => padL + (maxX === minX ? plotW / 2 : ((x - minX) / (maxX - minX)) * plotW)
        const sy = (y: number) => padT + plotH - ((y - minY) / (maxY - minY)) * plotH

        // 横向网格与纵轴刻度
        ctx.strokeStyle = LINE
        ctx.lineWidth = 1
        ctx.fillStyle = MUTED
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        for (let i = 0; i <= 2; i++) {
          const v = minY + ((maxY - minY) * i) / 2
          const y = sy(v)
          ctx.beginPath()
          ctx.moveTo(padL, y)
          ctx.lineTo(w - padR, y)
          ctx.stroke()
          ctx.fillText(v.toFixed(1), padL - 6, y)
        }

        // 参考线
        if (guide !== undefined) {
          ctx.save()
          ctx.strokeStyle = ACCENT
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.moveTo(padL, sy(guide))
          ctx.lineTo(w - padR, sy(guide))
          ctx.stroke()
          ctx.restore()
        }

        // 折线
        ctx.strokeStyle = INK
        ctx.lineWidth = 2
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.beginPath()
        points.forEach((p, i) => {
          const x = sx(p.x)
          const y = sy(p.y)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()

        // 数据点，首尾加粗
        points.forEach((p, i) => {
          const last = i === points.length - 1
          ctx.beginPath()
          ctx.fillStyle = last ? ACCENT : '#fffdf6'
          ctx.strokeStyle = INK
          ctx.lineWidth = 2
          ctx.arc(sx(p.x), sy(p.y), last ? 4 : 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        })

        // 首尾日期
        ctx.fillStyle = MUTED
        ctx.textBaseline = 'top'
        ctx.textAlign = 'left'
        ctx.fillText(points[0].label, padL, h - padB + 6)
        ctx.textAlign = 'right'
        ctx.fillText(points[points.length - 1].label, w - padR, h - padB + 6)

        drawn.current = sig
        })
    }
    run()
  }, [id, points, guide])

  if (points.length < 2) {
    return (
      <View className="chart-empty" style={{ height: `${height}px` }}>
        <Text className="muted">记满两天才画得出趋势</Text>
      </View>
    )
  }

  return (
    <View className="chart-wrap">
      <Canvas
        type="2d"
        id={id}
        className="chart-canvas"
        style={{ height: `${height}px` }}
      />
      {unit ? <Text className="chart-unit">{unit}</Text> : null}
    </View>
  )
}
