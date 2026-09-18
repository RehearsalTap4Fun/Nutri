import { useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button, Input, Switch } from '@tarojs/components'
import type { Finding } from '@core/analysis'
import { isHabitFinding } from '@core/analysis'
import { macroKcalShare } from '@core/nutrition'
import { addDays, shortDate, todayStr, weekdayLabel, daysBetween } from '@core/dates'
import { bmi, bmiLabel } from '@core/energy'
import { showsSodium } from '@webui/format'
import { useAppState } from '../../shared/useAppState'
import { derive } from '../../shared/derive'
import { LineChart } from '../../components/LineChart'
import type { Point } from '../../components/LineChart'

const r0 = (v: number) => Math.round(v)

function FindingCard({ f }: { f: Finding }) {
  const tone = f.severity === 'warn' ? 'bad' : f.severity === 'good' ? 'good' : 'info'
  return (
    <View className={`finding finding-${tone}`}>
      <View className="finding-title">{f.title}</View>
      <View className="finding-detail">{f.detail}</View>
      <View className="finding-action">{f.action}</View>
    </View>
  )
}

export default function Analysis() {
  const [state, update] = useAppState()
  const date = todayStr()
  const d = useMemo(() => derive(state, date), [state, date])
  const [kg, setKg] = useState('')

  // 注意：以下 hook 必须在任何提前返回之前调用，
  // 否则档案从无到有时 hook 数量会变，React 会抛「Rendered more hooks than during the previous render」
  // 体重趋势：近 60 天
  const recentWeights = useMemo(
    () => state.weights.filter((x) => x.date >= addDays(date, -60)).sort((x, y) => (x.date < y.date ? -1 : 1)),
    [state.weights, date],
  )
  const points: Point[] = useMemo(() => {
    if (recentWeights.length === 0) return []
    const first = recentWeights[0].date
    return recentWeights.map((x) => ({
      x: daysBetween(first, x.date),
      y: x.kg,
      label: shortDate(x.date),
    }))
  }, [recentWeights])

  if (!d.profile || !d.targets || !d.analysis) {
    return (
      <View className="wrap">
        <View className="card">
          <View className="h1">先建立档案</View>
          <Text className="muted">分析是拿你的记录和目标比出来的，没有档案就无从比起。</Text>
          <Button className="btn" onClick={() => Taro.switchTab({ url: '/pages/me/index' })}>
            去「我的」填写
          </Button>
        </View>
      </View>
    )
  }

  const profile = d.profile
  const t = d.targets
  const a = d.analysis
  const w = a.window
  const logged = w.loggedDays.length
  const showNa = showsSodium(profile.conditions)

  // 结论按「和数值有关」与「和习惯有关」分两组，警告排前面
  const findings = a.findings.filter((f) => showNa || !f.key.startsWith('sodium_'))
  const rank = (f: Finding) => (f.severity === 'warn' ? 0 : f.severity === 'info' ? 1 : 2)
  const metricFindings = findings.filter((f) => !isHabitFinding(f)).sort((x, y) => rank(x) - rank(y))
  const habitFindings = findings.filter(isHabitFinding).sort((x, y) => rank(x) - rank(y))

  const maxKcal = Math.max(t.kcal, ...w.days.map((x) => x.n.kcal), 1)
  const share = macroKcalShare(w.avg)

  const latest = recentWeights[recentWeights.length - 1]
  const b = latest ? bmi(latest.kg, profile.heightCm) : bmi(profile.weightKg, profile.heightCm)

  const addWeight = () => {
    const v = Number(kg)
    if (!(v > 20 && v < 300)) {
      Taro.showToast({ title: '体重看起来不对', icon: 'none' })
      return
    }
    update((s) => ({
      ...s,
      weights: [...s.weights.filter((x) => x.date !== date), { date, kg: v, updatedAt: Date.now() }],
      profile: s.profile ? { ...s.profile, weightKg: v } : s.profile,
      meta: { ...s.meta, profileAt: Date.now() },
    }))
    setKg('')
    Taro.showToast({ title: '记下了', icon: 'none' })
  }

  return (
    <View className="wrap">
      {logged < 2 ? (
        <View className="card">
          <View className="h2">记录还太少</View>
          <Text className="muted">
            近 7 天只有 {logged} 天有完整记录。先坚持记 3 天，分析和推荐调整就会启用。
          </Text>
        </View>
      ) : null}

      <View className="card">
        <View className="h2">近 7 天热量</View>
        <View className="bars">
          {w.days.map((day) => {
            const h = Math.max(2, Math.round((day.n.kcal / maxKcal) * 100))
            const isToday = day.date === date
            return (
              <View className="bar-col" key={day.date}>
                <View className="bar-stack">
                  <View
                    className={`bar-bin${day.logged ? '' : ' bar-dim'}${isToday ? ' bar-today' : ''}`}
                    style={{ height: `${h}%` }}
                  />
                </View>
                <Text className="bar-label">{isToday ? '今' : weekdayLabel(day.date)}</Text>
              </View>
            )
          })}
        </View>
        <View className="row">
          <Text className="label">日均</Text>
          <Text className="value">
            {r0(w.avg.kcal)} / {r0(t.kcal)} 千卡
          </Text>
        </View>
        <Text className="muted">浅色的是记录不全的日子，不计入日均。</Text>
      </View>

      <View className="card">
        <View className="h2">三大营养素供能比</View>
        <View className="share">
          <View className="share-seg share-p" style={{ flex: String(Math.max(share.protein, 0.01)) }} />
          <View className="share-seg share-f" style={{ flex: String(Math.max(share.fat, 0.01)) }} />
          <View className="share-seg share-c" style={{ flex: String(Math.max(share.carbs, 0.01)) }} />
        </View>
        <View className="legend">
          <Text className="legend-item">
            <Text className="dot dot-p" />蛋白 {r0(share.protein * 100)}%
          </Text>
          <Text className="legend-item">
            <Text className="dot dot-f" />脂肪 {r0(share.fat * 100)}%
          </Text>
          <Text className="legend-item">
            <Text className="dot dot-c" />碳水 {r0(share.carbs * 100)}%
          </Text>
        </View>
        <View className="row">
          <Text className="label">日均蛋白质</Text>
          <Text className="value">
            {r0(w.avg.protein)} / {r0(t.protein)} g
          </Text>
        </View>
        <View className="row">
          <Text className="label">日均膳食纤维</Text>
          <Text className="value">
            {r0(w.avg.fiber)} / {r0(t.fiber)} g
          </Text>
        </View>
        <View className="row">
          <Text className="label">日均蔬菜</Text>
          <Text className="value">
            {w.avgVegServings.toFixed(1)} / {t.vegServings} 份
          </Text>
        </View>
        {showNa ? (
          <View className="row">
            <Text className="label">日均钠</Text>
            <Text className="value">
              {r0(w.avg.sodium)} / {r0(t.sodiumMax)} mg
            </Text>
          </View>
        ) : null}
      </View>

      {metricFindings.length > 0 ? (
        <View className="card">
          <View className="h2">结论</View>
          {metricFindings.map((f) => (
            <FindingCard f={f} key={f.key} />
          ))}
        </View>
      ) : null}

      {habitFindings.length > 0 ? (
        <View className="card">
          <View className="h2">饮食习惯</View>
          {habitFindings.map((f) => (
            <FindingCard f={f} key={f.key} />
          ))}
        </View>
      ) : null}

      <View className="card">
        <View className="h2">体重</View>
        <LineChart id="weightChart" points={points} guide={undefined} unit="kg" />
        <View className="row">
          <Text className="label">最近一次</Text>
          <Text className="value">
            {latest ? `${latest.kg} kg · ${shortDate(latest.date)}` : '还没记过'}
          </Text>
        </View>
        <View className="row">
          <Text className="label">BMI</Text>
          <Text className="value">
            {b.toFixed(1)}（{bmiLabel(b)}）
          </Text>
        </View>
        <View className="field">
          <Text className="k">记今天的体重</Text>
          <Input
            className="ctl"
            type="digit"
            value={kg}
            placeholder="公斤"
            onInput={(e) => setKg(e.detail.value)}
          />
        </View>
        <Button className="btn" onClick={addWeight}>
          记下来
        </Button>
      </View>

      {a.adaptive ? (
        <View className="card">
          <View className="h2">按实际吃法校准</View>
          <Text className="muted">{a.adaptive.note}</Text>
          <View className="row">
            <Text className="label">公式估算</Text>
            <Text className="value">{r0(d.baseTargets ? d.baseTargets.tdee : t.tdee)} 千卡</Text>
          </View>
          <View className="row">
            <Text className="label">按体重反推</Text>
            <Text className="value">{a.adaptive.tdee} 千卡</Text>
          </View>
          <View className="row">
            <Text className="label">依据</Text>
            <Text className="value">
              {a.adaptive.loggedDays} 天记录 · 跨度 {a.adaptive.spanDays} 天
            </Text>
          </View>
          <View className="field">
            <Text className="k">用校准值算目标</Text>
            <Switch
              checked={state.settings.useAdaptiveTdee}
              color="#8ed462"
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  settings: { ...s.settings, useAdaptiveTdee: e.detail.value },
                  meta: { ...s.meta, settingsAt: Date.now() },
                }))
              }
            />
          </View>
        </View>
      ) : null}
    </View>
  )
}
