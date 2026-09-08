import { devLabel, varX, varianceOf, type Tol, type VarianceMode } from '../core/variance'
import React, { useEffect, useRef, useState } from 'react'

/** 测量容器宽度，让 viewBox 与像素 1:1，文字不随缩放变大 */
function useWidth(fallback = 320): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => { const cw = el.clientWidth; if (cw > 0) setW(cw) }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

export interface BarDatum {
  label: string
  value: number
  highlight?: boolean
  dim?: boolean
  tip?: string
}

/** 单系列柱状图：≤24px 柱、4px 圆角顶、目标水平线、点击/悬停提示 */
export function BarChart({ data, target, height = 150, unit = '' }: { data: BarDatum[]; target?: number; height?: number; unit?: string }) {
  const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null)
  const [wrapRef, W] = useWidth()
  const padL = 34
  const padR = 8
  const padT = 14
  const padB = 22
  const innerW = W - padL - padR
  const innerH = height - padT - padB
  const maxV = Math.max(target || 0, ...data.map((d) => d.value), 1) * 1.08
  const y = (v: number) => padT + innerH - (v / maxV) * innerH
  const band = innerW / data.length
  const bw = Math.min(24, band * 0.6)
  const ticks = niceTicks(maxV, 3)
  return (
    <div className="chart-wrap" ref={wrapRef} onMouseLeave={() => setTip(null)}>
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} width={W} height={height} role="img" aria-label="柱状图">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} />
            <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" className="num">{fmtTick(t)}</text>
          </g>
        ))}
        <line className="axis" x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} />
        {target !== undefined && target > 0 && (
          <g>
            <line className="target" x1={padL} x2={W - padR} y1={y(target)} y2={y(target)} />
            <text x={W - padR} y={y(target) - 4} textAnchor="end" className="lbl">目标 {fmtTick(target)}</text>
          </g>
        )}
        {data.map((d, i) => {
          const cx = padL + band * i + band / 2
          const h = Math.max(0, y(0) - y(d.value))
          const top = y(d.value)
          const r = Math.min(4, h)
          const path = h > 0
            ? `M${cx - bw / 2},${y(0)} V${top + r} Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top} H${cx + bw / 2 - r} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r} V${y(0)} Z`
            : ''
          return (
            <g key={i}>
              {path && <path d={path} className={`bar${d.highlight ? ' today' : ''}${d.dim ? ' dim' : ''}`} />}
              <rect className="hit" x={padL + band * i} y={padT} width={band} height={innerH}
                onMouseEnter={() => setTip({ i, x: cx, y: top })} onClick={() => setTip(tip?.i === i ? null : { i, x: cx, y: top })} />
              <text x={cx} y={height - 6} textAnchor="middle">{d.label}</text>
              {d.highlight && d.value > 0 && <text x={cx} y={top - 5} textAnchor="middle" className="lbl num">{Math.round(d.value)}</text>}
            </g>
          )
        })}
      </svg>
      {tip && (
        <div className="tip" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / height) * 100}%` }}>
          {data[tip.i].tip || `${data[tip.i].label}：${Math.round(data[tip.i].value)}${unit}`}
        </div>
      )}
    </div>
  )
}

export interface LinePoint {
  label: string
  value: number
  tip?: string
}

/** 单系列折线：2px 线、≥8px 点带表面环、末点直接标注 */
export function LineChart({ data, height = 150, unit = '' }: { data: LinePoint[]; height?: number; unit?: string }) {
  const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null)
  const [wrapRef, W] = useWidth()
  const padL = 38
  const padR = 26
  const padT = 14
  const padB = 22
  const innerW = W - padL - padR
  const innerH = height - padT - padB
  if (!data.length) return <div className="empty small" ref={wrapRef}>暂无数据</div>
  const vals = data.map((d) => d.value)
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5 }
  const pad = (hi - lo) * 0.15
  lo -= pad
  hi += pad
  const x = (i: number) => (data.length === 1 ? padL + innerW / 2 : padL + (innerW * i) / (data.length - 1))
  const y = (v: number) => padT + innerH - ((v - lo) / (hi - lo)) * innerH
  const ticks = niceTicks(hi, 3, lo)
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ')
  const labelEvery = Math.max(1, Math.ceil(data.length / 6))
  return (
    <div className="chart-wrap" ref={wrapRef} onMouseLeave={() => setTip(null)}>
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} width={W} height={height} role="img" aria-label="折线图">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} />
            <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" className="num">{t.toFixed(1)}</text>
          </g>
        ))}
        <path d={path} className="line" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.value)} r={4} className="dot" />
            <rect className="hit" x={x(i) - Math.max(12, innerW / data.length / 2)} y={padT} width={Math.max(24, innerW / data.length)} height={innerH}
              onMouseEnter={() => setTip({ i, x: x(i), y: y(d.value) })} onClick={() => setTip(tip?.i === i ? null : { i, x: x(i), y: y(d.value) })} />
            {(i % labelEvery === 0 || i === data.length - 1) && <text x={x(i)} y={height - 6} textAnchor="middle">{d.label}</text>}
          </g>
        ))}
        <text x={x(data.length - 1) + 7} y={y(data[data.length - 1].value) + 4} className="lbl num">{data[data.length - 1].value.toFixed(1)}</text>
      </svg>
      {tip && (
        <div className="tip" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / height) * 100}%` }}>
          {data[tip.i].tip || `${data[tip.i].label}：${data[tip.i].value.toFixed(1)}${unit}`}
        </div>
      )}
    </div>
  )
}

/** 水平进度条：轨道 = max(目标, 实际)。超出目标的部分单独用警示色，中间留 2px 表面缝 */
export function Meter({ label, value, target, unit, color, soft }: { label: string; value: number; target: number; unit: string; color: string; soft: string }) {
  const total = Math.max(target, value, 1)
  const base = Math.min(value, target) / total
  const over = Math.max(0, value - target) / total
  const isOver = value > target * 1.02
  return (
    <div className="meter">
      <span className="lbl"><span className="legend-dot" style={{ background: color }} />{label}</span>
      <div className="track" style={{ ['--track' as string]: soft }} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={Math.round(target)} aria-label={label}>
        <div className="fill" style={{ width: `${base * 100}%`, ['--fill' as string]: color }} />
        {over > 0 && <div className="fill over" style={{ width: `calc(${over * 100}% - 2px)` }} />}
      </div>
      <span className="num" style={{ color: isOver ? 'var(--bad-text)' : 'var(--ink-2)', fontWeight: 500 }}>{Math.round(value)} <span className="muted">/ {Math.round(target)} {unit}</span></span>
    </div>
  )
}

/** 环形进度：圆头、进度与轨道之间留缝、超标整环变警示色 */
export function Ring({ value, target, size = 108 }: { value: number; target: number; size?: number }) {
  const stroke = 10
  const r = size / 2 - stroke / 2 - 2
  const c = 2 * Math.PI * r
  const ratio = target > 0 ? value / target : 0
  const shown = Math.min(1, ratio)
  const over = ratio > 1.02
  const gap = shown > 0 && shown < 1 ? Math.min(6, c * (1 - shown)) : 0
  const dash = Math.max(0, c * shown - gap)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`热量进度 ${Math.round(ratio * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
      <circle className="ring-progress" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={over ? 'var(--bad)' : 'var(--ring)'} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="ring-num" style={{ fill: 'var(--ink)', fontSize: 22 }}>
        {Math.round(ratio * 100)}<tspan style={{ fontSize: 12, fill: 'var(--muted)' }}>%</tspan>
      </text>
    </svg>
  )
}

function niceTicks(max: number, n: number, min = 0): number[] {
  const span = max - min
  if (span <= 0) return [min]
  const raw = span / n
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000)
  return out
}

function fmtTick(v: number): string {
  return v >= 1000 ? v.toLocaleString('en-US') : String(Math.round(v))
}

export type VarianceTone = 'good' | 'warn' | 'info' | 'none'

/**
 * 「日均 vs 目标」的一行：围绕正中目标线的偏差柱。向左不足、向右超出。
 * 图里只有三样东西：中性浅滩色的合适区间带、目标线、按结论上色的柱（达标绿 / 要改黄 / 提示灰）；
 * 偏差百分比是右栏的主数字，绝对值做小字。超出 ±60% 的柱夹在刻度边缘并加三角箭头。
 */
export function Variance({ label, value, target, unit, color, mode, tol, tone = 'none' }: {
  label: string; value: number; target: number; unit: string; color: string; mode: VarianceMode; tol?: Tol; tone?: VarianceTone
}) {
  const v = varianceOf(value, target, mode, tol)
  const t: VarianceTone = tone === 'none' ? (v.within ? 'good' : 'none') : tone
  const x = varX(v.shown)
  const neg = v.shown < 0
  const barStyle = neg ? { left: `${x}%`, width: `${50 - x}%` } : { left: '50%', width: `${x - 50}%` }
  const aria = `${label} 日均 ${Math.round(value)} ${unit}，目标 ${Math.round(target)}，${devLabel(v.dev)}${v.within ? '，在合适区间' : ''}`
  return (
    <div className="variance">
      <span className="lbl"><span className="legend-dot" style={{ background: color }} />{label}</span>
      <div className="var-track" role="img" aria-label={aria}>
        <div className="var-band" style={{ left: `${varX(v.band[0])}%`, width: `${varX(v.band[1]) - varX(v.band[0])}%` }} />
        <div className="var-zero" />
        <div className={`var-bar ${t}${v.capped ? ' capped' : ''}${neg ? ' neg' : ' pos'}`} style={barStyle} />
      </div>
      <span className="val num">
        <b className={t === 'warn' ? 'warn' : ''}>{devLabel(v.dev)}</b>
        <span className="sub">{Math.round(value)}<span className="muted">/{Math.round(target)} {unit}</span></span>
      </span>
    </div>
  )
}

/** 偏差图的刻度头：−60% · 目标 · +60%，与各行同一套栅格，「目标」正对目标线 */
export function VarianceAxis() {
  return (
    <div className="variance axis" aria-hidden>
      <span className="lbl" />
      <div className="var-track"><span className="tick l">−60%</span><span className="tick c">目标</span><span className="tick r">+60%</span></div>
      <span className="val" />
    </div>
  )
}
