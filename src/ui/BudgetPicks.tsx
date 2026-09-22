import type { MealSlot, Targets } from '../core/types'
import type { BudgetFocus, BudgetPick } from '../core/budget'
import { servingGrams } from '../core/nutrition'
import { IconClose, IconPlus } from './icons'
import { portionText, r0 } from './format'

/**
 * 「用剩下的预算还能吃什么」的那张列表：按缺口挑出来的候选，每条带理由和一键记一笔。
 * 今日页与推荐页共用同一份，免得两页对同一件事给出不同答案。
 */
export function BudgetPickList({ picks, focus, nextSlot, onQuickLog, onDislike, onAfterLog }: {
  picks: BudgetPick[]
  focus: BudgetFocus[]
  nextSlot: MealSlot
  onQuickLog: (slot: MealSlot, dishId: string, portion?: number) => void
  /** 「不喜欢」：进不推荐名单，列表随即补上下一个候选 */
  onDislike?: (dishId: string) => void
  onAfterLog?: () => void
}) {
  return (
    <>
      {focus.length > 0 && (
        <div className="budget-focus tiny">
          <span className="muted">按缺口挑</span>
          {focus.map((f) => <span key={f.key} className={`focus-tag ${f.kind} ${f.key}`}>{f.label}</span>)}
        </div>
      )}
      <div className="list">
        {picks.map((p) => (
          <div key={p.dish.id} className="list-item">
            <div className="grow">
              <div className="ellipsis">{p.dish.name} <span className="muted small">× {portionText(p.portion, servingGrams(p.dish))}</span></div>
              <div className="tiny muted">{p.why}{/蛋白/.test(p.why) ? '' : ` · 蛋白 ${r0(p.n.protein)} g`}</div>
            </div>
            <div className="num ink2">{r0(p.n.kcal)}</div>
            {onDislike && <button className="btn ghost quiet icon-btn" title="不喜欢，换一个" onClick={() => onDislike(p.dish.id)} aria-label={`不喜欢${p.dish.name}，换一个`}><IconClose size={16} /></button>}
            <button className="btn ghost icon-btn" onClick={() => { onQuickLog(nextSlot, p.dish.id, p.portion); onAfterLog?.() }} aria-label={`记一份${p.dish.name}`}><IconPlus size={16} /></button>
          </div>
        ))}
      </div>
    </>
  )
}

/** 一句话说清这份列表是按什么挑的 */
export function budgetCaption(remainKcal: number, targets: Targets): string {
  return `离今天的 ${targets.kcal} 千卡还差 ${r0(remainKcal)} 千卡`
}
