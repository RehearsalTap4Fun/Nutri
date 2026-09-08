import { useMemo, useState } from 'react'
import type { Dish, LogEntry, MealSlot, Targets } from '../core/types'
import { MEAL_SLOTS } from '../core/types'
import type { DayPlan, MealPlan } from '../core/planner'
import { shoppingList } from '../core/planner'
import { addDays, shortDate, todayStr, weekdayLabel } from '../core/dates'
import { dishNutrientsFor, entryName, entryNutrients, scale, servingGrams, sum } from '../core/nutrition'
import { COOK_LABEL, SLOT_LABEL, entryPortionText, portionText, r0, withoutSodiumNotes } from './format'
import { IconClose } from './icons'
import { Fold, SignalChips, Stats } from './bits'

// 推荐理由整句太长且每道菜重复，收成一个小标签；整句留在 title 里
const REASON_TAGS: Array<[RegExp, string]> = [[/蛋白/, '高蛋白'], [/粗粮/, '粗粮'], [/主食|碳水/, '低碳'], [/清淡|盐|钠/, '清淡'], [/油/, '少油'], [/蔬菜|菜/, '加菜'], [/水果/, '加水果'], [/外卖/, '外卖优选']]
function reasonTag(r: string): string {
  for (const [re, t] of REASON_TAGS) if (re.test(r)) return t
  return r.length > 6 ? r.slice(0, 6) : r
}

export function PlanView({ plan, targets, dishMap, dayEntries, onReroll, onLogMeal, onDislike, isToday, showSodium = false, date, planFor, onRerollWeek, onPickDate }: {
  /** 只有高血压模式显示钠 */
  showSodium?: boolean
  /** 当前日期与一周视图 */
  date: string
  planFor: (d: string) => DayPlan | null
  onRerollWeek: (dates: string[]) => void
  onPickDate: (d: string) => void
  plan: DayPlan
  targets: Targets
  dishMap: Map<string, Dish>
  dayEntries: LogEntry[]
  onReroll: (slot?: MealSlot) => void
  onLogMeal: (m: MealPlan) => void
  onDislike: (dishId: string) => void
  isToday: boolean
}) {
  // 已吃餐次的实际摄入：顶部数据条按「已吃 + 推荐」对照全天目标
  const hasEaten = plan.eatenSlots.length > 0
  const eatenN = useMemo(() => sum(dayEntries.filter((e) => plan.eatenSlots.includes(e.slot)).map((e) => entryNutrients(e, dishMap))), [dayEntries, plan.eatenSlots, dishMap])
  const [showList, setShowList] = useState(false)
  const [view, setView] = useState<'day' | 'week'>('day')
  const list = shoppingList(plan, dishMap)
  const allEaten = plan.meals.length === 0
  const today = todayStr()
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(date, i)), [date])
  const weekPlans = useMemo(() => (view === 'week' ? weekDates.map((d) => ({ date: d, plan: planFor(d) })) : []), [view, weekDates, planFor])
  const weekList = useMemo(() => {
    const m = new Map<string, { ing: string; name: string; g: number }>()
    for (const { plan: p } of weekPlans) if (p) for (const x of shoppingList(p, dishMap)) { const cur = m.get(x.ing); if (cur) cur.g += x.g; else m.set(x.ing, { ...x }) }
    return [...m.values()].sort((a, b) => b.g - a.g).map((x) => ({ ...x, g: Math.round(x.g) }))
  }, [weekPlans, dishMap])
  return (
    <div>
      <div className="card">
        <div className="section-title">
          <h2>{view === 'week' ? '这一周' : isToday ? '今天吃什么' : '这天的推荐'}</h2>
          <div className="row" style={{ gap: 6 }}>
            <div className="seg seg-sm" role="tablist">
              <button role="tab" aria-selected={view === 'day'} className={view === 'day' ? 'on' : ''} onClick={() => setView('day')}>单日</button>
              <button role="tab" aria-selected={view === 'week'} className={view === 'week' ? 'on' : ''} onClick={() => setView('week')}>一周</button>
            </div>
            {view === 'day' && !allEaten && <button className="btn sm" onClick={() => onReroll()}>全天换一换</button>}
          </div>
        </div>
        {view === 'day' && <Stats items={hasEaten ? [
          // 有已吃的餐次时，推荐只覆盖其余餐次；顶部按「已吃 + 推荐 = 全天」对照目标，免得看着像推荐不够
          { label: '全天热量', value: r0(eatenN.kcal + plan.totals.kcal), of: targets.kcal, unit: '千卡', tone: eatenN.kcal + plan.totals.kcal > targets.kcal * 1.05 ? 'bad' : undefined, sub: `已吃 ${r0(eatenN.kcal)} + 推荐 ${r0(plan.totals.kcal)}` },
          { label: '全天蛋白', value: r0(eatenN.protein + plan.totals.protein), of: targets.protein, unit: 'g', sub: `已吃 ${r0(eatenN.protein)} + 推荐 ${r0(plan.totals.protein)}` },
        ] : [
          { label: '推荐热量', value: r0(plan.totals.kcal), of: targets.kcal, unit: '千卡', tone: plan.totals.kcal > targets.kcal * 1.05 ? 'bad' : undefined },
          { label: '推荐蛋白', value: r0(plan.totals.protein), of: targets.protein, unit: 'g' },
        ]} />}
        {view === 'day' && hasEaten && <p className="tiny muted" style={{ marginTop: 2 }}>已吃{plan.eatenSlots.map((s) => SLOT_LABEL[s]).join('、')}；推荐只覆盖其余餐次，按剩余预算给</p>}
        {view === 'day' && <SignalChips notes={withoutSodiumNotes(plan.notes, showSodium)} />}
      </div>

      {view === 'week' && (
        <div className="card">
          <div className="week">
            {weekPlans.map(({ date: d, plan: p }) => (
              <button key={d} className={`week-row${d === date ? ' cur' : ''}`} onClick={() => { onPickDate(d); setView('day') }} aria-label={`查看 ${shortDate(d)} 的推荐`}>
                <div className="week-day">{d === today ? '今天' : `周${weekdayLabel(d)}`}<span className="tiny muted"> {shortDate(d)}</span></div>
                <div className="week-meals">
                  {p ? MEAL_SLOTS.filter((s) => s !== 'snack' || p.meals.some((m) => m.slot === 'snack')).map((s) => {
                    const m = p.meals.find((x) => x.slot === s)
                    const eaten = p.eatenSlots.includes(s)
                    return (
                      <div key={s} className="week-meal">
                        <span className="week-slot">{SLOT_LABEL[s]}</span>
                        <span className="ellipsis">{eaten ? '已吃' : m ? m.items.map((it) => dishMap.get(it.dishId)?.name).filter(Boolean).join('、') : '—'}</span>
                      </div>
                    )
                  }) : <span className="muted">—</span>}
                </div>
                <div className="num small ink2 week-kcal">{p ? `${r0(p.totals.kcal)} 千卡` : ''}</div>
              </button>
            ))}
          </div>
          <div className="row between" style={{ marginTop: 10, gap: 8 }}>
            <span className="tiny muted">按当前记录与近 7 天吃法排的，往后几天会随记录变化</span>
            <button className="btn sm" onClick={() => onRerollWeek(weekDates)}>全周换一换</button>
          </div>
          <Fold summary={`本周采购清单（${weekList.length} 项）`}>
            <div className="row wrap" style={{ gap: 6 }}>{weekList.map((x) => <span key={x.ing} className="pill">{x.name} {x.g} g</span>)}</div>
          </Fold>
        </div>
      )}

      {view === 'day' && MEAL_SLOTS.map((slot) => {
        if (plan.eatenSlots.includes(slot)) {
          const list = dayEntries.filter((e) => e.slot === slot)
          return (
            <div key={slot} className="card lobe lobe-eaten">
              <div className="section-title"><h2>{SLOT_LABEL[slot]} <span className="pill good">已吃</span></h2></div>
              <p className="small muted">{list.map((e) => `${entryName(e, dishMap)} × ${entryPortionText(e, dishMap)}`).join('、')}</p>
            </div>
          )
        }
        const m = plan.meals.find((x) => x.slot === slot)
        if (!m) return null
        return <MealCard key={slot} meal={m} dishMap={dishMap} onReroll={() => onReroll(m.slot)} onLog={() => onLogMeal(m)} onDislike={onDislike} showSodium={showSodium} />
      })}

      {view === 'day' && allEaten && <div className="card"><div className="empty">今天的餐都记录了，明天再来看推荐</div></div>}

      {view === 'day' && !allEaten && (
        <div className="card">
          <div className="section-title"><h2>采购清单</h2><button className="btn ghost sm" onClick={() => setShowList(!showList)}>{showList ? '收起' : '展开'}</button></div>
          {showList && (
            <div className="row wrap" style={{ gap: 6 }}>
              {list.map((x) => <span key={x.ing} className="pill">{x.name} {x.g} g</span>)}
            </div>
          )}
          {!showList && <p className="small muted">{list.slice(0, 8).map((x) => x.name).join('、')}{list.length > 8 ? ' 等' : ''}</p>}
        </div>
      )}
    </div>
  )
}

function MealCard({ meal, dishMap, onReroll, onLog, onDislike, showSodium }: { meal: MealPlan; dishMap: Map<string, Dish>; onReroll: () => void; onLog: () => void; onDislike: (id: string) => void; showSodium: boolean }) {
  const [logged, setLogged] = useState(false)
  return (
    <div className={`card lobe lobe-${meal.slot}`}>
      <div className="section-title">
        <h2>{SLOT_LABEL[meal.slot]} <span className="muted small" style={{ fontWeight: 400 }}>目标约 {meal.targetKcal} 千卡</span></h2>
        <button className="btn ghost sm" onClick={onReroll}>换一换</button>
      </div>
      <div className="list">
        {meal.items.map((it) => {
          const d = dishMap.get(it.dishId)
          if (!d) return null
          const n = scale(dishNutrientsFor(d, it), it.portion)
          return (
            <div key={it.dishId} className="list-item">
              <div className="grow">
                <div className="ellipsis">{d.name} <span className="muted small">× {portionText(it.portion, servingGrams(d))}</span>{it.reason && <span className="pill accent" title={it.reason} style={{ marginLeft: 6 }}>{reasonTag(it.reason)}</span>}{it.lowSalt && <span className="pill" style={{ marginLeft: 6 }}>少盐</span>}{it.lowOil && <span className="pill" style={{ marginLeft: 4 }}>少油</span>}</div>
                <div className="tiny muted">{d.serving} · {COOK_LABEL[d.cook]} · 蛋白 {r0(n.protein)} g</div>
              </div>
              <div className="num ink2">{r0(n.kcal)}</div>
              <button className="btn ghost sm" title="不想吃这个，以后不推荐" onClick={() => onDislike(d.id)} aria-label="不推荐这道菜"><IconClose /></button>
            </div>
          )
        })}
        {meal.items.length === 0 && <div className="empty small">没有符合条件的菜，试试放宽过敏或不吃设置</div>}
      </div>
      <div className="row between" style={{ marginTop: 8 }}>
        <span className="small ink2 num">合计 {r0(meal.totals.kcal)} 千卡 · 蛋白 {r0(meal.totals.protein)} g{showSodium && ` · 钠 ${r0(meal.totals.sodium)} mg`}</span>
        {meal.items.length > 0 && <button className="btn primary sm" disabled={logged} onClick={() => { onLog(); setLogged(true) }}>{logged ? '已记录' : '照这个吃，记为已吃'}</button>}
      </div>
      {withoutSodiumNotes(meal.notes, showSodium).map((t, i) => <p key={i} className="small muted" style={{ marginTop: 6 }}>{t}</p>)}
    </div>
  )
}
