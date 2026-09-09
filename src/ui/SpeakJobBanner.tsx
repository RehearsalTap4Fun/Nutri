import type { SpeakJob } from '../llm/mealParser'
import { IconAlert, IconClose, IconSparkle } from './icons'

/**
 * 说一句话录餐的后台任务提示条：跨所有页签常驻，弹窗关了也能看见跑到哪了，
 * 点一下随时回到结果（会自动切回发起解析时的那一天）；跑完/出错时才能叉掉。
 */
export function SpeakJobBanner({ job, onOpen, onDismiss }: { job: SpeakJob; onOpen: () => void; onDismiss: () => void }) {
  const summary = job.text.length > 16 ? job.text.slice(0, 16) + '…' : job.text
  if (job.status === 'running') {
    return (
      <div className="note" role="status" style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
        <IconSparkle />
        <span className="grow">正在解析「{summary}」，可以先去别的页面，跑完了会在这里提示。</span>
      </div>
    )
  }
  const isError = job.status === 'error'
  return (
    <div className="note" role="status" style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', ...(isError ? { background: 'var(--protein-soft)' } : {}) }}>
      {isError ? <IconAlert /> : <IconSparkle />}
      <button className="grow" style={{ background: 'none', border: 'none', textAlign: 'left', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0 }} onClick={onOpen}>
        {isError ? `「${summary}」解析失败，点击查看` : `「${summary}」解析完成，点击查看或记为已吃`}
      </button>
      <button className="btn ghost sm" onClick={onDismiss} aria-label="不看了">知道了 <IconClose size={12} /></button>
    </div>
  )
}
