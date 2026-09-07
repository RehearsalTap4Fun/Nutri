import { useState } from 'react'
import { generateSyncCode, normalizeSyncCode } from '../sync/crypto'
import { Bullets, Fold } from './bits'
import { IconCheck, IconLock, IconSparkle } from './icons'

export interface SyncStatus {
  busy: boolean
  lastSyncAt?: number
  lastError?: string
  version?: number
}

export function CloudSyncCard({ code, enabled, status, onEnable, onDisable, onSyncNow }: {
  code: string
  enabled: boolean
  status: SyncStatus
  onEnable: (code: string, mode: 'new' | 'join') => void
  onDisable: (deleteRemote: boolean) => void
  onSyncNow: () => void
}) {
  const [mode, setMode] = useState<'idle' | 'new' | 'join'>('idle')
  const [draft, setDraft] = useState('')
  const [reveal, setReveal] = useState(false)
  const [confirmOff, setConfirmOff] = useState(false)
  const [copied, setCopied] = useState(false)
  const insecure = typeof location !== 'undefined' && location.protocol === 'http:' && location.hostname !== 'localhost'

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { setReveal(true) }
  }

  if (!enabled) {
    return (
      <div className="card">
        <div className="section-title"><h2>云同步</h2><span className="pill">未开</span></div>
        <Bullets items={[
          { icon: <IconSparkle />, text: '多台设备共用同一份记录，换手机不用导出导入' },
          { icon: <IconLock />, text: '数据在设备上用同步码加密后再上传，服务器只存密文；同步码丢了云端数据就解不开，请记下来' },
          { icon: <IconCheck />, text: '按条目合并：两台设备同一天各记几笔都会保留' },
        ]} />
        {mode === 'idle' && (
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={() => { setDraft(generateSyncCode()); setMode('new') }}>生成同步码并开启</button>
            <button className="btn" onClick={() => { setDraft(''); setMode('join') }}>输入已有同步码</button>
          </div>
        )}
        {mode === 'new' && (
          <div className="stack" style={{ marginTop: 12 }}>
            <div className="note num" style={{ fontSize: 18, letterSpacing: '.06em', textAlign: 'center', fontWeight: 700 }}>{draft}</div>
            <p className="small ink2">这就是你的同步码。抄到备忘录或密码管理器里，其他设备输入它即可接上。</p>
            <div className="row">
              <button className="btn" onClick={() => setMode('idle')}>取消</button>
              <button className="btn" onClick={() => copy(draft)}>{copied ? '已复制' : '复制'}</button>
              <button className="btn primary grow" onClick={() => onEnable(draft, 'new')}>我记下了，开启</button>
            </div>
          </div>
        )}
        {mode === 'join' && (
          <div className="stack" style={{ marginTop: 12 }}>
            <input className="input num" autoFocus placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ letterSpacing: '.05em' }} />
            <p className="tiny muted">不分大小写，连字符可不填。接上后会把云端数据和本机数据合并，两边都不会丢。</p>
            <div className="row">
              <button className="btn" onClick={() => setMode('idle')}>取消</button>
              <button className="btn primary grow" disabled={!normalizeSyncCode(draft)} onClick={() => onEnable(normalizeSyncCode(draft)!, 'join')}>接入</button>
            </div>
          </div>
        )}
        {insecure && <Fold summary="现在是 HTTP 访问，安全吗"><p>数据已在设备上加密，网络上只传密文，别人拿不到内容；但理论上能看到或破坏密文。用 HTTPS 地址打开可以避免这一点。</p></Fold>}
      </div>
    )
  }

  const masked = code.replace(/[^-]/g, '•')
  return (
    <div className="card">
      <div className="section-title"><h2>云同步</h2>{status.busy ? <span className="pill">同步中…</span> : status.lastError ? <span className="pill bad">上次失败</span> : <span className="pill good">已开</span>}</div>
      <div className="row" style={{ gap: 8 }}>
        <span className="num grow" style={{ letterSpacing: '.05em', fontWeight: 600 }}>{reveal ? code : masked}</span>
        <button className="btn sm" onClick={() => setReveal(!reveal)}>{reveal ? '隐藏' : '显示'}</button>
        <button className="btn sm" onClick={() => copy(code)}>{copied ? '已复制' : '复制'}</button>
      </div>
      <p className="tiny muted" style={{ marginTop: 6 }}>
        {status.lastSyncAt ? `上次同步 ${new Date(status.lastSyncAt).toLocaleString('zh-CN', { hour12: false })}` : '还没同步过'}
        {status.version ? ` · 云端版本 ${status.version}` : ''}
        {status.lastError ? ` · ${status.lastError}` : ''}
      </p>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary sm" disabled={status.busy} onClick={onSyncNow}>立即同步</button>
        <span className="grow" />
        {!confirmOff ? <button className="btn danger sm" onClick={() => setConfirmOff(true)}>关闭同步</button> : (
          <span className="row wrap" style={{ gap: 6 }}>
            <button className="btn sm" onClick={() => { onDisable(false); setConfirmOff(false) }}>只在本机关闭</button>
            <button className="btn danger sm" onClick={() => { onDisable(true); setConfirmOff(false) }}>关闭并删除云端</button>
            <button className="btn ghost sm" onClick={() => setConfirmOff(false)}>取消</button>
          </span>
        )}
      </div>
      <Fold summary="其他设备怎么接入"><p>在那台设备的「我的 → 云同步」里选「输入已有同步码」，填上面这串即可。接入时会把两边数据合并。</p></Fold>
    </div>
  )
}
