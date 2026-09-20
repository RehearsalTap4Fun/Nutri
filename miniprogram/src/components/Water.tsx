/**
 * 喝水：按杯点亮。
 *
 * 杯数、每杯毫升、每杯该在几点前喝完，全部来自共用的 `@core/water`，这里只负责点和画。
 * 点第 i 杯就把总量设成 i 杯；点已经亮着的那杯则退回 i-1 杯，便于点错了改回去。
 */
import { View, Text } from '@tarojs/components'
import { CUP_ML, cupCount, cupDueHours, fmtHour } from '@core/water'

interface Props {
  totalMl: number
  targetMl: number
  /** 只有「今天」才提示到点没喝 */
  isToday: boolean
  hour: number
  onSet: (ml: number) => void
}

export function Water({ totalMl, targetMl, isToday, hour, onSet }: Props) {
  const n = cupCount(targetMl)
  const due = cupDueHours(n)
  const lit = Math.min(n, Math.floor(totalMl / CUP_ML))
  const done = lit >= n

  return (
    <View>
      <View className="row">
        <Text className="label">今天喝了</Text>
        <Text className="value">
          {totalMl} / {targetMl} ml
        </Text>
      </View>
      <View className="cups">
        {Array.from({ length: n }, (_, k) => k + 1).map((i) => {
          const isLit = i <= lit
          const thirsty = isToday && !isLit && hour >= due[i - 1]
          const cls = ['cup', isLit ? 'cup-lit' : '', thirsty ? 'cup-thirsty' : ''].filter(Boolean).join(' ')
          return (
            <View className={cls} key={i} onClick={() => onSet(isLit ? (i - 1) * CUP_ML : i * CUP_ML)}>
              <Text className="cup-hour">{fmtHour(due[i - 1])}</Text>
            </View>
          )
        })}
      </View>
      <Text className="entry-sub">
        {done
          ? `喝够了，共 ${n} 杯。`
          : `一杯 ${CUP_ML} ml，共 ${n} 杯。点一下算喝完一杯，点亮着的那杯可以退回去。${
              isToday ? '标黄的是到点还没喝的。' : ''
            }`}
      </Text>
    </View>
  )
}
