/**
 * 一条营养素进度。复刻网页版 charts.tsx 的 Meter：
 * 左边彩点加标签、中间轨道、右边「已吃 / 目标」。超出的部分单独一段红色接在后面。
 */
import { View, Text } from '@tarojs/components'

interface Props {
  label: string
  value: number
  target: number
  unit: string
  /** 填充色与轨道底色，用 token 的字面值 */
  color: string
  soft: string
}

export function Meter({ label, value, target, unit, color, soft }: Props) {
  const total = Math.max(target, value, 1)
  const base = Math.min(value, target) / total
  const over = Math.max(0, value - target) / total
  const isOver = value > target * 1.02

  return (
    <View className="meter">
      <Text className="meter-lbl">
        <Text className="legend-dot" style={{ background: color }} />
        {label}
      </Text>
      <View className="track" style={{ background: soft }}>
        <View className="fill" style={{ width: `${base * 100}%`, background: color }} />
        {over > 0 ? (
          <View className="fill fill-over" style={{ width: `${over * 100}%` }} />
        ) : null}
      </View>
      <Text className={isOver ? 'meter-num meter-over' : 'meter-num'}>
        {Math.round(value)} <Text className="meter-of">/ {Math.round(target)} {unit}</Text>
      </Text>
    </View>
  )
}
