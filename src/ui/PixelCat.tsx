import { useEffect, useMemo, useRef, useState } from 'react'
import { ART_DISPLAY, ART_SIZE, artLayersFor, artPlanForCat } from '../core/catArt'
import { catKey, type CatSpec } from '../core/pixelcat'
import { composePlan, type Rgba } from '../core/pixelize'
import type { Mood } from '../core/creatureTalk'
import { hashString } from '../core/rng'
import { CREATURE_KEYFRAMES, MoodAccent, POOF_SWAP_AT_MS, POOF_TOTAL_MS, SmokePoof, prefersReducedMotion } from './Creature'

/**
 * 像素小管家的渲染：形象来自 QMonster 像素包。
 *
 * 合成走 `composePlan`（`pixel-rgba-v1` 语义，与 QMonster 渲染器逐字节一致），计划由
 * `catArt` 按包里的 profile 推导。图层是 64px 的小色板 PNG，Vite 会把它们内联成 data URI，
 * 所以单文件形态也能用。显示按整数倍 `image-rendering: pixelated` 放大，像素格才整齐。
 *
 * 心情点缀、冒烟换脸、减少动态偏好沿用 SVG 小管家那套。
 */

const LAYER_URLS = import.meta.glob('../assets/pixelpack/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

function layerUrl(id: string): string {
  const url = LAYER_URLS[`../assets/pixelpack/${id}.png`]
  if (!url) throw new Error(`缺像素包图层 ${id}`)
  return url
}

const N = ART_SIZE

const images = new Map<string, Promise<HTMLImageElement>>()
function loadLayer(id: string): Promise<HTMLImageElement> {
  let p = images.get(id)
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`像素包图层加载失败 ${id}`))
      img.src = layerUrl(id)
    })
    images.set(id, p)
    p.catch(() => images.delete(id))
  }
  return p
}

let scratch: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null
function scratchCanvas() {
  if (!scratch) {
    const canvas = document.createElement('canvas')
    canvas.width = N
    canvas.height = N
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('canvas 2d 不可用')
    ctx.imageSmoothingEnabled = false
    scratch = { canvas, ctx }
  }
  return scratch
}

/** 图层像素数组缓存：PNG 只解码一次 */
const pixels = new Map<string, Rgba>()
async function layerPixels(id: string): Promise<Rgba> {
  const hit = pixels.get(id)
  if (hit) return hit
  const img = await loadLayer(id)
  const { ctx } = scratchCanvas()
  ctx.clearRect(0, 0, N, N)
  ctx.drawImage(img, 0, 0)
  const data = new Uint8ClampedArray(ctx.getImageData(0, 0, N, N).data)
  pixels.set(id, data)
  return data
}

const composed = new Map<string, Promise<ImageData | null>>()

/** 合成一只猫；包里画不出来时返回 null（孵化被限制在可孵化的岛上，正常不该出现） */
export function composeCat(spec: CatSpec): Promise<ImageData | null> {
  const key = catKey(spec)
  let p = composed.get(key)
  if (!p) {
    p = (async () => {
      const ops = artPlanForCat(spec)
      if (!ops) return null
      const loaded = new Map<string, Rgba>()
      await Promise.all(artLayersFor(ops).map(async (id) => loaded.set(id, await layerPixels(id))))
      const px = composePlan(ops, (id) => {
        const data = loaded.get(id)
        if (!data) throw new Error(`缺像素包图层 ${id}`)
        return data
      }, N)
      const out = new ImageData(N, N)
      out.data.set(px)
      return out
    })()
    composed.set(key, p)
    p.catch(() => composed.delete(key))
  }
  return p
}

// 位图做位移动画会读作"在飘"，只做以脚底为轴的原地呼吸
const PIXEL_KEYFRAMES = `
@keyframes pixelcat-breathe { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.015, 1.03); } }
@media (prefers-reduced-motion: reduce) { .pixelcat-breathe { animation: none !important; } }
`

/** 一只像素小管家。size 默认 ART_DISPLAY（原生 ×2），换值请保持整数倍，否则像素格会不均匀。
 *  spec 变化时先把新样子合成好，再冒烟、烟最浓时换脸，散开时已是新长相 */
export function PixelCatView({ spec, size = ART_DISPLAY, className, mood = 'neutral' }: { spec: CatSpec; size?: number; className?: string; mood?: Mood }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [displayed, setDisplayed] = useState(spec)
  const [poofKey, setPoofKey] = useState(0)
  const [poofing, setPoofing] = useState(false)
  const shownKey = useRef(catKey(spec))
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const seed = useMemo(() => hashString(catKey(displayed)), [displayed])

  useEffect(() => {
    const key = catKey(spec)
    if (key === shownKey.current) return
    shownKey.current = key
    let cancelled = false
    composeCat(spec)
      .then(() => {
        if (cancelled) return
        timers.current.forEach(clearTimeout)
        timers.current = []
        if (prefersReducedMotion()) { setDisplayed(spec); return }
        setPoofing(true)
        setPoofKey((k) => k + 1)
        timers.current.push(setTimeout(() => setDisplayed(spec), POOF_SWAP_AT_MS))
        // 兜底：不指望 onAnimationEnd 一定触发，到点强制收起烟雾
        timers.current.push(setTimeout(() => setPoofing(false), POOF_TOTAL_MS))
      })
      .catch(() => { if (!cancelled) setDisplayed(spec) })
    return () => { cancelled = true }
  }, [spec])

  useEffect(() => {
    let cancelled = false
    composeCat(displayed)
      .then((img) => {
        const ctx = canvasRef.current?.getContext('2d')
        if (cancelled || !ctx) return
        ctx.clearRect(0, 0, N, N)
        if (img) ctx.putImageData(img, 0, 0)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [displayed])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size, flex: 'none' }} role="img" aria-label="健康小管家">
      <style>{CREATURE_KEYFRAMES + PIXEL_KEYFRAMES}</style>
      <canvas
        ref={canvasRef}
        width={N}
        height={N}
        className="pixelcat-breathe"
        style={{
          position: 'absolute', inset: 0, width: size, height: size, imageRendering: 'pixelated',
          transformOrigin: '50% 100%', animation: 'pixelcat-breathe 3.4s ease-in-out infinite', animationDelay: `${-((seed % 340) / 100)}s`,
        }}
      />
      <svg viewBox="-10 -14 120 120" width={size} height={size} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden>
        <g transform="translate(6,-4)"><MoodAccent mood={mood} /></g>
        {poofing && <SmokePoof key={poofKey} onDone={() => setPoofing(false)} />}
      </svg>
    </div>
  )
}
