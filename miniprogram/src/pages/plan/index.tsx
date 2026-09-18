import { useMemo } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import type { MealSlot } from '@core/types'
import { todayStr } from '@core/dates'
import { useAppState } from '../../shared/useAppState'
import { derive, dishMapOf } from '../../shared/derive'

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

export default function Plan() {
  const [state] = useAppState()
  const date = todayStr()
  const d = useMemo(() => derive(state, date), [state, date])
  const dishMap = useMemo(() => dishMapOf(state), [state])

  if (!d.profile || !d.plan) {
    return (
      <View className="wrap">
        <View className="card">
          <View className="h1">先建立档案</View>
          <Text className="muted">推荐是按你的目标算的，没有档案就排不出来。</Text>
          <Button className="btn" onClick={() => Taro.switchTab({ url: '/pages/me/index' })}>
            去「我的」填写
          </Button>
        </View>
      </View>
    )
  }

  const plan = d.plan

  return (
    <View className="wrap">
      <View className="card">
        <View className="h2">今天这样吃</View>
        <Text className="muted">
          合计 {Math.round(plan.totals.kcal)} 千卡 · 蛋白质 {Math.round(plan.totals.protein)} g · 脂肪{' '}
          {Math.round(plan.totals.fat)} g · 碳水 {Math.round(plan.totals.carbs)} g
        </Text>
      </View>

      {plan.meals.map((m) => (
        <View className="card" key={m.slot}>
          <View className="h2">
            {SLOT_LABEL[m.slot]}
            <Text className="muted">　目标 {Math.round(m.targetKcal)} 千卡</Text>
          </View>
          {m.items.length === 0 ? (
            <Text className="muted">这一餐已经记录过了</Text>
          ) : (
            m.items.map((it, i) => (
              <View className="meal" key={`${it.dishId}-${i}`}>
                <View className="dish">
                  {dishMap.get(it.dishId)?.name || it.dishId}
                  {it.portion !== 1 ? ` × ${it.portion}` : ''}
                </View>
                {it.reason ? <View className="slot">{it.reason}</View> : null}
              </View>
            ))
          )}
          {m.notes.map((n, i) => (
            <View className="slot" key={i}>
              {n}
            </View>
          ))}
        </View>
      ))}

      {plan.notes.length > 0 ? (
        <View className="card">
          <View className="h2">说明</View>
          {plan.notes.map((n, i) => (
            <Text className="muted" key={i}>
              {n}
              {'\n'}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}
