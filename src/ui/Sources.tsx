import type { Condition, Profile, Targets } from '../core/types'
import { CONDITION_SOURCES, SOURCES, SOURCE_MAP, shortCite, targetBasis } from '../core/sources'
import { CONDITION_LABEL } from '../core/conditions'
import { Fold } from './bits'

/** 「这些目标怎么来的」：逐项写规则与出处，默认折叠 */
export function TargetBasis({ profile, targets, adaptive, trainingDay, open = false }: { profile: Profile; targets: Targets; adaptive?: boolean; trainingDay?: boolean; open?: boolean }) {
  const rows = targetBasis(profile, targets, { adaptive, trainingDay })
  return (
    <Fold summary="这些目标怎么来的" open={open}>
      <div className="basis">
        {rows.map((r) => (
          <div key={r.metric} className="basis-row">
            <div className="row between"><b>{r.metric}</b><span className="num">{r.value}</span></div>
            <div>{r.rule}</div>
            <div className="basis-src">依据：{shortCite(r.sources)}</div>
          </div>
        ))}
        <p className="basis-src">完整文献见「关于 · 参考文献」。数值为估算，不构成医疗建议。</p>
      </div>
    </Fold>
  )
}

/** 营养模式各自的指南出处 */
export function ConditionSources({ conditions }: { conditions: Condition[] }) {
  if (!conditions.length) return null
  return (
    <Fold summary="这些模式的规则出自哪里">
      {conditions.map((c) => (
        <p key={c}><b>{CONDITION_LABEL[c]}</b>：{shortCite(CONDITION_SOURCES[c])}</p>
      ))}
    </Fold>
  )
}

/** 关于页的完整参考文献 */
export function SourceList() {
  return (
    <ol className="sources">
      {SOURCES.map((s) => (
        <li key={s.id}>
          <b>{s.title}</b>，{s.org}，{s.year}。<span className="muted">用到：{s.used}</span>
        </li>
      ))}
    </ol>
  )
}

export function citeIds(ids: string[]): string {
  return ids.map((id) => SOURCE_MAP.get(id)?.title || id).join('；')
}
