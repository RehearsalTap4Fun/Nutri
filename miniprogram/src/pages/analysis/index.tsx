import { useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button, Input, Switch } from '@tarojs/components'
import type { Finding } from '@core/analysis'
import { isHabitFinding, windowStats } from '@core/analysis'
import { macroKcalShare } from '@core/nutrition'
import { addDays, shortDate, todayStr, weekdayLabel, daysBetween } from '@core/dates'
import { bmi, bmiLabel } from '@core/energy'
import { useAppState } from '../../shared/useAppState'
import { derive } from '../../shared/derive'
import { LineChart } from '../../components/LineChart'
import type { Point } from '../../components/LineChart'
import { Variance, VarianceAxis } from '../../components/Variance'
import type { VarianceTone } from '../../components/Variance'
import { Fold } from '../../components/bits'
import { dishMapOf } from '../../shared/derive'
import { avgWater } from '@core/water'
import { lastNDays } from '@core/dates'
import { useDeclareTab } from '../../custom-tab-bar/selection'
import * as act from '@store/actions'

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
  // 告诉导航栏当前是哪个页签（导航栏自己不猜路由，见 custom-tab-bar/selection.ts）
  useDeclareTab('analysis')
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

  // 近 4 周达标日历：热量在目标 ±10% 算达标
  const cal = useMemo(() => {
    if (!d.targets) return { days: [] as Array<{ date: string; status: string }>, streak: 0, hits: 0 }
    const w28 = windowStats(state.entries, dishMapOf(state), date, 28, d.targets.kcal)
    const days = w28.days.map((x) => ({
      date: x.date,
      status: !x.logged
        ? 'none'
        : Math.abs(x.n.kcal - d.targets!.kcal) <= d.targets!.kcal * 0.1
          ? 'hit'
          : 'miss',
    }))
    let streak = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].status === 'hit') streak++
      else if (i === days.length - 1 && days[i].status === 'none') continue
      else break
    }
    return { days, streak, hits: days.filter((x) => x.status === 'hit').length }
  }, [state, date, d.targets])

  const waterAvg = useMemo(() => avgWater(state.water, lastNDays(date, 7)), [state.water, date])

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
  const conds = profile.conditions || []

  // 结论按「和数值有关」与「和习惯有关」分两组，警告排前面。
  // 钠已从共享层移除，不再需要按人群模式过滤钠相关的结论
  const findings = a.findings
  const rank = (f: Finding) => (f.severity === 'warn' ? 0 : f.severity === 'info' ? 1 : 2)
  const metricFindings = findings.filter((f) => !isHabitFinding(f)).sort((x, y) => rank(x) - rank(y))
  const habitFindings = findings.filter(isHabitFinding).sort((x, y) => rank(x) - rank(y))

  const maxKcal = Math.max(t.kcal, ...w.days.map((x) => x.n.kcal), 1)
  const share = macroKcalShare(w.avg)
  const warnCount = findings.filter((f) => f.severity === 'warn').length
  const maternal = conds.some((c) => c === 'pregnancy' || c === 'lactation')
  /** 某个指标的结论决定柱子的颜色，与网页版 sevOf 同义 */
  const toneOf = (key: string): VarianceTone => {
    const hit = findings.find((f) => f.key.startsWith(key))
    if (!hit) return 'none'
    return hit.severity === 'warn' ? 'warn' : hit.severity === 'good' ? 'good' : 'info'
  }

  const latest = recentWeights[recentWeights.length - 1]
  const b = latest ? bmi(latest.kg, profile.heightCm) : bmi(profile.weightKg, profile.heightCm)

  const addWeight = () => {
    const v = Number(kg)
    if (!(v > 20 && v < 300)) {
      Taro.showToast({ title: '体重看起来不对', icon: 'none' })
      return
    }
    update((s) => act.setWeight(s, date, v, Date.now()))
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
        <View className="slot-head">
          <Text className="h2" style={{ marginBottom: 0 }}>近 4 周达标</Text>
          <Text className="entry-sub">
            {cal.streak > 0 ? `连续 ${cal.streak} 天` : '还没连上'} · 共 {cal.hits} 天
          </Text>
        </View>
        <View className="cal">
          {cal.days.map((x) => (
            <View
              className={`cal-d cal-${x.status}${x.date === date ? ' cal-today' : ''}`}
              key={x.date}
            />
          ))}
        </View>
        <View className="cal-legend">
          <Text className="cal-legend-i">
            <Text className="cal-sw" style={{ background: '#8ed462' }} />热量在目标 ±10%
          </Text>
          <Text className="cal-legend-i">
            <Text className="cal-sw" style={{ background: '#ffd23f' }} />有记录但偏离
          </Text>
          <Text className="cal-legend-i">
            <Text className="cal-sw cal-sw-none" />没记录
          </Text>
        </View>
      </View>

      <View className="card">
        <View className="slot-head">
          <Text className="h2" style={{ marginBottom: 0 }}>日均 vs 目标</Text>
          <Text className="entry-sub">
            {logged === 0 ? '' : warnCount ? `${warnCount} 项要改` : '都在范围内'}
          </Text>
        </View>
        {logged === 0 ? (
          <Text className="empty">还没有完整记录的日子</Text>
        ) : (
          <View>
            <VarianceAxis />
            <Variance label="热量" value={w.avg.kcal} target={t.kcal} unit="kcal" color="#6cbf3e" mode="near" tol={maternal ? 0.15 : 0.2} tone={toneOf('kcal')} />
            <Variance label="蛋白" value={w.avg.protein} target={t.protein} unit="g" color="#e45a3f" mode="atLeast" tol={0.15} tone={toneOf('protein')} />
            <Variance label="脂肪" value={w.avg.fat} target={t.fat} unit="g" color="#3d8fd6" mode="atMost" tol={0.25} tone={toneOf('fat')} />
            <Variance label="碳水" value={w.avg.carbs} target={t.carbs} unit="g" color="#b8780a" mode="atMost" tol={0.1} />
            <Variance label="纤维" value={w.avg.fiber} target={t.fiber} unit="g" color="#6e8f3a" mode="atLeast" tol={0.3} tone={toneOf('fiber')} />
            <Variance label="蔬菜" value={w.avgVegServings} target={t.vegServings} unit="份" color="#2e7a1f" mode="atLeast" tol={0.4} tone={toneOf('veg')} />
            <Variance label="水果" value={w.avgFruitG} target={t.fruitG} unit="g" color="#5a5d58" mode="atLeast" tol={Math.max(0.1, 1 - 100 / Math.max(1, t.fruitG))} tone={toneOf('fruit')} />
            {waterAvg.days > 0 ? (
              <Variance label="饮水" value={waterAvg.avg} target={t.waterMl} unit="ml" color="#4fa6e3" mode="atLeast" tol={0.3} tone={toneOf('water')} />
            ) : null}

            <View className="legend">
              <Text className="legend-item"><Text className="dot" style={{ background: '#ece6d3' }} />合适区间</Text>
              <Text className="legend-item"><Text className="dot" style={{ background: '#8ed462' }} />达标</Text>
              <Text className="legend-item"><Text className="dot" style={{ background: '#ffd23f' }} />要改</Text>
            </View>

            <View className="share">
              <View className="share-p" style={{ width: `${Math.round(share.protein * 100)}%` }} />
              <View className="share-f" style={{ width: `${Math.round(share.fat * 100)}%` }} />
              <View className="share-c" style={{ width: `${Math.max(0, Math.round(share.carbs * 100))}%` }} />
            </View>
            <View className="legend">
              <Text className="legend-item"><Text className="dot dot-p" />蛋白 {r0(share.protein * 100)}%</Text>
              <Text className="legend-item"><Text className="dot dot-f" />脂肪 {r0(share.fat * 100)}%</Text>
              <Text className="legend-item"><Text className="dot dot-c" />碳水 {r0(share.carbs * 100)}%</Text>
            </View>
            <Fold summary="供能比参考范围">
              <Text>
                蛋白 15~25%、脂肪 25~35%、碳水 45~60%（中国居民膳食营养素参考摄入量 2023 版）。
              </Text>
            </Fold>
          </View>
        )}
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
                update((s) => act.patchSettings(s, { useAdaptiveTdee: e.detail.value }, Date.now()))
              }
            />
          </View>
        </View>
      ) : null}
    </View>
  )
}
