import { useMemo } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import type { LogEntry, MealSlot } from '@core/types'
import { todayStr } from '@core/dates'
import { SLOT_LABEL, defaultTimeForSlot, portionText } from '@webui/format'
import { servingGrams } from '@core/nutrition'
import { uid } from '../../shared/state'
import { useAppState } from '../../shared/useAppState'
import { derive, dishMapOf } from '../../shared/derive'

export default function Plan() {
  const [state, update] = useAppState()
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

  /** 一键补记：把推荐的这道菜按推荐份量直接记下来 */
  const logIt = (slot: MealSlot, dishId: string, portion: number) => {
    const name = dishMap.get(dishId)?.name || dishId
    const entry: LogEntry = {
      id: uid(),
      date,
      slot,
      time: defaultTimeForSlot(slot),
      dishId,
      portion,
      updatedAt: Date.now(),
    }
    update((s) => ({ ...s, entries: [...s.entries, entry] }))
    Taro.showToast({ title: `已记 ${name}`, icon: 'none' })
  }

  const reshuffle = () => {
    const cur = state.planSeeds[date] || { day: 0, meals: {} }
    update((s) => ({
      ...s,
      planSeeds: { ...s.planSeeds, [date]: { ...cur, day: cur.day + 1 } },
    }))
  }

  return (
    <View className="wrap">
      <View className="card">
        <View className="h2">今天这样吃</View>
        <Text className="muted">
          合计 {Math.round(plan.totals.kcal)} 千卡 · 蛋白质 {Math.round(plan.totals.protein)} g · 脂肪{' '}
          {Math.round(plan.totals.fat)} g · 碳水 {Math.round(plan.totals.carbs)} g
        </Text>
        <Button className="btn btn-plain" onClick={reshuffle}>
          换一换
        </Button>
      </View>

      {plan.meals.map((m) => (
        <View className="card" key={m.slot}>
          <View className="h2">
            {SLOT_LABEL[m.slot]}
            <Text className="muted">　目标 {Math.round(m.targetKcal)} 千卡</Text>
          </View>

          {plan.eatenSlots.includes(m.slot) ? (
            <Text className="muted">这一餐已经记录过了</Text>
          ) : m.items.length === 0 ? (
            <Text className="muted">这一餐没排出菜</Text>
          ) : (
            m.items.map((it, i) => {
              const dish = dishMap.get(it.dishId)
              return (
                <View className="entry" key={`${it.dishId}-${i}`}>
                  <View>
                    <View className="entry-name">{dish?.name || it.dishId}</View>
                    <View className="entry-sub">
                      {portionText(it.portion, dish ? servingGrams(dish) : undefined)}
                      {it.reason ? ` · ${it.reason}` : ''}
                    </View>
                  </View>
                  <Text className="add" onClick={() => logIt(m.slot, it.dishId, it.portion)}>
                    记下
                  </Text>
                </View>
              )
            })
          )}

          {m.notes.map((n, i) => (
            <View className="entry-sub" key={i}>
              {n}
            </View>
          ))}
        </View>
      ))}

      {plan.notes.length > 0 ? (
        <View className="card">
          <View className="h2">说明</View>
          {plan.notes.map((n, i) => (
            <View className="entry-sub" key={i}>
              {n}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
