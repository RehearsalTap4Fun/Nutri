import type { Condition, Sex } from '../core/types'
import { CONDITIONS } from '../core/types'
import { CONDITION_DESC, CONDITION_DISCLAIMER, CONDITION_LABEL, TRIMESTER_LABEL } from '../core/conditions'
import { Fold } from './bits'

const MATERNAL: Condition[] = ['pregnancy', 'lactation']

/**
 * 营养模式选择器：芯片多选、孕程分段、说明与免责声明折叠。
 * 建档表单与「我的」页共用；onChange 立即回传，由调用方决定是否即时保存。
 */
export function ModesPicker({ sex, conditions, trimester, onChange }: {
  sex: Sex
  conditions: Condition[]
  trimester?: 1 | 2 | 3
  onChange: (conditions: Condition[], trimester?: 1 | 2 | 3) => void
}) {
  const visible = CONDITIONS.filter((c) => sex === 'female' || !MATERNAL.includes(c))
  const toggle = (c: Condition) => {
    let next = conditions.includes(c) ? conditions.filter((x) => x !== c) : [...conditions, c]
    // 孕期与哺乳期互斥
    if (c === 'pregnancy' && next.includes('pregnancy')) next = next.filter((x) => x !== 'lactation')
    if (c === 'lactation' && next.includes('lactation')) next = next.filter((x) => x !== 'pregnancy')
    onChange(next, next.includes('pregnancy') ? (trimester || 2) : undefined)
  }
  return (
    <div className="stack">
      <div className="chips wrap">
        {visible.map((c) => (
          <button key={c} className={`chip${conditions.includes(c) ? ' on' : ''}`} aria-pressed={conditions.includes(c)} onClick={() => toggle(c)}>{CONDITION_LABEL[c]}</button>
        ))}
      </div>
      {conditions.includes('pregnancy') && (
        <div className="field"><label>孕程</label>
          <div className="seg">{([1, 2, 3] as const).map((t) => <button key={t} className={trimester === t ? 'on' : ''} onClick={() => onChange(conditions, t)}>{TRIMESTER_LABEL[t]}</button>)}</div>
        </div>
      )}
      {conditions.length > 0 && (
        <Fold summary={`这 ${conditions.length} 个模式会怎么调整`}>
          {conditions.map((c) => <p key={c}><b>{CONDITION_LABEL[c]}</b>：{CONDITION_DESC[c]}</p>)}
        </Fold>
      )}
      {conditions.length > 0 && <Fold summary="免责声明"><p>{CONDITION_DISCLAIMER}</p></Fold>}
    </div>
  )
}
