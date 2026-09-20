import { useMemo } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import type { LogEntry, MealSlot } from '@core/types'
import { MEAL_SLOTS } from '@core/types'
import { entryNutrients, entryName } from '@core/nutrition'
import { todayStr } from '@core/dates'
import { SLOT_LABEL, entryPortionText, showsSodium } from '@webui/format'
import { describeCat, growthSteps, isFullyGrown, maxGrowthSteps } from '@core/pixelcat'
import { CAT_TITLE_MAP, titlesFor } from '@core/catTitles'
import { PixelCat } from '../../components/PixelCat'
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
  const pct = Math.min(100, Math.round((eaten / target) * 100))
  const over = remain < 0

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

  const creature = state.creature
  const grown = creature ? growthSteps(creature.cat) : 0
  const maxGrown = maxGrowthSteps()
  const grownPct = Math.round((grown / maxGrown) * 100)
  const fullyGrown = creature ? isFullyGrown(creature.cat) : false
  const catTitles = creature ? titlesFor(creature.cat) : []

  return (
    <View className="wrap">
      <View className="card">
        <Text className="label">{over ? '今天超出' : '今天还可以吃'}</Text>
        <View className="big">{Math.abs(remain)}</View>
        <Text className="muted">
          目标 {target} 千卡，已记录 {eaten} 千卡
        </Text>
        <View className="bar">
          <View
            className={over ? 'bar-fill bar-over' : 'bar-fill'}
            style={{ width: `${pct}%` }}
          />
        </View>
        <View className="macros">
          <View className="macro macro-p">
            <View className="k">蛋白质</View>
            <View className="v">
              {n ? Math.round(n.protein) : 0}/{Math.round(t.protein)}g
            </View>
          </View>
          <View className="macro macro-f">
            <View className="k">脂肪</View>
            <View className="v">
              {n ? Math.round(n.fat) : 0}/{Math.round(t.fat)}g
            </View>
          </View>
          <View className="macro macro-c">
            <View className="k">碳水</View>
            <View className="v">
              {n ? Math.round(n.carbs) : 0}/{Math.round(t.carbs)}g
            </View>
          </View>
        </View>
      </View>

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
              <View className="cat-desc">{describeCat(creature.cat)}</View>
              {catTitles.length > 0 ? (
                <View className="cat-titles">
                  {catTitles.map((id) => (
                    <Text className="pill" key={id}>
                      {CAT_TITLE_MAP[id] ? CAT_TITLE_MAP[id].name : id}
                    </Text>
                  ))}
                </View>
              ) : null}
              <View className="bar">
                <View className="bar-fill" style={{ width: `${grownPct}%` }} />
              </View>
              <Text className="entry-sub">
                {fullyGrown ? '已经长齐了' : `成长 ${grown} / ${maxGrown} 阶，每记一笔推进一次`}
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
