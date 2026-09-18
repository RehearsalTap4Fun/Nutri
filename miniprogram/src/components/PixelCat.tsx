/**
 * 健康小管家的像素猫。
 *
 * 合成逻辑一行都没改：`artPlanForCat` 给出绘制计划，`composePlan` 把 58 张图层里用到的
 * 几张按计划叠成一张 64×64 的 RGBA。这两个函数是纯数组运算，和网页版共用同一份源码。
 *
 * 小程序侧只换了三件事：
 *  - 图层来源从 `import.meta.glob` 换成烤好的 base64 表（见 scripts/genPixelPack.mjs）
 *  - 解码用离屏 Canvas 2D 的 `createImage` + `getImageData`
 *  - 放大不靠 CSS 的 `image-rendering: pixelated`（WXSS 支持不稳），
 *    改成关掉 `imageSmoothingEnabled` 后用 `drawImage` 自己放大，边缘是硬的
 */
import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Canvas, View, Text } from '@tarojs/components'
import { ART_SIZE, artLayersFor, artPlanForCat } from '@core/catArt'
import type { CatSpecLike } from '@core/catArt'
import { composePlan } from '@core/pixelize'
import type { Rgba } from '@core/pixelize'
import { LAYER_DATA } from '../assets/pixelpackData'

interface Props {
  id?: string
  spec: CatSpecLike
  /** 显示边长，单位与样式里的 px 一致 */
  size?: number
}

/** 离屏画布只建一次：一张用来解码单张图层，一张用来放合成结果 */
let decodeCanvas: any = null
let frameCanvas: any = null

function offscreen(): { decode: any; frame: any } | null {
  const api = Taro as unknown as {
    createOffscreenCanvas?: (o: { type: string; width: number; height: number }) => any
  }
  if (typeof api.createOffscreenCanvas !== 'function') return null
  if (!decodeCanvas) {
    decodeCanvas = api.createOffscreenCanvas({ type: '2d', width: ART_SIZE, height: ART_SIZE })
  }
  if (!frameCanvas) {
    frameCanvas = api.createOffscreenCanvas({ type: '2d', width: ART_SIZE, height: ART_SIZE })
  }
  if (!decodeCanvas || !frameCanvas) return null
  return { decode: decodeCanvas, frame: frameCanvas }
}

/** 图层像素缓存：同一张图层在一次会话里只解码一次 */
const pixelCache = new Map<string, Rgba>()
const pending = new Map<string, Promise<Rgba>>()

function loadLayer(layerId: string): Promise<Rgba> {
  const hit = pixelCache.get(layerId)
  if (hit) return Promise.resolve(hit)
  const inflight = pending.get(layerId)
  if (inflight) return inflight

  const p = new Promise<Rgba>((resolve, reject) => {
    const off = offscreen()
    const data = LAYER_DATA[layerId]
    if (!off || !data) {
      reject(new Error(`缺少图层 ${layerId}`))
      return
    }
    const ctx = off.decode.getContext('2d')
    const img = off.decode.createImage()
    img.onload = () => {
      ctx.clearRect(0, 0, ART_SIZE, ART_SIZE)
      ctx.drawImage(img, 0, 0, ART_SIZE, ART_SIZE)
      const px = new Uint8ClampedArray(ctx.getImageData(0, 0, ART_SIZE, ART_SIZE).data)
      pixelCache.set(layerId, px)
      pending.delete(layerId)
      resolve(px)
    }
    img.onerror = () => {
      pending.delete(layerId)
      reject(new Error(`图层解码失败 ${layerId}`))
    }
    img.src = data
  })
  pending.set(layerId, p)
  return p
}

/** 合成一只猫，返回 64×64 的 RGBA */
async function composeCat(spec: CatSpecLike): Promise<Rgba | null> {
  const ops = artPlanForCat(spec)
  if (!ops) return null
  const ids = artLayersFor(ops)
  const loaded = await Promise.all(ids.map((i) => loadLayer(i)))
  const table = new Map<string, Rgba>()
  ids.forEach((i, n) => table.set(i, loaded[n]))
  return composePlan(ops, (i) => table.get(i)!, ART_SIZE)
}

export function PixelCat({ id = 'pixelCat', spec, size = 128 }: Props) {
  const lastKey = useRef('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const key = JSON.stringify(spec)
    if (lastKey.current === key) return

    let cancelled = false
    let retried = false

    const paint = (rgba: Rgba) => {
      Taro.createSelectorQuery()
        .select(`#${id}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          const item = res && res[0]
          if (!item || !item.node) {
            if (!retried) {
              retried = true
              setTimeout(() => paint(rgba), 60)
            }
            return
          }
          const off = offscreen()
          if (!off) {
            setFailed(true)
            return
          }
          // 先把合成结果放进离屏画布
          const fctx = off.frame.getContext('2d')
          const imageData = fctx.createImageData(ART_SIZE, ART_SIZE)
          imageData.data.set(rgba)
          fctx.putImageData(imageData, 0, 0)

          // 再关掉平滑放大到显示画布，这样像素边缘是硬的
          const canvas = item.node
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          const dpr = pixelRatio()
          const w = item.width
          const h = item.height
          canvas.width = Math.round(w * dpr)
          canvas.height = Math.round(h * dpr)
          ctx.imageSmoothingEnabled = false
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(off.frame, 0, 0, ART_SIZE, ART_SIZE, 0, 0, canvas.width, canvas.height)

          lastKey.current = key
        })
    }

    composeCat(spec)
      .then((rgba) => {
        if (cancelled) return
        if (!rgba) {
          setFailed(true)
          return
        }
        setFailed(false)
        paint(rgba)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [id, spec])

  if (failed) {
    return (
      <View className="cat-slot" style={{ width: `${size}px`, height: `${size}px` }}>
        <Text className="muted">画不出来</Text>
      </View>
    )
  }

  return (
    <Canvas
      type="2d"
      id={id}
      className="cat-canvas"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  )
}

/** getSystemInfoSync 已标记废弃，新基础库用 getWindowInfo */
function pixelRatio(): number {
  const api = Taro as unknown as { getWindowInfo?: () => { pixelRatio?: number } }
  if (typeof api.getWindowInfo === 'function') {
    const r = api.getWindowInfo().pixelRatio
    if (r) return r
  }
  return Taro.getSystemInfoSync().pixelRatio || 2
}
