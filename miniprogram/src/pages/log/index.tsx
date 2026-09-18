import { useMemo, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Input, Button, ScrollView } from '@tarojs/components'
import type { DishCategory, LogEntry, MealSlot } from '@core/types'
import { MEAL_SLOTS } from '@core/types'
import { dishNutrientsFor, servingGrams } from '@core/nutrition'
import { todayStr } from '@core/dates'
import { searchFoods } from '@webui/foodSearch'
import type { FoodPick } from '@webui/foodSearch'
import { CAT_LABEL, SLOT_LABEL, defaultTimeForSlot, portionText } from '@webui/format'
import { frequentBySlot } from '@core/recent'
import { uid } from '../../shared/state'
import { useAppState } from '../../shared/useAppState'
import { allDishesOf, dishMapOf } from '../../shared/derive'

const CATS: Array<DishCategory | 'all'> = ['all', 'staple', 'protein', 'veg', 'soup', 'breakfast', 'snack', 'fruit', 'combo']
const PORTIONS = [0.5, 0.75, 1, 1.5, 2]

export default function Log() {
  const router = useRouter()
  const [state, update] = useAppState()

  const date = (router.params.date as string) || todayStr()
  const slot = ((router.params.slot as MealSlot) || 'lunch') as MealSlot

  const [q, setQ] = useState('')
  const [cat, setCat] = useState<DishCategory | 'all'>('all')
  const [picked, setPicked] = useState<FoodPick | null>(null)
  const [portion, setPortion] = useState(1)

  const dishes = useMemo(() => allDishesOf(state), [state])
  const dishMap = useMemo(() => dishMapOf(state), [state])
  const recent = useMemo(() => frequentBySlot(state.entries, date)[slot], [state.entries, date, slot])

  const results = useMemo(
    () => searchFoods(q, cat, dishes, state.customFoods, state.favorites, recent, dishMap).slice(0, 40),
    [q, cat, dishes, state.customFoods, state.favorites, recent, dishMap],
  )

  const pickedName = picked ? (picked.kind === 'dish' ? picked.dish.name : picked.food.name) : ''
  const pickedGrams = picked && picked.kind === 'dish' ? servingGrams(picked.dish) : undefined
  const pickedKcal = picked
    ? picked.kind === 'dish'
      ? dishNutrientsFor(picked.dish).kcal
      : picked.food.nutrients.kcal
    : 0

  const save = () => {
    if (!picked) return
    const entry: LogEntry = {
      id: uid(),
      date,
      slot,
      time: defaultTimeForSlot(slot),
      portion,
      updatedAt: Date.now(),
      ...(picked.kind === 'dish'
        ? { dishId: picked.dish.id }
        : {
            custom: {
              name: picked.food.name,
              nutrients: picked.food.nutrients,
              vegG: picked.food.vegG,
              fruitG: picked.food.fruitG,
              dairyG: picked.food.dairyG,
            },
          }),
    }
    update((s) => ({ ...s, entries: [...s.entries, entry] }))
    Taro.showToast({ title: `已记 ${pickedName}`, icon: 'none' })
    setTimeout(() => Taro.navigateBack(), 500)
  }

  return (
    <View className="wrap">
      <View className="card">
        <View className="h2">记一笔 · {SLOT_LABEL[slot]}</View>
        <Input
          className="search"
          value={q}
          placeholder="搜菜名，比如「番茄炒蛋」"
          confirmType="search"
          onInput={(e) => setQ(e.detail.value)}
        />
        <ScrollView scrollX className="cats">
          {CATS.map((c) => (
            <Text
              key={c}
              className={c === cat ? 'chip chip-on' : 'chip'}
              onClick={() => setCat(c)}
            >
              {c === 'all' ? '全部' : CAT_LABEL[c]}
            </Text>
          ))}
        </ScrollView>
      </View>

      {picked ? (
        <View className="card">
          <View className="h2">{pickedName}</View>
          <Text className="muted">
            一份 {Math.round(pickedKcal)} 千卡
            {pickedGrams ? ` · 约 ${pickedGrams} g` : ''}
          </Text>
          <View className="cats">
            {PORTIONS.map((p) => (
              <Text
                key={p}
                className={p === portion ? 'chip chip-on' : 'chip'}
                onClick={() => setPortion(p)}
              >
                {portionText(p, pickedGrams)}
              </Text>
            ))}
          </View>
          <View className="row">
            <Text className="label">这一笔</Text>
            <Text className="value">{Math.round(pickedKcal * portion)} 千卡</Text>
          </View>
          <Button className="btn" onClick={save}>
            记下来
          </Button>
          <Button className="btn btn-plain" onClick={() => setPicked(null)}>
            换一个
          </Button>
        </View>
      ) : (
        <View className="card">
          {results.length === 0 ? (
            <Text className="muted">没找到「{q}」。换个说法试试。</Text>
          ) : (
            results.map((r) => {
              const name = r.kind === 'dish' ? r.dish.name : r.food.name
              const kcal = r.kind === 'dish' ? dishNutrientsFor(r.dish).kcal : r.food.nutrients.kcal
              const serving = r.kind === 'dish' ? r.dish.serving : r.food.serving
              const key = r.kind === 'dish' ? r.dish.id : `c_${r.food.id}`
              return (
                <View
                  className="hit"
                  key={key}
                  onClick={() => {
                    setPicked(r)
                    setPortion(1)
                  }}
                >
                  <View className="hit-name">{name}</View>
                  <View className="hit-meta">
                    {Math.round(kcal)} 千卡 · {serving}
                  </View>
                </View>
              )
            })
          )}
        </View>
      )}

      <View className="card">
        <View className="h2">换个餐次</View>
        <View className="cats">
          {MEAL_SLOTS.map((s) => (
            <Text
              key={s}
              className={s === slot ? 'chip chip-on' : 'chip'}
              onClick={() =>
                Taro.redirectTo({ url: `/pages/log/index?slot=${s}&date=${date}` })
              }
            >
              {SLOT_LABEL[s]}
            </Text>
          ))}
        </View>
      </View>
    </View>
  )
}
