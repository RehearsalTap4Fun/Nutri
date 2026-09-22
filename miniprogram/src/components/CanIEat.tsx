/**
 * 「能不能吃」：搜一个食物，按当前人群模式与今天已吃的量给建议。
 * 复刻网页版 `src/ui/CanIEat.tsx`，判定规则复用 `@core/verdict`，不重新发明。
 */
import { useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import type { Condition, Dish, MealSlot, Nutrients, Targets } from '@core/types'
import type { CustomFood } from '@store/storage'
import { searchFoods } from '@webui/foodSearch'
import type { FoodPick } from '@webui/foodSearch'
import { dishNutrients, scale, servingGrams } from '@core/nutrition'
import { foodVerdictForDish, foodVerdictForNutrients } from '@core/verdict'
import type { Verdict } from '@core/verdict'
import { portionText, r0 } from '@webui/format'
import { Bullets, Stats } from './bits'

const VERDICT_LABEL: Record<Verdict, string> = { avoid: '不建议', caution: '少吃点', ok: '可以吃' }
const VERDICT_CLASS: Record<Verdict, string> = { avoid: 'pill pill-bad', caution: 'pill pill-warn', ok: 'pill pill-good' }

interface Props {
  dishes: Dish[]
  dishMap: Map<string, Dish>
  customFoods: CustomFood[]
  favorites: string[]
  recentDishIds: string[]
  conditions: Condition[]
  targets: Targets
  todaySoFar: Nutrients
  nextSlot: MealSlot
  onQuickLog?: (slot: MealSlot, dishId: string, portion?: number) => void
}

export function CanIEat({
  dishes, dishMap, customFoods, favorites, recentDishIds,
  conditions, targets, todaySoFar, nextSlot, onQuickLog,
}: Props) {
  const [q, setQ] = useState('')
  const [pick, setPick] = useState<FoodPick | null>(null)
  const [portion, setPortion] = useState(1)
  const [logged, setLogged] = useState(false)

  const results = useMemo(
    () =>
      q.trim()
        ? searchFoods(q, 'all', dishes, customFoods, favorites, recentDishIds, dishMap).slice(0, 8)
        : [],
    [q, dishes, customFoods, favorites, recentDishIds, dishMap],
  )

  const choose = (p: FoodPick) => {
    setPick(p)
    setPortion(1)
    setLogged(false)
    setQ('')
  }

  const perServing = pick ? (pick.kind === 'dish' ? dishNutrients(pick.dish) : pick.food.nutrients) : null
  const weight = pick && pick.kind === 'dish' ? servingGrams(pick.dish) : 0
  const scaled = perServing ? scale(perServing, portion) : null
  const result = pick
    ? pick.kind === 'dish'
      ? foodVerdictForDish(pick.dish, { conditions }, targets, todaySoFar, portion)
      : foodVerdictForNutrients(pick.food.nutrients, { conditions }, targets, todaySoFar, portion)
    : null
  const hasConditions = conditions.length > 0
  const limited = pick !== null && pick.kind === 'custom' && hasConditions

  return (
    <View className="card">
      <View className="h2">能不能吃</View>

      {!pick ? (
        <View>
          <Text className="muted">搜一个食物，看看按你现在的模式和今天吃的量，这份能不能吃。</Text>
          <Input
            className="search"
            value={q}
            placeholder="搜菜名或自定义食物，如 小龙虾、蛋糕"
            onInput={(e) => setQ(e.detail.value)}
          />
          {results.length > 0 ? (
            <View>
              {results.map((r) => (
                <View
                  className="hit"
                  key={r.kind === 'dish' ? r.dish.id : `c_${r.food.id}`}
                  onClick={() => choose(r)}
                >
                  <View className="hit-name">{r.kind === 'dish' ? r.dish.name : r.food.name}</View>
                  <View className="hit-meta">{r.kind === 'dish' ? r.dish.serving : r.food.serving}</View>
                </View>
              ))}
            </View>
          ) : null}
          {q.trim() && results.length === 0 ? (
            <View>
              <Text className="empty">没找到「{q}」。换个名字，或者自己录一个再来问。</Text>
              {/* 以前这里写「先去记一笔里自建」，可那时记一笔并没有自建入口。现在有了，顺手带过去，搜索词也一起带上 */}
              <Text
                className="empty link-line"
                onClick={() => Taro.navigateTo({ url: `/pages/log/index?q=${encodeURIComponent(q.trim())}` })}
              >
                去录一个「{q.trim()}」→
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {pick && result && scaled ? (
        <View>
          <View className="slot-head">
            <Text className="lobe-title">{pick.kind === 'dish' ? pick.dish.name : pick.food.name}</Text>
            <Text className="chip" onClick={() => { setPick(null); setQ('') }}>
              换一个
            </Text>
          </View>

          <Text className={VERDICT_CLASS[result.verdict]}>{VERDICT_LABEL[result.verdict]}</Text>

          {weight > 0 ? (
            <View className="stepper">
              <Text className="stepper-btn" onClick={() => setPortion(Math.max(0.25, portion - 0.25))}>
                −
              </Text>
              <Text className="stepper-val">{portionText(portion, weight)}</Text>
              <Text className="stepper-btn" onClick={() => setPortion(Math.min(6, portion + 0.25))}>
                ＋
              </Text>
            </View>
          ) : null}

          {result.reasons.length > 0 ? (
            <Bullets items={result.reasons} />
          ) : (
            <Text className="muted">
              {hasConditions ? '在当前模式下没有踩雷。' : '没有设置特殊人群模式，仅按今天的热量预算参考。'}
            </Text>
          )}

          {limited ? (
            <Text className="entry-sub">
              自定义食物没有食材构成，判不了酒精、生食、腌制、嘌呤这些，仅按热量与宏量粗判。
            </Text>
          ) : null}

          <Stats
            dense
            items={[
              { label: '热量', value: r0(scaled.kcal), unit: '千卡' },
              { label: '蛋白', value: r0(scaled.protein), unit: 'g' },
              { label: '脂肪', value: r0(scaled.fat), unit: 'g' },
              { label: '碳水', value: r0(scaled.carbs), unit: 'g' },
              { label: '纤维', value: r0(scaled.fiber), unit: 'g' },
            ]}
          />

          {pick.kind === 'dish' && onQuickLog ? (
            logged ? (
              <Text className="muted">已记一笔。</Text>
            ) : (
              <Text
                className="add"
                onClick={() => {
                  onQuickLog(nextSlot, (pick as { dish: Dish }).dish.id, portion)
                  setLogged(true)
                }}
              >
                记一笔
              </Text>
            )
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
