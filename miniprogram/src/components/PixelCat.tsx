/**
 * 健康小管家的像素猫。
 *
 * 合成逻辑一行都没改：`artPlanForCat` 给出绘制计划，`composePlan` 把用到的图层按计划叠成
 * 一张 64×64 的 RGBA。这两个是纯数组运算，和网页版共用同一份源码。
 *
 * 真机上 Canvas 2D 的可用面比模拟器窄，所以这里刻意只用四个最基础的接口：
 * `drawImage`、`getImageData`、`createImageData`、`putImageData`。
 *
 * 具体避开了三样东西（都踩过）：
 *  - **离屏画布**：`createOffscreenCanvas` 及其 `createImage` 真机行为不一致。
 *    改成全程复用同一个显示 canvas 节点：先把它调成 64×64 解码图层，最后再调成输出尺寸。
 *  - **base64 的 data URI**：真机上 `createImage` 加载 data URI 时 onload 和 onerror 可能都不回调，
 *    画布就一直空着。改成优先加载包内 PNG 文件，失败或超时才回退到 base64。
 *  - **带缩放的 drawImage 加 `imageSmoothingEnabled`**：关平滑在部分机型上不生效，放大后是糊的。
 *    改成纯 JS 最近邻展开，再一次性 `putImageData`，边缘一定是硬的。
 *
 * **画布不出现在版面里。** canvas 即使是 2d 类型，在部分机型上仍走原生层，
 * 会压在自定义导航之类的普通视图上面，z-index 管不住。所以这里把画布挪到屏幕外，
 * 合成完导出成临时文件，版面上显示的是一个普通 `Image`。
 *
 * 这样做顺带把待机动画的路修宽了：呼吸是一条作用在元素上的 CSS transform，
 * 加在普通 Image 上干净可靠，加在原生层的 canvas 上才是真机上容易出岔子的那类。
 * 以后要做逐帧动画也一样——预先导出几帧再换 src 就行，不必把活画布放回版面。
 */
import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { Canvas, View, Text, Image } from '@tarojs/components'
import { ART_SIZE, artLayersFor, artPlanForCat } from '@core/catArt'
import type { CatSpecLike } from '@core/catArt'
import { SCENE_GEOMETRY, SCENE_H, SCENE_W, backdropLayer } from '@core/catScene'
import { composePlan } from '@core/pixelize'
import type { Rgba } from '@core/pixelize'
import { composeScene } from '@core/pixelscene'
import { hashString } from '@core/rng'
import { LAYER_DATA, LAYER_PATH } from '../assets/pixelpackData'
import { SCENE_DATA, SCENE_PATH } from '../assets/pixelsceneData'

interface Props {
  id?: string
  spec: CatSpecLike & { backdrop?: string }
  /** 显示**高度**（CSS px）。宽按场景比例（96:64）推出来，画布不是方的 */
  size?: number
}

/** 图层像素缓存：同一张图层在一次会话里只解码一次 */
const pixelCache = new Map<string, Rgba>()

const LOAD_TIMEOUT_MS = 2500

/** getSystemInfoSync 已标记废弃，新基础库用 getWindowInfo */
function pixelRatio(): number {
  const api = Taro as unknown as { getWindowInfo?: () => { pixelRatio?: number } }
  if (typeof api.getWindowInfo === 'function') {
    const r = api.getWindowInfo().pixelRatio
    if (r) return r
  }
  return Taro.getSystemInfoSync().pixelRatio || 2
}

/** 图层 id 属于猫包还是场景包：两个包的 id 前缀不同，不会撞 */
function sourcesFor(layerId: string): string[] {
  const out: string[] = []
  if (SCENE_DATA[layerId]) {
    out.push(`${SCENE_PATH}/${layerId}.png`)
    out.push(SCENE_DATA[layerId])
  } else {
    out.push(`${LAYER_PATH}/${layerId}.png`)
    if (LAYER_DATA[layerId]) out.push(LAYER_DATA[layerId])
  }
  return out
}

/** 拿到一张能画的图。先试包内文件，再试 base64，各自带超时 */
function loadImage(canvas: any, layerId: string): Promise<any> {
  const tryOne = (src: string) =>
    new Promise<any>((resolve, reject) => {
      const img = canvas.createImage()
      let settled = false
      const done = (ok: boolean) => {
        if (settled) return
        settled = true
        ok ? resolve(img) : reject(new Error(src.slice(0, 24)))
      }
      img.onload = () => done(true)
      img.onerror = () => done(false)
      setTimeout(() => done(false), LOAD_TIMEOUT_MS)
      img.src = src
    })

  const [first, fallback] = sourcesFor(layerId)
  return tryOne(first).catch(() => {
    if (!fallback) throw new Error(`缺图层 ${layerId}`)
    return tryOne(fallback)
  })
}

/** 最近邻放大。不用 drawImage 缩放，因为关平滑在部分机型上不生效。场景不是方的，所以宽高分开算 */
function scaleRgba(src: Rgba, w: number, h: number, k: number): Uint8ClampedArray {
  if (k === 1) return src
  const W = w * k
  const H = h * k
  const out = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    const sy = (y / k) | 0
    for (let x = 0; x < W; x++) {
      const si = ((sy * w + ((x / k) | 0)) << 2)
      const di = ((y * W + x) << 2)
      out[di] = src[si]
      out[di + 1] = src[si + 1]
      out[di + 2] = src[si + 2]
      out[di + 3] = src[si + 3]
    }
  }
  return out
}

export function PixelCat({ id = 'pixelCat', spec, size = 128 }: Props) {
  const lastKey = useRef('')
  const [err, setErr] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    const key = JSON.stringify(spec)
    if (lastKey.current === key) return
    let cancelled = false

    const ops = artPlanForCat(spec)
    if (!ops) {
      setErr('这只猫没有对应的美术')
      return
    }

    const withNode = (attempt: number) => {
      Taro.createSelectorQuery()
        .select(`#${id}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (cancelled) return
          const item = res && res[0]
          if (!item || !item.node) {
            // 首屏 canvas 还没布局完时查不到，隔一会儿再试
            if (attempt < 5) setTimeout(() => withNode(attempt + 1), 80)
            else setErr('找不到画布节点')
            return
          }
          void render(item.node, item.width, item.height)
        })
    }

    const render = async (canvas: any, cssW: number, cssH: number) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setErr('拿不到 2d 上下文')
        return
      }
      const N = ART_SIZE

      try {
        // ── 解码：画布临时调到图层自己的尺寸，逐张画上去再读像素 ──
        // 猫的图层是 64×64，背景是 96×64，不能一律按方图读，否则背景会被截掉右边三分之一
        const bdId = backdropLayer(spec.backdrop || 'none')
        const ids = artLayersFor(ops)
        const need = [...ids, ...(bdId ? [bdId] : [])].filter((i) => !pixelCache.has(i))
        for (const layerId of need) {
          const isScene = layerId === bdId
          const lw = isScene ? SCENE_W : N
          const lh = isScene ? SCENE_H : N
          canvas.width = lw
          canvas.height = lh
          const img = await loadImage(canvas, layerId)
          if (cancelled) return
          ctx.clearRect(0, 0, lw, lh)
          ctx.drawImage(img, 0, 0, lw, lh)
          pixelCache.set(layerId, new Uint8ClampedArray(ctx.getImageData(0, 0, lw, lh).data))
        }

        // ── 合成：纯数组运算，与网页版同一份代码 ──
        const cat = composePlan(ops, (i) => pixelCache.get(i)!, N)
        const rgba = composeScene(bdId ? pixelCache.get(bdId)! : null, cat, SCENE_GEOMETRY)

        // ── 放大与输出（96×64，不是方的） ──
        const dpr = pixelRatio()
        const targetW = Math.max(1, Math.round((cssW || size * (SCENE_W / SCENE_H)) * dpr))
        const k = Math.max(1, Math.round(targetW / SCENE_W))
        const out = scaleRgba(rgba, SCENE_W, SCENE_H, k)
        const outW = SCENE_W * k
        const outH = SCENE_H * k
        canvas.width = outW
        canvas.height = outH
        const imageData = ctx.createImageData(outW, outH)
        imageData.data.set(out)
        ctx.putImageData(imageData, 0, 0)

        // 导出成临时文件，版面上用 Image 显示，画布本身留在屏幕外
        const file = await new Promise<string>((resolve, reject) => {
          Taro.canvasToTempFilePath({
            canvas,
            x: 0,
            y: 0,
            width: outW,
            height: outH,
            destWidth: outW,
            destHeight: outH,
            fileType: 'png',
            success: (r) => resolve(r.tempFilePath),
            fail: (e) => reject(new Error(e && e.errMsg ? e.errMsg : '导出失败')),
          })
        })

        if (!cancelled) {
          setUrl(file)
          lastKey.current = key
          setErr('')
        }
      } catch (e) {
        if (!cancelled) setErr(`图层加载失败：${(e as Error).message}`)
      }
    }

    withNode(0)
    return () => {
      cancelled = true
    }
  }, [id, spec, size])

  // size 是高，宽按场景比例推：画布是 96×64 的一幕，不是方图
  const boxW = Math.round(size * (SCENE_W / SCENE_H))

  return (
    <View className="cat-holder" style={{ width: `${boxW}px`, height: `${size}px` }}>
      {/* 合成用的画布，挪到屏幕外，不参与版面也不会压住导航 */}
      <Canvas type="2d" id={id} className="cat-stage" style={{ width: `${boxW}px`, height: `${size}px` }} />
      {url ? (
        <Image
          className="cat-img"
          src={url}
          mode="scaleToFill"
          style={{
            width: `${boxW}px`,
            height: `${size}px`,
            // 每只猫错开相位，同屏几只不会一起起伏
            animationDelay: `${-((hashString(JSON.stringify(spec)) % 340) / 100)}s`,
          }}
        />
      ) : null}
      {err ? <Text className="cat-err">{err}</Text> : null}
    </View>
  )
}
