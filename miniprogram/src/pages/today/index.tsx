import { useMemo } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import type { LogEntry, MealSlot } from '@core/types'
import { MEAL_SLOTS } from '@core/types'
import { entryNutrients, entryName } from '@core/nutrition'
import { todayStr } from '@core/dates'
import { SLOT_LABEL, entryPortionText, showsSodium, withoutSodiumNotes, defaultTimeForSlot } from '@webui/format'
import { frequentDishes } from '@core/recent'
import { logEntry } from '../../shared/log'
import { allDishesOf } from '../../shared/derive'
import { describeCat, growthSteps, isFullyGrown, maxGrowthSteps } from '@core/pixelcat'
import { CAT_TITLE_MAP, titlesFor } from '@core/catTitles'
import { PixelCat } from '../../components/PixelCat'
import { Meter } from '../../components/Meter'
import { SpeechBubble } from '../../components/SpeechBubble'
import { creatureLine } from '@core/creatureTalk'
import { CONDITION_LABEL } from '@core/conditions'
import { nowTimeStr } from '@core/dates'
import { budgetFocus, remainOf, suggestForBudget } from '@core/budget'
import { guessSlot, portionText } from '@webui/format'
import { servingGrams } from '@core/nutrition'
import { SignalChips } from '../../components/bits'
import { CanIEat } from '../../components/CanIEat'
import { useState } from 'react'
import { Water } from '../../components/Water'
import { Vitals } from '../../components/Vitals'
import { waterOnDate, fluidFromDrinks } from '@core/water'
import type { VitalEntry } from '@core/types'
import { uid } from '../../shared/state'
import { useAppState } from '../../shared/useAppState'
import { derive, dishMapOf } from '../../shared/derive'

export default function Today() {
  const [state, update] = useAppState()
  const date = todayStr()
  const d = useMemo(() => derive(state, date), [state, date])
  const dishMap = useMemo(() => dishMapOf(state), [state])
  const allDishes = useMemo(() => allDishesOf(state), [state])
  const recentDishIds = useMemo(() => frequentDishes(state.entries, todayStr()), [state.entries])

  const bySlot = useMemo(() => {
    const o = {} as Record<MealSlot, LogEntry[]>
    for (const s of MEAL_SLOTS) o[s] = []
    for (const e of state.entries) if (e.date === date) o[e.slot].push(e)
    for (const s of MEAL_SLOTS) o[s].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    return o
  }, [state.entries, date])

  if (!d.profile || !d.targets) {
    return (
      <View className="wrap">
        <View className="card">
          <View className="h1">先建立档案</View>
          <Text className="muted">填上身高、体重、年龄和目标，才能算出今天该吃多少。</Text>
          <Button className="btn" onClick={() => Taro.switchTab({ url: '/pages/me/index' })}>
            去「我的」填写
          </Button>
        </View>
      </View>
    )
  }

  const profile = d.profile
  const t = d.targets
  const n = d.stat ? d.stat.n : null
  const eaten = n ? Math.round(n.kcal) : 0
  const target = Math.round(t.kcal)
  const remain = target - eaten
  const over = remain < 0
  // 水塘大小随剩余热量变化：吃得越多塘越小。范围掐在 0.55~1.1 之间，免得缩成一点或撑出格子
  const lakeScale = Math.max(0.55, Math.min(1.1, remain > 0 ? 0.55 + (remain / target) * 0.55 : 0.55))

  const removeEntry = (id: string) => {
    Taro.showModal({
      title: '删掉这一笔？',
      success: (r) => {
        if (!r.confirm) return
        update((s) => ({
          ...s,
          entries: s.entries.filter((e) => e.id !== id),
          tombstones: [...s.tombstones, { coll: 'entries' as const, id, at: Date.now() }],
        }))
      },
    })
  }

  const go = (slot: MealSlot) =>
    Taro.navigateTo({ url: `/pages/log/index?slot=${slot}&date=${date}` })

  const conds = profile.conditions || []
  const showBp = conds.includes('hypertension')
  const showGlucose = conds.includes('diabetes')
  const drankMl = waterOnDate(state.water, date)
  const fluidMl = fluidFromDrinks(state.entries, dishMap, date)
  const hour = new Date().getHours()

  /** 把当天饮水总量设成 ml：用一条当天的记录承载，点杯子来回改都只动这一条 */
  const setWater = (ml: number) => {
    update((s) => {
      const others = s.water.filter((w) => w.date !== date)
      if (ml <= 0) {
        const dropped = s.water.filter((w) => w.date === date).map((w) => w.id)
        return {
          ...s,
          water: others,
          tombstones: [
            ...s.tombstones,
            ...dropped.map((id) => ({ coll: 'water' as const, id, at: Date.now() })),
          ],
        }
      }
      const mine = s.water.find((w) => w.date === date)
      const rec = { id: mine ? mine.id : uid(), date, ml, updatedAt: Date.now() }
      return { ...s, water: [...others, rec] }
    })
  }

  const addVital = (v: Omit<VitalEntry, 'id'>) =>
    update((s) => ({ ...s, vitals: [...s.vitals, { ...v, id: uid() }] }))

  const removeVital = (id: string) =>
    update((s) => ({
      ...s,
      vitals: s.vitals.filter((v) => v.id !== id),
      tombstones: [...s.tombstones, { coll: 'vitals' as const, id, at: Date.now() }],
    }))

  const [showBudget, setShowBudget] = useState(false)

  const zero = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 }
  const eatenN = n || zero
  // 下一餐：今天按当前时间猜，其余日期取第一个空餐次
  const nextSlot: MealSlot = (() => {
    const empty = MEAL_SLOTS.filter((sl) => sl !== 'snack' && bySlot[sl].length === 0)
    if (date === todayStr()) {
      const g = guessSlot(nowTimeStr())
      return empty.includes(g) ? g : empty[0] || 'snack'
    }
    return empty[0] || 'snack'
  })()
  const focus = budgetFocus(remainOf(t, eatenN), t).slice(0, 3)
  const budgetPicks =
    remain > 50
      ? suggestForBudget({
          remain: remainOf(t, eatenN),
          targets: t,
          slot: nextSlot,
          dishes: allDishes,
          profile,
          favorites: state.favorites,
          recentIds: recentDishIds,
        })
      : []
  const planNotes = d.plan ? d.plan.notes : []

  const quickLog = (slot: MealSlot, dishId: string, portion = 1) => {
    const r = logEntry(update, { date, slot, time: defaultTimeForSlot(slot), dishId, portion })
    const name = dishMap.get(dishId)?.name || dishId
    Taro.showToast({
      title: r.hatched ? '蛋孵出来了' : r.change || `已记 ${name}`,
      icon: 'none',
    })
  }

  const creature = state.creature
  const grown = creature ? growthSteps(creature.cat) : 0
  const maxGrown = maxGrowthSteps()
  const grownPct = Math.round((grown / maxGrown) * 100)
  const fullyGrown = creature ? isFullyGrown(creature.cat) : false
  const catTitles = creature ? titlesFor(creature.cat) : []
  // 气泡台词与网页版同一个函数，只是输入在这边拼
  const talk = creature
    ? creatureLine({
        isToday: date === todayStr(),
        now: nowTimeStr(),
        date,
        entries: state.entries.filter((e) => e.date === date),
        n: n || { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 },
        targets: t,
        waterMl: drankMl,
        showSodium: showsSodium(conds),
        focus: budgetFocus(remainOf(t, n || { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 }), t).slice(0, 3),
        justHatched: creature.mutations === 0,
        fruitG: d.stat ? d.stat.fruitG : 0,
        personality: creature.personality,
      })
    : ''

  return (
    <View className="wrap">
      <View className="land">
        <View className="land-top">
          <View className="lake-wrap">
            <View className="lake" style={{ transform: `rotate(-7deg) scale(${lakeScale})` }} />
            <View className="lake-label">
              <Text className="lake-cap">{over ? '已超出' : '还可以吃'}</Text>
              <Text className="lake-num">{Math.abs(remain)}</Text>
              <Text className="lake-cap">千卡</Text>
            </View>
          </View>
          <View className="land-facts">
            <View className="land-eaten">
              <Text className="land-eaten-num">{eaten}</Text>
              <Text className="land-eaten-of">/ {target} 千卡 已吃</Text>
            </View>
            {over ? <Text className="land-hint">晚点清淡些</Text> : null}
            <View className="hero-sub">
              <Text className="hero-fact">
                蔬菜 <Text className="hero-b">{d.stat ? (d.stat.vegG / 100).toFixed(1) : '0.0'}</Text> 份
              </Text>
              <Text className="hero-fact">
                水果 <Text className="hero-b">{d.stat ? Math.round(d.stat.fruitG) : 0}</Text> g
              </Text>
              {showsSodium(conds) ? (
                <Text className="hero-fact">
                  钠 <Text className={n && n.sodium > t.sodiumMax ? 'hero-b hero-bad' : 'hero-b'}>
                    {n ? Math.round(n.sodium) : 0}
                  </Text> / {Math.round(t.sodiumMax)} mg
                </Text>
              ) : null}
              {conds.map((c) => (
                <Text className="pill" key={c}>
                  {CONDITION_LABEL[c]}模式
                </Text>
              ))}
            </View>
          </View>
        </View>
        <View className="land-meters">
          <Meter label="蛋白" value={n ? n.protein : 0} target={t.protein} unit="g" color="#e45a3f" soft="#f9d8d0" />
          <Meter label="脂肪" value={n ? n.fat : 0} target={t.fat} unit="g" color="#3d8fd6" soft="#d3e6f7" />
          <Meter label="碳水" value={n ? n.carbs : 0} target={t.carbs} unit="g" color="#b8780a" soft="#f4e4bf" />
          <Meter label="纤维" value={n ? n.fiber : 0} target={t.fiber} unit="g" color="#6e8f3a" soft="#e3ebcf" />
        </View>
      </View>

      {remain > 50 && budgetPicks.length > 0 ? (
        <View className="card">
          <View className="slot-head">
            <Text className="h2" style={{ marginBottom: 0 }}>
              用剩下的 {remain} 千卡还能吃什么
            </Text>
            <Text className="chip" onClick={() => setShowBudget(!showBudget)}>
              {showBudget ? '收起' : `按${SLOT_LABEL[nextSlot]}挑`}
            </Text>
          </View>
          {showBudget ? (
            <View>
              {focus.length > 0 ? (
                <View className="budget-focus">
                  <Text className="entry-sub">按缺口挑</Text>
                  {focus.map((f) => (
                    <Text className={`focus-tag focus-${f.kind}`} key={f.key}>
                      {f.label}
                    </Text>
                  ))}
                </View>
              ) : null}
              {budgetPicks.map((pk) => (
                <View className="entry" key={pk.dish.id}>
                  <View>
                    <View className="entry-name">
                      {pk.dish.name}
                      <Text className="entry-sub">
                        {' '}
                        × {portionText(pk.portion, servingGrams(pk.dish))}
                      </Text>
                    </View>
                    <View className="entry-sub">{pk.why}</View>
                  </View>
                  <Text className="entry-kcal">{Math.round(pk.n.kcal)}</Text>
                  <Text
                    className="add"
                    onClick={() => {
                      quickLog(nextSlot, pk.dish.id, pk.portion)
                      setShowBudget(false)
                    }}
                  >
                    记
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {planNotes.length > 0 ? (
        <View className="card">
          <View className="h2">今天的营养师提醒</View>
          <SignalChips notes={withoutSodiumNotes(planNotes, showsSodium(conds))} />
        </View>
      ) : null}

      <CanIEat
        dishes={allDishes}
        dishMap={dishMap}
        customFoods={state.customFoods}
        favorites={state.favorites}
        recentDishIds={recentDishIds}
        conditions={conds}
        targets={t}
        todaySoFar={eatenN}
        showSodium={showsSodium(conds)}
        nextSlot={nextSlot}
        onQuickLog={quickLog}
      />

      <View className="card">
        <View className="h2">喝水</View>
        <Water
          totalMl={drankMl}
          targetMl={t.waterMl}
          isToday={date === todayStr()}
          hour={hour}
          onSet={setWater}
        />
        {fluidMl > 0 ? (
          <Text className="entry-sub">
            另外从饮品里摄入约 {Math.round(fluidMl)} ml，不计入上面的杯数。
          </Text>
        ) : null}
      </View>

      <View className="card">
        <View className="h2">健康小管家</View>
        {creature ? (
          <View className="cat-row">
            <PixelCat spec={creature.cat} size={128} />
            <View className="cat-info">
              <SpeechBubble text={talk} />
              {catTitles.length > 0 ? (
                <View className="cat-titles">
                  {catTitles.map((id) => (
                    <Text className="pill" key={id}>
                      {CAT_TITLE_MAP[id] ? CAT_TITLE_MAP[id].name : id}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Text className="entry-sub">
                {describeCat(creature.cat)} ·{' '}
                {fullyGrown ? '已经长齐了' : `成长 ${grown} / ${maxGrown} 阶`}
              </Text>
            </View>
          </View>
        ) : (
          <View className="cat-row">
            <View className="cat-egg">
              <Text className="cat-egg-mark">?</Text>
            </View>
            <View className="cat-info">
              <View className="cat-desc">还是一颗蛋</View>
              <Text className="entry-sub">记下第一笔就会孵化，之后每记一笔长一点。</Text>
            </View>
          </View>
        )}
      </View>

      {MEAL_SLOTS.filter((s) => s !== 'snack' || profile.mealsPerDay === 4 || bySlot.snack.length > 0).map(
        (slot) => {
          const list = bySlot[slot]
          const kcal = list.reduce((a, e) => a + entryNutrients(e, dishMap).kcal, 0)
          return (
            <View className={`lobe lobe-${slot}`} key={slot}>
              <View className="lobe-head">
                <Text className="lobe-title">{SLOT_LABEL[slot]}</Text>
                <Text className="add" onClick={() => go(slot)}>
                  记一笔
                </Text>
              </View>
              {list.length > 0 ? (
                <Text className="lobe-sub">共 {Math.round(kcal)} 千卡</Text>
              ) : null}
              {list.length === 0 ? (
                <Text className="lobe-sub">还没记录</Text>
              ) : (
                list.map((e) => (
                  <View className="entry" key={e.id} onClick={() => removeEntry(e.id)}>
                    <View>
                      <View className="entry-name">{entryName(e, dishMap)}</View>
                      <View className="entry-sub">
                        {entryPortionText(e, dishMap)}
                        {e.time ? ` · ${e.time}` : ''}
                      </View>
                    </View>
                    <Text className="entry-kcal">
                      {Math.round(entryNutrients(e, dishMap).kcal)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )
        },
      )}

      <View className="card">
        <View className="h2">今天的目标是怎么来的</View>
        <View className="row">
          <Text className="label">基础代谢</Text>
          <Text className="value">{Math.round(t.bmr)} 千卡</Text>
        </View>
        <View className="row">
          <Text className="label">每日总消耗</Text>
          <Text className="value">{Math.round(t.tdee)} 千卡</Text>
        </View>
        <View className="row">
          <Text className="label">计算方法</Text>
          <Text className="value">
            {t.method === 'katch' ? 'Katch-McArdle' : 'Mifflin-St Jeor'}
          </Text>
        </View>
        <View className="row">
          <Text className="label">膳食纤维</Text>
          <Text className="value">
            {n ? Math.round(n.fiber) : 0}/{Math.round(t.fiber)} g
          </Text>
        </View>
        {showsSodium(conds) ? (
          <View className="row">
            <Text className="label">钠</Text>
            <Text className="value">
              {n ? Math.round(n.sodium) : 0}/{Math.round(t.sodiumMax)} mg
            </Text>
          </View>
        ) : null}
      </View>

      {showBp ? (
        <View className="card">
          <View className="h2">血压</View>
          <Vitals kind="bp" entries={state.vitals} date={date} onAdd={addVital} onRemove={removeVital} />
        </View>
      ) : null}

      {showGlucose ? (
        <View className="card">
          <View className="h2">血糖</View>
          <Vitals
            kind="glucose"
            entries={state.vitals}
            date={date}
            onAdd={addVital}
            onRemove={removeVital}
          />
        </View>
      ) : null}
    </View>
  )
}
