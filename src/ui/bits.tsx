import { useState } from 'react'
import type { ReactNode } from 'react'
import { IconCheck, IconChevron } from './icons'

/** 折叠说明：默认只露一行标题，点开才看长文。长段解释一律放这里，正文只留一句。 */
export function Fold({ summary, children, open = false }: { summary: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="fold" open={open}>
      <summary><IconChevron /><span>{summary}</span></summary>
      <div className="fold-body">{children}</div>
    </details>
  )
}

export interface StatItem {
  label: string
  value: string | number
  /** 目标或分母，显示为「值 / 目标」 */
  of?: string | number
  unit?: string
  tone?: 'bad' | 'good'
}

/** 数据条：几个「值 / 目标」并排，替代一句里塞四个数字的说明文 */
export function Stats({ items, dense = false }: { items: StatItem[]; dense?: boolean }) {
  return (
    <div className={`stats${dense ? ' dense' : ''}`}>
      {items.map((it) => (
        <div key={it.label} className="stat">
          <span className="stat-label">{it.label}</span>
          <span className={`stat-value num${it.tone ? ' ' + it.tone : ''}`}>
            {it.value}
            {it.of !== undefined && <span className="stat-of"> / {it.of}</span>}
            {it.unit && <span className="stat-unit"> {it.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  )
}

/** 提醒句的标题：取第一个逗号前，去掉没闭合的括号和尾标点 */
export function noteHead(t: string): string {
  let h = t.split(/[，。：；,]/)[0]
  const o = h.search(/[（(]/)
  if (o >= 0 && !/[）)]/.test(h)) h = h.slice(0, o)
  h = h.replace(/[，。：；、\s]+$/, '').trim()
  return h || t.slice(0, 12)
}

/** 信号胶囊：营养师提醒只露标题，点开看整句；默认最多露 max 个，其余折成 +N */
export function SignalChips({ notes, max = 3 }: { notes: string[]; max?: number }) {
  const [open, setOpen] = useState<number | null>(null)
  const [all, setAll] = useState(false)
  if (!notes.length) return null
  const shown = all ? notes : notes.slice(0, max)
  const hidden = notes.length - shown.length
  return (
    <div className="signals">
      <div className="chips wrap">
        {shown.map((t, i) => (
          <button key={i} className={`chip signal${open === i ? ' on' : ''}`} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>{noteHead(t)}</button>
        ))}
        {hidden > 0 && <button className="chip more" onClick={() => setAll(true)} aria-label={`展开另外 ${hidden} 条提醒`}>+{hidden}</button>}
      </div>
      {open !== null && <p className="signal-detail">{notes[open]}</p>}
    </div>
  )
}

export type Swatch = 'land' | 'land2' | 'shoal' | 'sun' | 'ink' | 'hollow' | 'dim' | 'target' | 'line'

/** 图例：小色样 + 一个词，替代解释图形含义的整句 */
export function Legend({ items }: { items: Array<{ swatch: Swatch; label: string }> }) {
  return <div className="legend">{items.map((it) => <span key={it.label}><i className={`sw sw-${it.swatch}`} />{it.label}</span>)}</div>
}

/** 图标要点：两三条，替代整段说明 */
export function Bullets({ items }: { items: Array<{ icon: ReactNode; text: ReactNode }> }) {
  return (
    <ul className="bullets">
      {items.map((it, i) => <li key={i}><span className="bullet-ico">{it.icon}</span><span>{it.text}</span></li>)}
    </ul>
  )
}

/** 供能比：一条三色分段条 */
export function ShareBar({ protein, fat, carbs }: { protein: number; fat: number; carbs: number }) {
  const p = Math.round(protein * 100)
  const f = Math.round(fat * 100)
  const c = Math.max(0, Math.round(carbs * 100))
  return (
    <div className="sharebar" role="img" aria-label={`供能比 蛋白 ${p}% 脂肪 ${f}% 碳水 ${c}%`}>
      <div className="sharebar-track">
        <span style={{ width: `${p}%`, background: 'var(--protein)' }} />
        <span style={{ width: `${f}%`, background: 'var(--fat)' }} />
        <span style={{ width: `${c}%`, background: 'var(--carbs)' }} />
      </div>
      <div className="sharebar-labels tiny">
        <span><i className="legend-dot" style={{ background: 'var(--protein)' }} />蛋白 {p}%</span>
        <span><i className="legend-dot" style={{ background: 'var(--fat)' }} />脂肪 {f}%</span>
        <span><i className="legend-dot" style={{ background: 'var(--carbs)' }} />碳水 {c}%</span>
      </div>
    </div>
  )
}

/** 进度行：一个达成条件的可视化，如「完整记录日 7 / 10 天」 */
export function ProgressRow({ label, value, target, unit = '' }: { label: string; value: number; target: number; unit?: string }) {
  const ok = value >= target
  return (
    <div className={`progress-row${ok ? ' ok' : ''}`}>
      <span className="progress-ico" aria-hidden>{ok ? <IconCheck size={12} /> : null}</span>
      <span className="grow">{label}</span>
      <span className="num small">{value}{unit} / {target}{unit}</span>
      <span className="progress-track"><span style={{ width: `${Math.min(100, (value / Math.max(1, target)) * 100)}%` }} /></span>
    </div>
  )
}
