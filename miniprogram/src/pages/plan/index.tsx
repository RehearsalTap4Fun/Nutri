import { useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import type { Dish, MealSlot } from '@core/types'
import { MEAL_SLOTS } from '@core/types'
import type { MealPlan, PlanItem } from '@core/planner'
import { shoppingList } from '@core/planner'
import { todayStr } from '@core/dates'
import { dishNutrientsFor, entryName, scale, servingGrams } from '@core/nutrition'
import {
  COOK_LABEL,
  SLOT_LABEL,
  defaultTimeForSlot,
  entryPortionText,
  portionText,
  r0,
} from '@webui/format'
import { useAppState } from '../../shared/useAppState'
import { logEntry } from '../../shared/log'
import { derive, dishMapOf } from '../../shared/derive'
import { useRememberPlan } from '../../shared/rememberPlan'
import { mealWhy } from '@core/mealWhy'
import { Fold } from '../../components/bits'
import { Icon } from '../../components/Icon'

// 推荐理由整句太长且每道菜重复，收成一个小标签。规则与网页版一致
const REASON_TAGS: Array<[RegExp, string]> = [
  [/蛋白/, '高蛋白'],
  [/粗粮/, '粗粮'],
  [/主食|碳水/, '低碳'],
  [/清淡|盐|钠/, '清淡'],
  [/油/, '少油'],
  [/蔬菜|菜/, '加菜'],
  [/水果/, '加水果'],
  [/外卖/, '外卖优选'],
]
function reasonTag(r: string): string {
  for (const [re, t] of REASON_TAGS) if (re.test(r)) return t
  return r.length > 6 ? r.slice(0, 6) : r
}

export default function Plan() {
  const [state, update] = useAppState()
  const date = todayStr()
  const d = useMemo(() => derive(state, date), [state, date])
  const dishMap = useMemo(() => dishMapOf(state), [state])
  const [showList, setShowList] = useState(false)
  const [loggedSlots, setLoggedSlots] = useState<MealSlot[]>([])
  // hook 必须在提前返回之前
  useRememberPlan(d.plan, date, state.planPicks, update)

  if (!d.profile || !d.plan || !d.targets) {
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
  const list = shoppingList(plan, dishMap)
  const allEaten = plan.meals.length === 0
  const dayEntries = state.entries.filter((e) => e.date === date)

  /**
   * 换一换：整天或单餐。种子记在 planSeeds 里，刷新后推荐不变。
   * 同时清掉当天的沿用缓存，否则新种子算出来的推荐又会被旧选择顶回去。
   */
  const reroll = (slot?: MealSlot) => {
    update((s) => {
      const cur = s.planSeeds[date] || { day: 0, meals: {} }
      const next = slot
        ? { ...cur, meals: { ...cur.meals, [slot]: (cur.meals[slot] || 0) + 1 } }
        : { day: cur.day + 1, meals: {} }
      const picks = { ...s.planPicks }
      delete picks[date]
      return { ...s, planSeeds: { ...s.planSeeds, [date]: next }, planPicks: picks }
    })
  }

  /** 照这个吃：把一餐里的每道菜都记为已吃 */
  const logMeal = (m: MealPlan) => {
    for (const it of m.items) {
      logEntry(update, {
        date,
        slot: m.slot,
        time: defaultTimeForSlot(m.slot),
        dishId: it.dishId,
        portion: it.portion,
        lowOil: it.lowOil,
      })
    }
    setLoggedSlots([...loggedSlots, m.slot])
    Taro.showToast({ title: `${SLOT_LABEL[m.slot]}已记下`, icon: 'none' })
  }

  /** 不想吃：进不推荐名单，列表随即补上下一个候选 */
  const dislike = (dishId: string) => {
    const name = dishMap.get(dishId)?.name || dishId
    update((s) => ({
      ...s,
      profile: s.profile
        ? { ...s.profile, dislikedDishes: [...s.profile.dislikedDishes, dishId] }
        : s.profile,
      meta: { ...s.meta, profileAt: Date.now() },
    }))
    Taro.showToast({ title: `以后不再推荐${name}`, icon: 'none' })
  }

  return (
    <View className="wrap">
      <View className="card">
        <View className="slot-head">
          <Text className="h2" style={{ marginBottom: 0 }}>今天吃什么</Text>
          <Text className="add add-ghost" onClick={() => reroll()}>
            全天换一换
          </Text>
        </View>
        <Text className="muted">
          合计 {r0(plan.totals.kcal)} 千卡 · 蛋白 {r0(plan.totals.protein)} g · 脂肪{' '}
          {r0(plan.totals.fat)} g · 碳水 {r0(plan.totals.carbs)} g
        </Text>
      </View>

      {MEAL_SLOTS.map((slot) => {
        // 已吃的餐次不再排推荐，改为列出实际吃了什么
        if (plan.eatenSlots.includes(slot)) {
          const eaten = dayEntries.filter((e) => e.slot === slot)
          return (
            <View className="lobe lobe-plain" key={slot}>
              <View className="lobe-head">
                <Text className="lobe-title">
                  {SLOT_LABEL[slot]} <Text className="pill pill-good">已吃</Text>
                </Text>
              </View>
              <Text className="lobe-sub">
                {eaten
                  .map((e) => `${entryName(e, dishMap)} × ${entryPortionText(e, dishMap)}`)
                  .join('、')}
              </Text>
            </View>
          )
        }

        const m = plan.meals.find((x) => x.slot === slot)
        if (!m) return null
        const logged = loggedSlots.includes(slot)

        return (
          <View className={`lobe lobe-${slot}`} key={slot}>
            <View className="lobe-head">
              <Text className="lobe-title">
                {SLOT_LABEL[slot]}
                <Text className="lobe-sub"> 目标约 {r0(m.targetKcal)} 千卡</Text>
              </Text>
              <Text className="add" onClick={() => reroll(slot)}>
                换一换
              </Text>
            </View>

            {m.items.length === 0 ? (
              <Text className="lobe-sub">没有符合条件的菜，试试放宽过敏或不吃设置</Text>
            ) : (
              m.items.map((it) => {
                const dish: Dish | undefined = dishMap.get(it.dishId)
                if (!dish) return null
                const nn = scale(dishNutrientsFor(dish, it), it.portion)
                return (
                  <View className="entry" key={it.dishId}>
                    <View className="entry-main">
                      <View className="entry-name">
                        {dish.name}
                        <Text className="entry-portion">
                          {' '}
                          × {portionText(it.portion, servingGrams(dish))}
                        </Text>
                        {it.reason ? <Text className="pill">{reasonTag(it.reason)}</Text> : null}
                        {it.lowOil ? <Text className="pill">少油</Text> : null}
                      </View>
                      <View className="entry-sub">
                        {dish.serving} · {COOK_LABEL[dish.cook]} · 蛋白 {r0(nn.protein)} g
                      </View>
                    </View>
                    <Text className="entry-kcal">{r0(nn.kcal)}</Text>
                    <View className="entry-x" onClick={() => dislike(dish.id)}>
                      <Icon name="close" tone="muted" size={28} />
                    </View>
                  </View>
                )
              })
            )}

            <View className="slot-head" style={{ marginTop: '16px' }}>
              <Text className="lobe-sub">
                合计 {r0(m.totals.kcal)} 千卡 · 蛋白 {r0(m.totals.protein)} g
              </Text>
              {m.items.length > 0 ? (
                <Text className="add" onClick={() => (logged ? undefined : logMeal(m))}>
                  {logged ? '已记录' : '照这个吃'}
                </Text>
              ) : null}
            </View>

            {m.notes.map((tx, i) => (
              <Text className="lobe-sub" key={i}>
                {tx}
              </Text>
            ))}

            <Fold summary="这一餐为什么这么排">
              {mealWhy({
                meal: m,
                targets: d.targets!,
                adjustments: d.analysis!.adjustments,
                profile: d.profile!,
                redistributed: plan.eatenSlots.length > 0,
              }).map((why, i) => (
                <Text className="why-line" key={i}>
                  {why}
                </Text>
              ))}
            </Fold>
          </View>
        )
      })}

      {allEaten ? (
        <View className="card">
          <Text className="empty">今天的餐都记录了，明天再来看推荐</Text>
        </View>
      ) : (
        <View className="card">
          <View className="slot-head">
            <Text className="h2" style={{ marginBottom: 0 }}>采购清单</Text>
            <Text className="add add-ghost" onClick={() => setShowList(!showList)}>
              {showList ? '收起' : '展开'}
            </Text>
          </View>
          {showList ? (
            <View className="cats">
              {list.map((x) => (
                <Text className="pill" key={x.ing}>
                  {x.name} {x.g} g
                </Text>
              ))}
            </View>
          ) : (
            <Text className="muted">
              {list.slice(0, 8).map((x) => x.name).join('、')}
              {list.length > 8 ? ' 等' : ''}
            </Text>
          )}
        </View>
      )}

      {plan.notes.length > 0 ? (
        <View className="card">
          <Fold summary={`今天这样排的原因（${plan.notes.length} 条）`}>
            {plan.notes.map((nt, i) => (
              <Text className="entry-sub" key={i} style={{ display: 'block' }}>
                {nt}
              </Text>
            ))}
          </Fold>
        </View>
      ) : null}
    </View>
  )
}
