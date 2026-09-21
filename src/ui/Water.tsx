import { useEffect, useState } from 'react'
import type { WaterEntry } from '../core/types'
import { CUP_ML, WATER_END_H, WATER_START_H, cupCount, cupDueHours, fmtHour, waterStatus } from '../core/water'
import type { DayWhen } from '../core/water'
import { Fold } from './bits'

/** 小时小数，如 13.5 */
function nowHour(): number {
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60
}

/**
 * 今日饮水：一排 250 ml 的小水塘沿 8~22 点排开，点到第几个就是喝到第几杯。
 * 每个水塘有自己的「应喝完」时刻；到点还没点亮的那几个会口渴（微微发抖）。全部点亮时整排荡一下水波。
 */
export function WaterCard({ entries, targetMl, fluidMl, when, onSet }: {
  entries: WaterEntry[]
  targetMl: number
  /** 餐食记录里饮品的液体量，单列不计入 */
  fluidMl: number
  /** 这一天在今天之前、就是今天、还是在今天之后：刻度提醒只对「今天」说得通 */
  when: DayWhen
  /** 把这一天的饮水总量设为 ml（点亮到第几杯） */
  onSet: (ml: number) => void
}) {
  const isToday = when === 'today'
  const total = entries.reduce((s, e) => s + e.ml, 0)
  const n = cupCount(targetMl)
  const lit = Math.min(n, Math.floor(total / CUP_ML))
  const partial = lit < n ? (total - lit * CUP_ML) / CUP_ML : 0
  const due = cupDueHours(n)
  const [hour, setHour] = useState(nowHour)
  useEffect(() => {
    if (!isToday) return
    const t = window.setInterval(() => setHour(nowHour()), 60_000)
    return () => window.clearInterval(t)
  }, [isToday])
  // 非今天不画「现在」游标，也不让水塘口渴
  const h = isToday ? hour : WATER_END_H + 1
  const done = lit >= n
  const nowPct = Math.max(0, Math.min(100, ((h - WATER_START_H) / (WATER_END_H - WATER_START_H)) * 100))
  const tap = (i: number) => onSet(i <= lit ? (i - 1) * CUP_ML : i * CUP_ML)
  const status = waterStatus({ when, lit, n, hour })
  return (
    <div className="card">
      <div className="section-title">
        <h2>饮水</h2>
        <span className="num small" style={{ color: done ? 'var(--good-text)' : 'var(--ink-2)', fontWeight: 600 }}>{lit} / {n} 杯</span>
      </div>
      <div className={`ponds${done ? ' done' : ''}`} role="group" aria-label={`饮水 ${total} ml，目标 ${targetMl} ml，每杯 ${CUP_ML} ml`}>
        {due.map((d, idx) => {
          const i = idx + 1
          const isLit = i <= lit
          const fill = isLit ? 1 : i === lit + 1 ? partial : 0
          const thirsty = isToday && !isLit && h >= d
          return (
            <div key={i} className={`pond-slot${isLit ? ' lit' : ''}`} style={{ ['--i' as string]: idx }}>
              <button type="button" className={`pond${isLit ? ' lit' : ''}${thirsty ? ' thirsty' : ''}`}
                aria-pressed={isLit} aria-label={`第 ${i} 杯，${fmtHour(d)} 前${isLit ? '，已喝' : thirsty ? '，到点还没喝' : ''}`} onClick={() => tap(i)}>
                <span className="pond-water" style={{ transform: `scaleY(${fill})` }} aria-hidden />
                {fill > 0.35 && <span className="pond-glint" aria-hidden />}
                {thirsty && <span className="pond-drop" aria-hidden />}
              </button>
              <span className="pond-lbl">{fmtHour(d)}</span>
            </div>
          )
        })}
        <span className="pond-base" aria-hidden />
        {isToday && <span className="pond-now" style={{ left: `${nowPct}%` }} aria-hidden />}
      </div>
      <p className="tiny muted" style={{ marginTop: 8 }}>
        {status}
        {fluidMl > 0 ? `；另有饮品 ${fluidMl} ml 不计入` : ''}
      </p>
      <Fold summary={`为什么是 ${n} 杯（${targetMl} ml）`}>
        <p>每杯按 250 ml 计，点到第几杯就是喝到第几杯，点已亮的杯子可以退回。刻度按 8 点到 22 点均分，到点没喝的杯子会提醒你。</p>
        <p>《中国居民膳食指南（2022）》与《中国居民膳食营养素参考摄入量（2023 版）》：成年男性每日饮水 1700 ml、女性 1500 ml，不含食物中的水分；孕中晚期 1700、哺乳期 2100 ml；痛风指南建议不低于 2000 ml；本应用在训练日额外加 500 ml。含热量饮品单独统计，不顶白水。</p>
      </Fold>
    </div>
  )
}
