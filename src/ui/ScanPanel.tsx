import { useEffect, useRef, useState } from 'react'
import type { CustomFood } from '../store/storage'
import { uid } from '../store/storage'
import { scale } from '../core/nutrition'
import { lookupBarcode, normalizeBarcode } from '../core/openFoodFacts'
import type { OffProduct } from '../core/openFoodFacts'
import { Bullets, Stats } from './bits'
import { IconClose, IconLock, IconScan, IconSparkle } from './icons'
import { r0 } from './format'

type Phase = { kind: 'idle' } | { kind: 'scanning' } | { kind: 'looking'; code: string } | { kind: 'found'; product: OffProduct; fromLocal?: CustomFood } | { kind: 'missing'; code: string } | { kind: 'error'; code: string; message: string }

interface DetectorLike { detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string; format: string }>> }
interface DetectorCtor { new (opts?: { formats: string[] }): DetectorLike; getSupportedFormats?: () => Promise<string[]> }
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']
function getDetectorCtor(): DetectorCtor | null {
  const w = window as unknown as { BarcodeDetector?: DetectorCtor }
  return typeof w.BarcodeDetector === 'function' ? w.BarcodeDetector : null
}

/**
 * 扫条码录包装食品：相机（BarcodeDetector）或手输条码 → 本机已存的条码 → Open Food Facts。
 * 查到后按克数换算成一条自定义食物并记住条码；查不到就转手动录入，录完同样记住条码。
 */
export function ScanPanel({ customFoods, onPick, onAddCustomFood, onManual, onBack }: {
  customFoods: CustomFood[]
  onPick: (food: CustomFood) => void
  onAddCustomFood: (food: CustomFood) => void
  onManual: (barcode: string) => void
  onBack: () => void
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [manual, setManual] = useState('')
  const [grams, setGrams] = useState<number>(100)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const Detector = getDetectorCtor()
  const canCamera = !!Detector && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')

  const stopCamera = () => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }
  useEffect(() => () => stopCamera(), [])

  const lookup = async (raw: string) => {
    const code = normalizeBarcode(raw)
    if (!code) { setPhase({ kind: 'error', code: raw, message: '条码应是 8 或 13 位数字' }); return }
    stopCamera()
    const local = customFoods.find((f) => f.barcode === code)
    if (local) {
      // 本机已录过：从一份的营养反推每 100 g（份量描述形如 "330 g"），推不出就按一份原样用
      const g = Number((local.serving.match(/(\d+(?:\.\d+)?)\s*(g|ml)/) || [])[1])
      const per100 = g > 0 ? scale(local.nutrients, 100 / g) : local.nutrients
      setGrams(g > 0 ? g : 100)
      setPhase({ kind: 'found', product: { code, name: local.name, per100, servingG: g > 0 ? g : undefined, source: 'openfoodfacts' }, fromLocal: local })
      return
    }
    setPhase({ kind: 'looking', code })
    try {
      const p = await lookupBarcode(code)
      if (!p) { setPhase({ kind: 'missing', code }); return }
      setGrams(p.servingG || 100)
      setPhase({ kind: 'found', product: p })
    } catch (e) {
      setPhase({ kind: 'error', code, message: e instanceof Error ? e.message : String(e) })
    }
  }

  const startCamera = async () => {
    if (!Detector) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      const v = videoRef.current
      if (!v) return
      v.srcObject = stream
      await v.play()
      setPhase({ kind: 'scanning' })
      const det = new Detector({ formats: FORMATS })
      timerRef.current = window.setInterval(async () => {
        const vid = videoRef.current
        if (!vid || vid.readyState < 2) return
        try {
          const codes = await det.detect(vid)
          const hit = codes.find((c) => FORMATS.includes(c.format)) || codes[0]
          if (hit?.rawValue) void lookup(hit.rawValue)
        } catch { /* 单帧识别失败很常见，继续 */ }
      }, 350)
    } catch (e) {
      setPhase({ kind: 'error', code: '', message: '打不开相机：' + (e instanceof Error ? e.message : String(e)) + '。可以在下面手输条码。' })
    }
  }

  const onPhoto = async (file: File | undefined) => {
    if (!file || !Detector) return
    try {
      const bmp = await createImageBitmap(file)
      const det = new Detector({ formats: FORMATS })
      const codes = await det.detect(bmp)
      if (codes[0]?.rawValue) void lookup(codes[0].rawValue)
      else setPhase({ kind: 'error', code: '', message: '照片里没识别到条码，试试离近一点、光线亮一点。' })
    } catch (e) {
      setPhase({ kind: 'error', code: '', message: e instanceof Error ? e.message : String(e) })
    }
  }

  const choose = (p: OffProduct, local?: CustomFood) => {
    const g = Math.max(1, grams)
    const food: CustomFood = {
      id: local?.id || uid(),
      name: local?.name || (p.brand && !p.name.includes(p.brand) ? `${p.name}（${p.brand}）` : p.name),
      serving: `${g} g`,
      nutrients: scale(p.per100, g / 100),
      barcode: p.code,
    }
    onAddCustomFood(food)
    onPick(food)
  }

  return (
    <div className="stack">
      {(phase.kind === 'idle' || phase.kind === 'scanning' || phase.kind === 'error') && (
        <div className="card stack">
          <div className="row between">
            <h2>扫条码</h2>
            {phase.kind === 'scanning' && <button className="btn ghost sm" onClick={() => { stopCamera(); setPhase({ kind: 'idle' }) }}>停止</button>}
          </div>
          {canCamera && (
            <div className={`scan-view${phase.kind === 'scanning' ? ' live' : ''}`}>
              <video ref={videoRef} className="scan-video" playsInline muted />
              {phase.kind !== 'scanning' && (
                <button className="btn primary scan-start" onClick={startCamera}><IconScan size={16} /> 打开相机扫码</button>
              )}
              {phase.kind === 'scanning' && <div className="scan-hint">对准包装上的条码</div>}
            </div>
          )}
          {!canCamera && (
            <Bullets items={[
              { icon: <IconScan />, text: Detector ? '相机只在 https 或本机地址下可用，这里请手输条码' : '这个浏览器不支持相机识条码，请手输包装上的条码数字' },
              { icon: <IconLock />, text: '查询直连 Open Food Facts 开放数据库，不经过任何中间服务器' },
            ]} />
          )}
          <div className="row">
            <input className="input grow" inputMode="numeric" pattern="[0-9]*" placeholder="或手输条码数字" value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && manual.trim()) void lookup(manual) }} />
            <button className="btn primary" disabled={!normalizeBarcode(manual)} onClick={() => void lookup(manual)}>查询</button>
          </div>
          {canCamera && (
            <label className="btn" style={{ textAlign: 'center' }}>
              拍一张照片识别
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => void onPhoto(e.target.files?.[0])} />
            </label>
          )}
          {phase.kind === 'error' && <p className="small" style={{ color: 'var(--bad-text)' }}>{phase.message}</p>}
          <p className="tiny muted">数据来自 Open Food Facts（ODbL 开放数据库），以国外与进口商品为主，国内商品可能查不到。</p>
          <button className="btn" onClick={onBack}>返回</button>
        </div>
      )}

      {phase.kind === 'looking' && (
        <div className="card stack">
          <h2>查询中…</h2>
          <p className="small muted num">条码 {phase.code}</p>
        </div>
      )}

      {phase.kind === 'found' && (
        <div className="card stack">
          <div className="row between">
            <div>
              <h2>{phase.product.name}</h2>
              <p className="small muted">{[phase.product.brand, phase.product.quantity].filter(Boolean).join(' · ')}{phase.fromLocal ? ' · 本机已录过' : ' · Open Food Facts'}</p>
            </div>
            <button className="btn ghost sm" onClick={() => setPhase({ kind: 'idle' })} aria-label="关闭"><IconClose /></button>
          </div>
          <div>
            <p className="small ink2" style={{ marginBottom: 4 }}>每 100 g</p>
            <Stats dense items={[
              { label: '热量', value: r0(phase.product.per100.kcal), unit: '千卡' },
              { label: '蛋白', value: r0(phase.product.per100.protein), unit: 'g' },
              { label: '脂肪', value: r0(phase.product.per100.fat), unit: 'g' },
              { label: '碳水', value: r0(phase.product.per100.carbs), unit: 'g' },
            ]} />
          </div>
          <div className="field"><label>这次吃多少（克 / 毫升）</label>
            <div className="row wrap">
              <input className="input" type="number" inputMode="numeric" style={{ width: 110 }} value={grams} onChange={(e) => setGrams(Number(e.target.value) || 0)} />
              {[phase.product.servingG, 100, 50].filter((v, i, a): v is number => !!v && a.indexOf(v) === i).map((v) => (
                <button key={v} className={`chip${grams === v ? ' on' : ''}`} onClick={() => setGrams(v)}>{v === phase.product.servingG ? `一份 ${v}` : `${v} g`}</button>
              ))}
            </div>
          </div>
          <Stats dense items={[
            { label: '这一份热量', value: r0(phase.product.per100.kcal * grams / 100), unit: '千卡' },
            { label: '蛋白', value: r0(phase.product.per100.protein * grams / 100), unit: 'g' },
            { label: '脂肪', value: r0(phase.product.per100.fat * grams / 100), unit: 'g' },
            { label: '碳水', value: r0(phase.product.per100.carbs * grams / 100), unit: 'g' },
          ]} />
          <div className="row">
            <button className="btn" onClick={() => setPhase({ kind: 'idle' })}>再扫一个</button>
            <button className="btn primary grow" disabled={grams <= 0} onClick={() => choose(phase.product, phase.fromLocal)}>选用这份</button>
          </div>
        </div>
      )}

      {phase.kind === 'missing' && (
        <div className="card stack">
          <h2>没查到这个条码</h2>
          <p className="small ink2 num">{phase.code}</p>
          <Bullets items={[
            { icon: <IconSparkle />, text: 'Open Food Facts 对国内商品收录少。看包装上的营养成分表手动录一次，这个条码下次直接就能用。' },
          ]} />
          <div className="row">
            <button className="btn" onClick={() => setPhase({ kind: 'idle' })}>再扫一个</button>
            <button className="btn primary grow" onClick={() => onManual(phase.code)}>按成分表录入</button>
          </div>
        </div>
      )}
    </div>
  )
}
