import { useState } from 'react'
import type { Dish } from '../core/types'
import type { CustomFood } from '../store/storage'
import { contributionText, draftForCustomDish, draftForCustomFood, type ContributionDraft } from '../core/contribute'
import { submitContribution } from '../sync/contribute'
import { Fold } from './bits'
import { IconCheck } from './icons'

const ISSUE_URL = 'https://github.com/RehearsalTap4Fun/Nutri/issues/new'

type Item = { id: string; name: string; serving: string; draft: ContributionDraft }

function itemsOf(customFoods: CustomFood[], customDishes: Dish[]): Item[] {
  return [
    ...customDishes.map((d) => ({ id: d.id, name: d.name, serving: d.serving, draft: draftForCustomDish(d) })),
    ...customFoods.map((f) => ({ id: f.id, name: f.name, serving: f.serving, draft: draftForCustomFood(f) })),
  ]
}

/** 单条贡献：展开显示 JSON 草稿，直接提交（明文匿名、独立于加密同步）或手动复制走 GitHub */
function ContributeRow({ item, onMarkContributed }: { item: Item; onMarkContributed: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [err, setErr] = useState('')
  const text = contributionText(item.draft)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch { /* 剪贴板不可用时用户手动全选复制 */ }
    setCopied(true)
  }
  const submit = async () => {
    setSendState('sending')
    setErr('')
    try {
      await submitContribution(item.draft)
      onMarkContributed(item.id)
    } catch (e) {
      setSendState('error')
      setErr(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div className="row">
        <div className="grow">
          <div className="ellipsis">{item.name}</div>
          <div className="tiny muted">{item.serving}</div>
        </div>
        <button className="btn ghost sm" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? '收起' : '贡献'}</button>
      </div>
      {open && (
        <>
          <textarea className="input" readOnly rows={8} value={text} style={{ fontFamily: 'monospace', fontSize: 12 }} onClick={(e) => (e.target as HTMLTextAreaElement).select()} />
          <p className="tiny muted">直接提交会把这份草稿明文发给作者收集，不带任何身份信息，跟你的加密日记同步完全是两条独立的路、不共享密钥；也可以手动复制粘贴成 <a href={ISSUE_URL} target="_blank" rel="noreferrer">GitHub Issue</a> 或发给作者。作者审核数值合理后会手动整理进食品库。</p>
          <div className="row wrap">
            <button className="btn primary" disabled={sendState === 'sending'} onClick={submit}>{sendState === 'sending' ? '提交中…' : '直接提交给作者'}</button>
            <button className="btn" onClick={copy}>{copied ? <><IconCheck size={14} /> 已复制</> : '复制'}</button>
            <button className="btn ghost sm" onClick={() => onMarkContributed(item.id)}>已经贡献过了</button>
          </div>
          {sendState === 'error' && <p className="small" style={{ color: 'var(--bad-text)' }}>{err}，可以用上面的复制走 GitHub。</p>}
        </>
      )}
    </div>
  )
}

/** 帮食品库变大：把库里没有、只能靠手输营养值的自定义食物/自建菜整理成可读草稿，人工审核后合入项目食品库 */
export function ContributeCard({ customFoods, customDishes, contributedIds, onMarkContributed }: {
  customFoods: CustomFood[]
  customDishes: Dish[]
  contributedIds: string[]
  onMarkContributed: (id: string) => void
}) {
  const all = itemsOf(customFoods, customDishes)
  if (all.length === 0) return null
  const contributed = new Set(contributedIds)
  const pending = all.filter((it) => !contributed.has(it.id))
  const done = all.filter((it) => contributed.has(it.id))
  return (
    <div className="card">
      <h2>帮食品库变大</h2>
      <p className="small muted">这些是你手输、食品库里还没有的食物。愿意的话可以贡献出来，作者人工审核后会正式收进食品库，以后大家都能直接搜到。「直接提交」是单独一路明文匿名收集，跟你的加密日记同步不共享任何存储或密钥。</p>
      {pending.length === 0 ? (
        <p className="small muted">没有待贡献的了。</p>
      ) : (
        <div className="list">
          {pending.map((it) => <ContributeRow key={it.id} item={it} onMarkContributed={onMarkContributed} />)}
        </div>
      )}
      {done.length > 0 && (
        <Fold summary={`已贡献 ${done.length} 个`}>
          <div className="list">
            {done.map((it) => <div key={it.id} className="list-item"><span className="grow ellipsis">{it.name}</span><span className="tiny muted">{it.serving}</span></div>)}
          </div>
        </Fold>
      )}
    </div>
  )
}
