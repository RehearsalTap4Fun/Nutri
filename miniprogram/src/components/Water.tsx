/**
 * 今日饮水：一排 250 ml 的小水塘沿 8~22 点排开，点到第几个就是喝到第几杯。
 * 复刻网页版 `src/ui/Water.tsx`：每个水塘有自己的「应喝完」时刻，
 * 到点还没点亮的会口渴（微微发抖并滴一滴水），全部点亮时整排荡一下水波。
 *
 * 杯数、每杯毫升、每杯的截止时刻全部来自 `@core/water`，这里只负责点和画。
 */
import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import type { WaterEntry } from '@core/types'
import {
  CUP_ML,
  WATER_END_H,
  WATER_START_H,
  cupCount,
  cupDueHours,
  fmtHour,
  waterStatus,
} from '@core/water'

/** 小时小数，如 13.5 */
function nowHour(): number {
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60
}

interface Props {
  entries: WaterEntry[]
  targetMl: number
  /** 餐食记录里饮品的液体量，单列不计入 */
  fluidMl: number
  isToday: boolean
  /** 把这一天的饮水总量设为 ml（点亮到第几杯） */
  onSet: (ml: number) => void
}

export function WaterCard({ entries, targetMl, fluidMl, isToday, onSet }: Props) {
  const total = entries.reduce((s, e) => s + e.ml, 0)
  const n = cupCount(targetMl)
  const lit = Math.min(n, Math.floor(total / CUP_ML))
  const partial = lit < n ? (total - lit * CUP_ML) / CUP_ML : 0
  const due = cupDueHours(n)

  const [hour, setHour] = useState(nowHour)
  useEffect(() => {
    if (!isToday) return
    const t = setInterval(() => setHour(nowHour()), 60_000)
    return () => clearInterval(t)
  }, [isToday])

  // 非今天不画「现在」游标，也不让水塘口渴
  const h = isToday ? hour : WATER_END_H + 1
  const done = lit >= n
  const nowPct = Math.max(0, Math.min(100, ((h - WATER_START_H) / (WATER_END_H - WATER_START_H)) * 100))

  // 这句话跟网页版共用 @core/water 的 waterStatus，两端不会各说各的
  const status = waterStatus({ when: isToday ? 'today' : 'past', lit, n, hour })

  const tap = (i: number) => onSet(i <= lit ? (i - 1) * CUP_ML : i * CUP_ML)

  return (
    <View className="card">
      <View className="slot-head">
        <Text className="h2" style={{ marginBottom: 0 }}>
          喝水
        </Text>
        <Text className="water-total">
          {total} / {targetMl} ml
        </Text>
      </View>

      <View className={done ? 'ponds ponds-done' : 'ponds'}>
        <View className="pond-base" />
        {isToday ? <View className="pond-now" style={{ left: `${nowPct}%` }} /> : null}
        {Array.from({ length: n }, (_, k) => k + 1).map((i) => {
          const isLit = i <= lit
          const thirsty = isToday && !isLit && h >= due[i - 1]
          const fillPct = isLit ? 100 : i === lit + 1 ? Math.round(partial * 100) : 0
          const delay = `${(i - 1) * 180}ms`
          return (
            <View className={isLit ? 'pond-slot pond-slot-lit' : 'pond-slot'} key={i}>
              <View
                className={[
                  'pond',
                  isLit ? 'pond-lit' : '',
                  thirsty ? 'pond-thirsty' : '',
                  i % 2 === 0 ? 'pond-even' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={thirsty || done ? { animationDelay: delay } : undefined}
                onClick={() => tap(i)}
              >
                {fillPct > 0 && !isLit ? (
                  <View className="pond-water" style={{ height: `${fillPct}%` }} />
                ) : null}
                {isLit ? <View className="pond-glint" /> : null}
                {thirsty ? <View className="pond-drop" style={{ animationDelay: delay }} /> : null}
              </View>
              <Text className="pond-lbl">{fmtHour(due[i - 1])}</Text>
            </View>
          )
        })}
      </View>

      <Text className="entry-sub">{status}</Text>
      {fluidMl > 0 ? (
        <Text className="entry-sub">
          另外从饮品里摄入约 {Math.round(fluidMl)} ml，不计入上面的水塘。
        </Text>
      ) : null}
    </View>
  )
}
