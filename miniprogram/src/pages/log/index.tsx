import { useMemo, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Input, Button, ScrollView } from '@tarojs/components'
import type { DishCategory, MealSlot } from '@core/types'
import { MEAL_SLOTS } from '@core/types'
import { dishNutrientsFor, servingGrams } from '@core/nutrition'
import { todayStr } from '@core/dates'
import { searchFoods } from '@webui/foodSearch'
import { guessDishFromName } from '@core/dishGuess'
import { INGREDIENTS } from '@data/ingredients'
import type { FoodPick } from '@webui/foodSearch'
import { CAT_LABEL, SLOT_LABEL, defaultTimeForSlot, portionText } from '@webui/format'
import { frequentBySlot } from '@core/recent'
import { useAppState } from '../../shared/useAppState'
import { logEntry } from '../../shared/log'
import { allDishesOf, dishMapOf } from '../../shared/derive'
import { CustomFood } from '../../components/CustomFood'

/** 小程序会把 query 解码好，H5 不会；两边都可能，解不动就按原样用 */
function param(v: unknown): string {
  if (typeof v !== 'string' || !v) return ''
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

const CATS: Array<DishCategory | 'all'> = ['all', 'staple', 'protein', 'veg', 'soup', 'breakfast', 'snack', 'fruit', 'combo']
const PORTIONS = [0.5, 0.75, 1, 1.5, 2]

export default function Log() {
  const router = useRouter()
  const [state, update] = useAppState()

  const date = param(router.params.date) || todayStr()
  const slot = ((router.params.slot as MealSlot) || 'lunch') as MealSlot

  const [q, setQ] = useState(() => param(router.params.q))
  // 搜不到时的出路：按食材搭配 / 按成分表。小程序没有说一句话和扫码，这就是全部兜底
  const [custom, setCustom] = useState<'parts' | 'label' | null>(null)
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

  // 把菜名拆成食材，自建表单直接铺好，省掉从零挑。
  // 搜到了也照猜：点「都不是？自己录一个」进来的人，同样不该从空表单开始。
  const guess = useMemo(() => (q.trim() ? guessDishFromName(q, INGREDIENTS) : null), [q])

  const pickedName = picked ? (picked.kind === 'dish' ? picked.dish.name : picked.food.name) : ''
  const pickedGrams = picked && picked.kind === 'dish' ? servingGrams(picked.dish) : undefined
  const pickedKcal = picked
    ? picked.kind === 'dish'
      ? dishNutrientsFor(picked.dish).kcal
      : picked.food.nutrients.kcal
    : 0

  const save = () => {
    if (!picked) return
    const r = logEntry(update, {
      date,
      slot,
      time: defaultTimeForSlot(slot),
      portion,
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
    })
    const note = r.hatched
      ? '蛋孵出来了'
      : r.titles.length
        ? `解锁称号「${r.titles[0]}」`
        : r.change || `已记 ${pickedName}`
    Taro.showToast({ title: note, icon: 'none' })
    setTimeout(() => Taro.navigateBack(), 700)
  }

  const pickDish = (d: import('@core/types').Dish) => {
    update((st) => ({ ...st, customDishes: [...st.customDishes.filter((x) => x.id !== d.id), d] }))
    setCustom(null)
    setPicked({ kind: 'dish', dish: d })
    setPortion(1)
    Taro.showToast({ title: `已存下「${d.name}」`, icon: 'none' })
  }
  const pickFood = (f: import('../../shared/state').CustomFood) => {
    update((st) => ({ ...st, customFoods: [f, ...st.customFoods.filter((x) => x.id !== f.id)].slice(0, 200) }))
    setCustom(null)
    setPicked({ kind: 'custom', food: f })
    setPortion(1)
    Taro.showToast({ title: `已存下「${f.name}」`, icon: 'none' })
  }

  return (
    <View className="wrap">
      {custom ? null : (
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
      )}

      {custom ? (
        <CustomFood
          initialName={q}
          guess={guess}
          initialMode={custom}
          onCancel={() => setCustom(null)}
          onDish={pickDish}
          onFood={pickFood}
        />
      ) : picked ? (
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
            <View>
              <Text className="muted">没找到「{q || '这个'}」。</Text>
              {guess && guess.matched.length > 0 ? (
                <View>
                  <Text className="muted">认出这些食材：{guess.matched.join('、')}</Text>
                  <Button className="btn" onClick={() => setCustom('parts')}>
                    用这些食材搭一道 →
                  </Button>
                </View>
              ) : (
                <Button className="btn" onClick={() => setCustom('parts')}>
                  按食材自己搭一道 →
                </Button>
              )}
              <Button className="btn btn-plain" onClick={() => setCustom('label')}>
                照着包装成分表录
              </Button>
            </View>
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
          {results.length > 0 ? (
            <Text className="muted link-line" onClick={() => setCustom('parts')}>
              都不是？自己录一个 →
            </Text>
          ) : null}
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
