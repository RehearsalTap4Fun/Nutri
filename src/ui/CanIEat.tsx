import { useMemo, useState } from 'react'
import type { Condition, Dish, MealSlot, Nutrients, Targets } from '../core/types'
import type { CustomFood } from '../store/storage'
import { searchFoods, type FoodPick } from './foodSearch'
import { dishNutrients, dishWeight, scale } from '../core/nutrition'
import { foodVerdictForDish, foodVerdictForNutrients, type Verdict } from '../core/verdict'
import { Stats, Bullets } from './bits'
import { IconAlert, IconClose, IconPlus } from './icons'
import { portionLabel, r0 } from './format'

const VERDICT_LABEL: Record<Verdict, string> = { avoid: '不建议', caution: '少吃点', ok: '可以吃' }
const VERDICT_PILL: Record<Verdict, string> = { avoid: 'pill bad', caution: 'pill warn', ok: 'pill good' }

/** 「能不能吃」：搜一个食物，按当前人群模式与今天已吃的量给建议。规则复用 core/verdict，不重新发明。 */
export function CanIEat({ dishes, dishMap, customFoods, favorites, recentDishIds, conditions, targets, todaySoFar, showSodium, nextSlot, onQuickLog }: {
  dishes: Dish[]
  dishMap: Map<string, Dish>
  customFoods: CustomFood[]
  favorites: string[]
  recentDishIds: string[]
  conditions: Condition[]
  targets: Targets
  todaySoFar: Nutrients
  showSodium: boolean
  nextSlot: MealSlot
  onQuickLog?: (slot: MealSlot, dishId: string, portion?: number) => void
}) {
  const [q, setQ] = useState('')
  const [pick, setPick] = useState<FoodPick | null>(null)
  const [portion, setPortion] = useState(1)
  const [logged, setLogged] = useState(false)

  const results = useMemo(() => (q.trim() ? searchFoods(q, 'all', dishes, customFoods, favorites, recentDishIds, dishMap).slice(0, 8) : []), [q, dishes, customFoods, favorites, recentDishIds, dishMap])

  const choose = (p: FoodPick) => { setPick(p); setPortion(1); setLogged(false); setQ('') }
  const reset = () => { setPick(null); setQ('') }

  const perServing = pick ? (pick.kind === 'dish' ? dishNutrients(pick.dish) : pick.food.nutrients) : null
  const weight = pick?.kind === 'dish' ? dishWeight(pick.dish) : 0
  const scaled = perServing ? scale(perServing, portion) : null
  const result = pick
    ? pick.kind === 'dish'
      ? foodVerdictForDish(pick.dish, { conditions }, targets, todaySoFar, portion)
      : foodVerdictForNutrients(pick.food.nutrients, { conditions }, targets, todaySoFar, portion)
    : null
  const hasConditions = conditions.length > 0
  const limited = pick?.kind === 'custom' && hasConditions

  return (
    <div className="card">
      <h2>能不能吃</h2>
      {!pick && (
        <>
          <p className="small muted">搜一个食物，看看按你现在的模式和今天吃的量，这份能不能吃。</p>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜菜名或自定义食物，如 小龙虾、蛋糕" />
          {results.length > 0 && (
            <div className="list" style={{ marginTop: 8 }}>
              {results.map((r) => (
                <button key={r.kind === 'dish' ? r.dish.id : r.food.id} className="list-item" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit' }} onClick={() => choose(r)}>
                  <span className="grow ellipsis">{r.kind === 'dish' ? r.dish.name : r.food.name}</span>
                  <span className="tiny muted">{r.kind === 'dish' ? r.dish.serving : r.food.serving}</span>
                </button>
              ))}
            </div>
          )}
          {q.trim() && results.length === 0 && <p className="empty small">没找到「{q}」，试试换个名字，或先在「记一笔」里按食材/成分表自建后再来问。</p>}
        </>
      )}
      {pick && result && scaled && (
        <>
          <div className="row between">
            <h3>{pick.kind === 'dish' ? pick.dish.name : pick.food.name}</h3>
            <button className="btn ghost sm" onClick={reset} aria-label="换一个">换一个 <IconClose size={12} /></button>
          </div>
          <span className={VERDICT_PILL[result.verdict]}>{VERDICT_LABEL[result.verdict]}</span>
          {weight > 0 && (
            <div className="stepper" style={{ marginTop: 10 }}>
              <button onClick={() => setPortion(Math.max(0.25, portion - 0.25))}>−</button>
              <span className="val num">{portionLabel(portion)}</span>
              <button onClick={() => setPortion(Math.min(6, portion + 0.25))}>+</button>
            </div>
          )}
          {result.reasons.length > 0 ? (
            <Bullets items={result.reasons.map((t) => ({ icon: <IconAlert size={14} />, text: t }))} />
          ) : (
            <p className="small" style={{ marginTop: 8 }}>{hasConditions ? '在当前模式下没有踩雷。' : '没有设置特殊人群模式，仅按今天的热量预算参考。'}</p>
          )}
          {limited && <p className="tiny muted">自定义食物没有食材构成，判不了酒精、生食、腌制、嘌呤这些，仅按热量与宏量粗判。</p>}
          <Stats dense items={[
            { label: '热量', value: r0(scaled.kcal), unit: '千卡' },
            { label: '蛋白', value: r0(scaled.protein), unit: 'g' },
            { label: '脂肪', value: r0(scaled.fat), unit: 'g' },
            { label: '碳水', value: r0(scaled.carbs), unit: 'g' },
            { label: '纤维', value: r0(scaled.fiber), unit: 'g' },
            ...(showSodium ? [{ label: '钠', value: r0(scaled.sodium), unit: 'mg' }] : []),
          ]} />
          {pick.kind === 'dish' && onQuickLog && (
            logged
              ? <p className="small" style={{ marginTop: 8 }}>已记一笔。</p>
              : <button className="btn" style={{ marginTop: 8 }} onClick={() => { onQuickLog(nextSlot, pick.dish.id, portion); setLogged(true) }}><IconPlus size={14} /> 记一笔</button>
          )}
        </>
      )}
    </div>
  )
}
