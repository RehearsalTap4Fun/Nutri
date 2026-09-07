import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import type { Dish, LogEntry, MealSlot, Targets, WaterEntry } from '../core/types'
import { WaterCard } from './Water'
import { MEAL_SLOTS } from '../core/types'
import type { DayStat } from '../core/analysis'
import { todayStr } from '../core/dates'
import type { BudgetPick } from '../core/budget'
import { entryName, entryNutrients } from '../core/nutrition'
import { Meter } from './charts'
import { useCountUp } from './hooks'
import { IconBowl, IconClose, IconPlus } from './icons'
import { SLOT_LABEL, portionLabel, r0, showsSodium, withoutSodiumNotes } from './format'
import { CONDITION_LABEL } from '../core/conditions'
import { SignalChips } from './bits'

// 餐次用色地的颜色（早餐太阳黄 / 午餐陆地绿 / 晚餐浅绿 / 加餐白），不借用三宏量的红蓝琥珀
const SLOT_DOT: Record<MealSlot, string> = { breakfast: 'var(--sun)', lunch: 'var(--land)', dinner: 'var(--land-2)', snack: 'var(--surface)' }

export function Today({ water, fluidMl, onSetWater, date, entries, targets, stat, dishMap, onAdd, onEdit, planNotes, goPlan, goModes, conditions = [], trainingDay, onToggleTrainingDay, quickIds = [], onQuickLog, onRemove, budgetPicks = [], nextSlot = 'dinner' }: {
  water: WaterEntry[]
  fluidMl: number
  /** 把这一天的饮水总量设为 ml */
  onSetWater: (ml: number) => void
  /** 用剩余预算还能吃什么（App 算好传入） */
  budgetPicks?: BudgetPick[]
  nextSlot?: MealSlot
  /** 最近吃过与收藏的菜 id，用于空餐次的一键补记 */
  quickIds?: string[]
  onQuickLog?: (slot: MealSlot, dishId: string, portion?: number) => void
  /** 删除一条记录（调用方负责 toast 撤销） */
  onRemove?: (e: LogEntry) => void
  goModes?: () => void
  conditions?: import('../core/types').Condition[]
  /** undefined = 非增肌模式，不显示切换 */
  trainingDay?: boolean
  onToggleTrainingDay?: () => void
  date: string
  entries: LogEntry[]
  targets: Targets
  stat: DayStat
  dishMap: Map<string, Dish>
  onAdd: (slot?: MealSlot) => void
  onEdit: (e: LogEntry) => void
  planNotes: string[]
  goPlan: () => void
}) {
  const n = stat.n
  const showNa = showsSodium(conditions)
  const notes = withoutSodiumNotes(planNotes, showNa)
  // 左滑露出「删除」：只在水平位移占优时跟手，松手超过 44px 就停在打开态
  const [swiped, setSwiped] = useState<string | null>(null)
  const [showBudget, setShowBudget] = useState(false)
  const budgetRef = useRef<HTMLDivElement>(null)
  // 展开时把列表滚进视野，让人看见它出现在哪、也看见右上角的「收起」
  useEffect(() => { if (showBudget) budgetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [showBudget])
  const touch = useRef<{ id: string; x: number; y: number; dx: number; el: HTMLElement } | null>(null)
  const onSwipeStart = (id: string, ev: React.TouchEvent<HTMLDivElement>) => {
    const t = ev.touches[0]
    touch.current = { id, x: t.clientX, y: t.clientY, dx: 0, el: ev.currentTarget }
  }
  const onSwipeMove = (ev: React.TouchEvent<HTMLDivElement>) => {
    const s = touch.current
    if (!s) return
    const t = ev.touches[0]
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dy) > Math.abs(dx)) return
    s.dx = Math.max(-96, Math.min(0, dx + (swiped === s.id ? -88 : 0)))
    s.el.style.transition = 'none'
    s.el.style.transform = `translateX(${s.dx}px)`
  }
  const onSwipeEnd = () => {
    const s = touch.current
    if (!s) return
    s.el.style.transition = ''
    s.el.style.transform = ''
    setSwiped(s.dx < -44 ? s.id : null)
    touch.current = null
  }
  const kcalShown = useCountUp(Math.round(n.kcal))
  const remain = targets.kcal - n.kcal
  // 湖 = 还能吃的份额：满湖是一天没吃，最小不低于三成好放得下数字；超标湖就没了
  const lakeScale = remain > 0 ? Math.max(0.58, Math.min(1, 0.58 + 0.42 * (remain / targets.kcal))) : 0
  const slots = MEAL_SLOTS.filter((s) => targets.slotShare[s] > 0 || entries.some((e) => e.slot === s))
  return (
    <div>
      <div className={`land${remain < 0 ? ' over' : ''}`}>
        <svg className="land-shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden focusable="false">
          <path className="land-fill" d="M0 0H100V82C94 83.5 87 90 76 93C60 97.5 44 92 28 96C17 98.8 7 100 0 100Z" />
          <path className="land-coast" d="M100 82C94 83.5 87 90 76 93C60 97.5 44 92 28 96C17 98.8 7 100 0 100" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="land-top">
          <div className="lake-wrap" style={{ ['--lake-scale' as string]: lakeScale }}>
            <div className="lake" aria-hidden />
            <div className="lake-label" role="status" aria-live="polite">
              <span className="lake-cap">{remain >= 0 ? '还可以吃' : '已超出'}</span>
              <span className="lake-num num">{r0(Math.abs(remain))}</span>
              <span className="lake-cap">千卡</span>
            </div>
          </div>
          <div className="land-facts">
            <div className="land-eaten">
              <span className="num" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{Math.round(kcalShown)}</span>
              <span className="small">/ {targets.kcal} 千卡 已吃</span>
            </div>
            {remain < 0 && <p className="small" style={{ marginTop: 4, fontWeight: 700 }}>晚点清淡些</p>}
            <div className="hero-sub">
              <span>蔬菜 <b>{(stat.vegG / 100).toFixed(1)}</b> 份</span>
              <span>水果 <b>{r0(stat.fruitG)}</b> g</span>
              {showNa && <span>钠 <b style={n.sodium > targets.sodiumMax ? { color: 'var(--bad-text)' } : undefined}>{r0(n.sodium)}</b> / {targets.sodiumMax} mg</span>}
              {conditions.map((c) => <button key={c} className="pill accent" style={{ border: 'none', cursor: 'pointer' }} onClick={goModes}>{CONDITION_LABEL[c]}模式</button>)}
              {remain > 50 && budgetPicks.length > 0 && onQuickLog && (
                <button className={`chip${showBudget ? ' on' : ''}`} style={{ padding: '2px 10px', fontSize: 12 }} aria-expanded={showBudget} onClick={() => setShowBudget(!showBudget)}>还能吃什么</button>
              )}
              {conditions.length === 0 && goModes && (
                <button className="chip" style={{ padding: '2px 10px', fontSize: 12 }} onClick={goModes}>有特殊情况？设营养模式</button>
              )}
              {trainingDay !== undefined && (
                <button className={`chip${trainingDay ? ' on' : ''}`} style={{ padding: '2px 10px', fontSize: 12 }} onClick={onToggleTrainingDay}>{trainingDay ? '训练日 · 碳水 +300 千卡' : '标为训练日'}</button>
              )}
            </div>
          </div>
        </div>
        <div className="land-meters">
          <Meter label="蛋白" value={n.protein} target={targets.protein} unit="g" color="var(--protein)" soft="var(--protein-soft)" />
          <Meter label="脂肪" value={n.fat} target={targets.fat} unit="g" color="var(--fat)" soft="var(--fat-soft)" />
          <Meter label="碳水" value={n.carbs} target={targets.carbs} unit="g" color="var(--carbs)" soft="var(--carbs-soft)" />
          <Meter label="纤维" value={n.fiber} target={targets.fiber} unit="g" color="var(--fiber)" soft="var(--fiber-soft)" />
        </div>
      </div>

      {showBudget && remain > 50 && budgetPicks.length > 0 && onQuickLog && (
        <div className="card" ref={budgetRef}>
          <div className="section-title"><h2>用剩下的 {r0(remain)} 千卡还能吃什么</h2><div className="row" style={{ gap: 4, flex: 'none', whiteSpace: 'nowrap' }}><span className="small muted">按{SLOT_LABEL[nextSlot]}挑</span><button className="btn ghost sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }} onClick={() => setShowBudget(false)} aria-label="收起还能吃什么">收起<IconClose size={12} /></button></div></div>
          <div className="list">
            {budgetPicks.map((p) => (
              <div key={p.dish.id} className="list-item">
                <div className="grow">
                  <div className="ellipsis">{p.dish.name} <span className="muted small">× {portionLabel(p.portion)}</span></div>
                  <div className="tiny muted">{p.why}{/蛋白/.test(p.why) ? '' : ` · 蛋白 ${r0(p.n.protein)} g`}</div>
                </div>
                <div className="num ink2">{r0(p.n.kcal)}</div>
                <button className="btn ghost sm" onClick={() => { onQuickLog(nextSlot, p.dish.id, p.portion); setShowBudget(false) }} aria-label={`记一份${p.dish.name}`}><IconPlus size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {notes.length > 0 && entries.length === 0 && (
        <div className="card">
          <div className="section-title"><h2>今天的营养师提醒</h2><button className="btn ghost sm" onClick={goPlan}>看推荐 ›</button></div>
          <SignalChips notes={notes} />
        </div>
      )}
      <WaterCard entries={water} targetMl={targets.waterMl} fluidMl={fluidMl} isToday={date === todayStr()} onSet={onSetWater} />


      <div className="card">
        <div className="section-title"><h2>今日记录</h2><span className="small muted">{entries.length ? `${entries.length} 条` : ''}</span></div>
        {entries.length === 0 && (
          <div className="empty-box">
            <div className="ico"><IconBowl /></div>
            <div className="t">这一天还没有记录</div>
            <div className="d">点加号搜菜名，或去「推荐」一键记为已吃。</div>
            <button className="btn primary sm" style={{ marginTop: 6 }} onClick={() => onAdd()}>记一笔</button>
          </div>
        )}
        {slots.map((slot) => {
          const list = entries.filter((e) => e.slot === slot)
          const kcal = stat.bySlot[slot].kcal
          const quick = list.length === 0 && onQuickLog ? quickIds.map((id) => dishMap.get(id)).filter((d): d is Dish => !!d && d.slots.includes(slot)).slice(0, 3) : []
          return (
            <div key={slot}>
              <div className="slot-head">
                <span><i className="slot-dot" style={{ ['--dot' as string]: SLOT_DOT[slot] }} />{SLOT_LABEL[slot]}{kcal > 0 && <span className="muted num" style={{ fontWeight: 400 }}> · {r0(kcal)} 千卡</span>}</span>
                <button className="btn ghost sm" onClick={() => onAdd(slot)}>+ 添加</button>
              </div>
              {quick.length > 0 && (
                <div className="chips quick">
                  <span className="qlabel">常吃</span>
                  {quick.map((d) => <button key={d.id} className="chip" onClick={() => onQuickLog?.(slot, d.id)} aria-label={`记一份${d.name}`}><IconPlus size={12} />{d.name}</button>)}
                </div>
              )}
              <div className="list">
                {list.map((e, i) => {
                  const en = entryNutrients(e, dishMap)
                  return (
                    <div key={e.id} className={`swipe${swiped === e.id ? ' open' : ''}`}>
                      <button className="swipe-del" tabIndex={swiped === e.id ? 0 : -1} aria-hidden={swiped !== e.id} onClick={() => { setSwiped(null); onRemove?.(e) }}>删除</button>
                      <div className="list-item tap" style={{ ['--i' as string]: i }} onClick={() => (swiped ? setSwiped(null) : onEdit(e))}
                        onTouchStart={(ev) => onSwipeStart(e.id, ev)} onTouchMove={onSwipeMove} onTouchEnd={onSwipeEnd} onTouchCancel={onSwipeEnd}>
                      <div className="grow">
                        <div className="ellipsis">{entryName(e, dishMap)} <span className="muted small">× {portionLabel(e.portion)}</span>{e.lowSalt && <span className="pill" style={{ marginLeft: 6 }}>少盐</span>}{e.lowOil && <span className="pill" style={{ marginLeft: 4 }}>少油</span>}</div>
                        <div className="tiny muted num">{e.time || ''} · 蛋白 {r0(en.protein)} · 脂肪 {r0(en.fat)} · 碳水 {r0(en.carbs)} g</div>
                      </div>
                      <div className="num ink2" style={{ fontWeight: 600 }}>{r0(en.kcal)}</div>
                      {onRemove && <button className="btn ghost sm row-del" onClick={(ev) => { ev.stopPropagation(); onRemove(e) }} aria-label={`删除 ${entryName(e, dishMap)}`} title="删除这条"><IconClose size={14} /></button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <p className="tiny muted" style={{ marginTop: 12, textAlign: 'center' }}>{date} · 所有数值为估算</p>
    </div>
  )
}
