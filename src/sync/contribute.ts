// 直接把「贡献食物」草稿发去服务器，明文、匿名，跟加密同步走的是完全独立的一路（见 server/sync-server.mjs）。
import type { ContributionDraft } from '../core/contribute'

export class ContributeError extends Error {}

export async function submitContribution(draft: ContributionDraft, opts: { fetchImpl?: typeof fetch; apiBase?: string } = {}): Promise<void> {
  const f = opts.fetchImpl || fetch
  const base = (opts.apiBase || './api').replace(/\/$/, '')
  let res: Response
  try {
    res = await f(`${base}/contribute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
  } catch (e) {
    throw new ContributeError('提交失败，检查网络：' + (e instanceof Error ? e.message : String(e)))
  }
  if (!res.ok) throw new ContributeError(`提交失败，服务器返回 ${res.status}`)
}
