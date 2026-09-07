import { useState } from 'react'
import type { WaterEntry } from '../core/types'
import { cups } from '../core/water'
import { Fold } from './bits'
import { IconClose } from './icons'

const QUICK = [100, 200, 300]

/** 今日饮水：杯格可视化 + 快捷加水 + 记录明细 */
export function WaterCard({ entries, targetMl, fluidMl, onAdd, onRemove }: {
  entries: WaterEntry[]
  targetMl: number
  /** 餐食记录里饮品的液体量，单列不计入 */
  fluidMl: number
  onAdd: (ml: number) => void
  onRemove: (id: string) => void
}) {
  const total = entries.reduce((s, e) => s + e.ml, 0)
  const [custom, setCustom] = useState('')
  const remain = targetMl - total
  const grid = cups(total, targetMl)
  return (
    <div className="card">
      <div className="section-title">
        <h2>饮水</h2>
        <span className="num small" style={{ color: remain <= 0 ? 'var(--good-text)' : 'var(--ink-2)', fontWeight: 600 }}>{total} / {targetMl} ml</span>
      </div>
      <div className="cups" role="img" aria-label={`已喝 ${total} ml，目标 ${targetMl} ml`}>
        {grid.map((c, i) => <i key={i} className={`cup ${c}`} />)}
      </div>
      <p className="tiny muted" style={{ marginTop: 6 }}>
        每格 200 ml。{remain > 0 ? `还差 ${remain} ml，约 ${Math.ceil(remain / 200)} 杯` : '今天喝够了'}
        {fluidMl > 0 ? `；另有饮品 ${fluidMl} ml 不计入` : ''}
      </p>
      <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
        {QUICK.map((ml) => <button key={ml} className="chip" onClick={() => onAdd(ml)}>+{ml}</button>)}
        <input className="input num" type="number" inputMode="numeric" placeholder="自定 ml" value={custom} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && Number(custom) > 0) { onAdd(Number(custom)); setCustom('') } }} style={{ width: 96, padding: '6px 10px' }} />
        <button className="btn sm" disabled={!(Number(custom) > 0)} onClick={() => { onAdd(Number(custom)); setCustom('') }}>加</button>
      </div>
      {entries.length > 0 && (
        <Fold summary={`今天 ${entries.length} 次记录`}>
          <div className="list">
            {entries.map((e) => (
              <div key={e.id} className="list-item" style={{ padding: '6px 0' }}>
                <span className="grow small">{e.time || ''} <b className="num">{e.ml}</b> ml</span>
                <button className="btn ghost sm" onClick={() => onRemove(e.id)} aria-label="删除这次饮水"><IconClose size={12} /></button>
              </div>
            ))}
          </div>
        </Fold>
      )}
    </div>
  )
}
