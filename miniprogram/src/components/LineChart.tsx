/**
 * 折线图（体重趋势用）。
 *
 * 小程序没有 svg 元素，网页版那三张手写 SVG 图里，柱状图和占比条用普通视图就能画，
 * 只有折线必须走 canvas。这里用的是新版 `Canvas 2D`（`type="2d"`），接口与浏览器一致，
 * 旧的 `wx.createCanvasContext` 那套不用。
 *
 * **画布不出现在版面里。** canvas 在部分机型上走原生层，会压住自定义导航这类普通视图，
 * z-index 管不住。所以画布挪到屏幕外，画完导出成临时文件，版面上显示的是普通 `Image`。
 */
import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Canvas, View, Text, Image } from '@tarojs/components'

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

// canvas 里拿不到 CSS 变量，只能同步一份。改 app.scss 的 token 时记得跟着改这里。
const INK = '#2c2e2a'      /* --ink */
const MUTED = '#6b6e68'    /* --muted */
const LINE = 'rgba(44, 46, 42, 0.14)'  /* --hair */
const ACCENT = '#8ed462'   /* --land */

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
  const [url, setUrl] = useState('')
  // 画布挪到屏幕外后量不到宽度，用屏幕宽减去页面左右内边距估一个
  const [stageW, setStageW] = useState(320)

  useEffect(() => {
    // 页面左右各 32rpx 内边距，换算成逻辑像素
    const info = Taro.getWindowInfo ? Taro.getWindowInfo() : Taro.getSystemInfoSync()
    const w = (info.windowWidth || 375) - 32
    setStageW(w > 0 ? w : 320)
  }, [])

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
        // 屏幕外的节点理论上仍有尺寸，量不到就用估算值兜底
        const w = item.width || stageW
        const h = item.height || height
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

        // 导出成临时文件，版面上用 Image 显示
        Taro.canvasToTempFilePath({
          canvas,
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
          destWidth: canvas.width,
          destHeight: canvas.height,
          fileType: 'png',
          success: (r) => {
            setUrl(r.tempFilePath)
            drawn.current = sig
          },
          fail: () => undefined,
        })
        })
    }
    run()
  }, [id, points, guide, stageW])

  if (points.length < 2) {
    return (
      <View className="chart-empty" style={{ height: `${height}px` }}>
        <Text className="muted">记满两天才画得出趋势</Text>
      </View>
    )
  }

  return (
    <View className="chart-wrap">
      {/* 画图用的画布，挪到屏幕外，不参与版面也不会压住导航 */}
      <Canvas
        type="2d"
        id={id}
        className="chart-stage"
        style={{ width: `${stageW}px`, height: `${height}px` }}
      />
      {url ? (
        <Image className="chart-img" src={url} mode="widthFix" style={{ width: '100%' }} />
      ) : (
        <View className="chart-empty" style={{ height: `${height}px` }}>
          <Text className="muted">正在画…</Text>
        </View>
      )}
      {unit ? <Text className="chart-unit">{unit}</Text> : null}
    </View>
  )
}
