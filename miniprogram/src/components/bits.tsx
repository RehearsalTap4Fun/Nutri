/**
 * 复刻网页版 `src/ui/bits.tsx` 的那几个小件。
 * 结构和类名都对着抄，样式在 app.scss 里按同一套 token 实现。
 */
import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import type { ReactNode } from 'react'
import { noteHead } from '@webui/format'

export interface StatItem {
  label: string
  value: string | number
  /** 目标或分母，显示为「值 / 目标」 */
  of?: string | number
  unit?: string
  tone?: 'bad' | 'good'
  /** 值下面的一行小字 */
  sub?: string
}

/** 数据条：几个「值 / 目标」并排，替代一句里塞四个数字的说明文 */
export function Stats({ items, dense = false }: { items: StatItem[]; dense?: boolean }) {
  return (
    <View className={dense ? 'stats stats-dense' : 'stats'}>
      {items.map((it) => (
        <View className="stat" key={it.label}>
          <Text className="stat-label">{it.label}</Text>
          <Text className={it.tone ? `stat-value stat-${it.tone}` : 'stat-value'}>
            {it.value}
            {it.of !== undefined ? <Text className="stat-of"> / {it.of}</Text> : null}
            {it.unit ? <Text className="stat-unit"> {it.unit}</Text> : null}
          </Text>
          {it.sub ? <Text className="stat-sub">{it.sub}</Text> : null}
        </View>
      ))}
    </View>
  )
}

/** 图标要点：两三条，替代整段说明 */
export function Bullets({ items }: { items: string[] }) {
  return (
    <View className="bullets">
      {items.map((t, i) => (
        <View className="bullet" key={i}>
          <Text className="bullet-ico">!</Text>
          <Text className="bullet-text">{t}</Text>
        </View>
      ))}
    </View>
  )
}

/** 信号胶囊：提醒只露标题，点开看整句；默认最多露 max 个，其余折成 +N */
export function SignalChips({ notes, max = 3 }: { notes: string[]; max?: number }) {
  const [open, setOpen] = useState<number | null>(null)
  const [all, setAll] = useState(false)
  if (!notes.length) return null
  const shown = all ? notes : notes.slice(0, max)
  const hidden = notes.length - shown.length
  return (
    <View className="signals">
      <View className="cats">
        {shown.map((t, i) => (
          <Text
            className={open === i ? 'chip chip-on' : 'chip'}
            key={i}
            onClick={() => setOpen(open === i ? null : i)}
          >
            {noteHead(t)}
          </Text>
        ))}
        {hidden > 0 ? (
          <Text className="chip" onClick={() => setAll(true)}>
            +{hidden}
          </Text>
        ) : null}
      </View>
      {open !== null ? <Text className="signal-detail">{notes[open]}</Text> : null}
    </View>
  )
}

/** 折叠说明：默认只露一行标题，点开才看长文 */
export function Fold({ summary, children }: { summary: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <View className="fold">
      <Text className="fold-summary" onClick={() => setOpen(!open)}>
        {open ? '▾ ' : '▸ '}
        {summary}
      </Text>
      {open ? <View className="fold-body">{children}</View> : null}
    </View>
  )
}

/** 进度行：一个达成条件的可视化 */
export function ProgressRow({
  label,
  value,
  target,
  unit = '',
}: {
  label: string
  value: number
  target: number
  unit?: string
}) {
  const ok = value >= target
  return (
    <View className={ok ? 'progress-row progress-ok' : 'progress-row'}>
      <Text className="progress-ico">{ok ? '✓' : ''}</Text>
      <Text className="progress-label">{label}</Text>
      <Text className="progress-num">
        {value}
        {unit} / {target}
        {unit}
      </Text>
      <View className="progress-track">
        <View
          className="progress-fill"
          style={{ width: `${Math.min(100, (value / Math.max(1, target)) * 100)}%` }}
        />
      </View>
    </View>
  )
}
