/**
 * 「日均 vs 目标」的一行：围绕正中目标线的偏差柱。向左不足、向右超出。
 * 复刻网页版 charts.tsx 的 Variance。算法在 `@core/variance`，是纯函数，两端共用。
 *
 * 图里只有三样东西：中性浅滩色的合适区间带、目标线、按结论上色的柱。
 * 超出 ±60% 的柱夹在刻度边缘。
 */
import { View, Text } from '@tarojs/components'
import { devLabel, varX, varianceOf } from '@core/variance'
import type { Tol, VarianceMode } from '@core/variance'

export type VarianceTone = 'good' | 'warn' | 'info' | 'none'

interface Props {
  label: string
  value: number
  target: number
  unit: string
  color: string
  mode: VarianceMode
  tol?: Tol
  tone?: VarianceTone
}

export function Variance({ label, value, target, unit, color, mode, tol, tone = 'none' }: Props) {
  const v = varianceOf(value, target, mode, tol)
  const t: VarianceTone = tone === 'none' ? (v.within ? 'good' : 'none') : tone
  const x = varX(v.shown)
  const neg = v.shown < 0
  const barStyle = neg
    ? { left: `${x}%`, width: `${50 - x}%` }
    : { left: '50%', width: `${x - 50}%` }

  return (
    <View className="variance">
      <Text className="var-lbl">
        <Text className="legend-dot" style={{ background: color }} />
        {label}
      </Text>
      <View className="var-track">
        <View
          className="var-band"
          style={{ left: `${varX(v.band[0])}%`, width: `${varX(v.band[1]) - varX(v.band[0])}%` }}
        />
        <View className="var-zero" />
        <View className={`var-bar var-${t}${neg ? ' var-neg' : ' var-pos'}`} style={barStyle} />
      </View>
      <View className="var-val">
        <Text className={t === 'warn' ? 'var-dev var-dev-warn' : 'var-dev'}>{devLabel(v.dev)}</Text>
        <Text className="var-sub">
          {Math.round(value)}
          <Text className="var-of">/{Math.round(target)} {unit}</Text>
        </Text>
      </View>
    </View>
  )
}

/** 刻度头：−60% · 目标 · +60%，与各行同一套栅格 */
export function VarianceAxis() {
  return (
    <View className="variance variance-axis">
      <Text className="var-lbl" />
      <View className="var-track">
        <Text className="var-tick var-tick-l">−60%</Text>
        <Text className="var-tick var-tick-c">目标</Text>
        <Text className="var-tick var-tick-r">+60%</Text>
      </View>
      <View className="var-val" />
    </View>
  )
}
