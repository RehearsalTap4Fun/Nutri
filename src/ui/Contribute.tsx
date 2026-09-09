import { useState } from 'react'
import type { Dish } from '../core/types'
import type { CustomFood } from '../store/storage'
import { contributionText, draftForCustomDish, draftForCustomFood, type ContributionDraft } from '../core/contribute'
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

/** 单条贡献：展开显示 JSON 草稿，复制后标记已贡献 */
function ContributeRow({ item, onMarkContributed }: { item: Item; onMarkContributed: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const text = contributionText(item.draft)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch { /* 剪贴板不可用时用户手动全选复制 */ }
    setCopied(true)
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
          <p className="tiny muted">复制后粘贴成 <a href={ISSUE_URL} target="_blank" rel="noreferrer">GitHub Issue</a>，或发给作者；作者审核后会手动整理进食品库。不经过任何服务器，纯本地生成。</p>
          <div className="row">
            <button className="btn" onClick={copy}>{copied ? <><IconCheck size={14} /> 已复制</> : '复制'}</button>
            <button className="btn primary" onClick={() => onMarkContributed(item.id)}>标记已贡献</button>
          </div>
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
      <p className="small muted">这些是你手输、食品库里还没有的食物。愿意的话可以贡献出来，作者人工审核后会正式收进食品库，以后大家都能直接搜到。不会自动上传，也不经过任何服务器。</p>
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
