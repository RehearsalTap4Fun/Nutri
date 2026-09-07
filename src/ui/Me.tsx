import { useState } from 'react'
import type { Dish, Profile, Targets } from '../core/types'
import type { AppState } from '../store/storage'
import { exportJson, importJson } from '../store/storage'
import { bmi, bmiLabel } from '../core/energy'
import type { Provider } from '../llm/mealParser'
import { PROVIDER_LABEL } from '../llm/mealParser'
import { ACTIVITY_SHORT, ALLERGEN_LABEL, GOAL_LABEL, SEX_LABEL, STYLE_LABEL } from './format'
import type { Condition } from '../core/types'
import { ModesPicker } from './ModesPicker'
import { Bullets, Fold, SignalChips, Stats } from './bits'
import { IconClose, IconCoin, IconLock, IconSparkle } from './icons'
import { isIOS, isStandalone } from '../pwa'

const PROVIDER_NOTE: Record<Provider, string> = {
  anthropic: '结构化输出最稳，单次约 $0.02。key 在 console.anthropic.com 生成，计费独立于 Claude 订阅。',
  deepseek: 'JSON 模式，单次约 $0.002（高峰价，闲时减半）。key 在 platform.deepseek.com 生成，支持国内支付。',
}

export function MeView({ profile, targets, state, onEdit, onUndislike, onImport, onReset, dishMap, onSetProvider, onSetKey, onSetConditions, canInstall = false, onInstall }: {
  canInstall?: boolean
  onInstall?: () => void
  onSetConditions: (c: Condition[], trimester?: 1 | 2 | 3) => void
  profile: Profile
  targets: Targets
  state: AppState
  onEdit: () => void
  onUndislike: (id: string) => void
  onImport: (s: AppState) => void
  onReset: () => void
  dishMap: Map<string, Dish>
  onSetProvider: (p: Provider) => void
  onSetKey: (p: Provider, k: string) => void
}) {
  const [io, setIo] = useState<'none' | 'export' | 'import'>('none')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const provider = state.settings.provider
  const savedKey = provider === 'deepseek' ? state.settings.deepseekKey : state.settings.anthropicKey
  const [keyDraft, setKeyDraft] = useState(savedKey)
  const [draftFor, setDraftFor] = useState<Provider>(provider)
  if (draftFor !== provider) { setDraftFor(provider); setKeyDraft(savedKey) }
  const hasKey = !!savedKey
  const b = bmi(profile.weightKg, profile.heightCm)
  const age = new Date().getFullYear() - profile.birthYear

  const doImport = () => {
    try {
      const s = importJson(text)
      onImport(s)
      setMsg(`已导入：${s.entries.length} 条记录，${s.weights.length} 条体重`)
      setIo('none')
      setText('')
    } catch (e) {
      setMsg('导入失败：' + (e instanceof Error ? e.message : String(e)))
    }
  }
  const copyExport = async () => {
    const t = exportJson(state)
    setText(t)
    try { await navigator.clipboard.writeText(t); setMsg('已复制到剪贴板，也可以直接复制下方文本') } catch { setMsg('请手动复制下方文本') }
  }

  return (
    <div>
      <div className="card">
        <div className="section-title"><h2>档案</h2><button className="btn sm" onClick={onEdit}>编辑</button></div>
        <p style={{ fontSize: 15, fontWeight: 600 }}>{SEX_LABEL[profile.sex]} · {age} 岁 · {profile.heightCm} cm · {profile.weightKg} kg</p>
        <p className="ink2 small">{profile.bodyFatPct ? `体脂 ${profile.bodyFatPct}% · ` : ''}BMI {b.toFixed(1)} {bmiLabel(b)} · {ACTIVITY_SHORT[profile.activity]}活动 · {GOAL_LABEL[profile.goal]} · {STYLE_LABEL[profile.dietStyle]} · {profile.mealsPerDay === 4 ? '三餐加一顿' : '三餐'}{profile.allergens.length ? ` · 不吃：${profile.allergens.map((a) => ALLERGEN_LABEL[a]).join('、')}` : ''}</p>
        <div className="divider" />
        <div className="kv"><span>基础代谢 BMR</span><span className="num">{targets.bmr} 千卡 <span className="muted small">({targets.method === 'katch' ? '按瘦体重' : '按身高体重'})</span></span></div>
        <div className="kv"><span>每日消耗 TDEE</span><span className="num">{targets.tdee} 千卡{state.settings.useAdaptiveTdee ? <span className="pill accent" style={{ marginLeft: 6 }}>按实际消耗</span> : null}</span></div>
        <div className="kv"><span>目标摄入</span><span className="num"><b>{targets.kcal}</b> 千卡</span></div>
        <div className="kv"><span>蛋白 / 脂肪 / 碳水</span><span className="num">{targets.protein} / {targets.fat} / {targets.carbs} g</span></div>
        {profile.conditions?.includes('hypertension')
          ? <div className="kv"><span>纤维 · 蔬菜 · 钠上限</span><span className="num">{targets.fiber} g · {targets.vegServings} 份 · {targets.sodiumMax} mg</span></div>
          : <div className="kv"><span>纤维 · 蔬菜</span><span className="num">{targets.fiber} g · {targets.vegServings} 份</span></div>}
        <div className="kv"><span>水果 · 奶类</span><span className="num">{targets.fruitG} g · {targets.dairyG} g</span></div>
      </div>

      <div className="card" id="modes-card">
        <div className="section-title"><h2>营养模式</h2>{(profile.conditions || []).length > 0 ? <span className="pill good">已开 {profile.conditions.length} 个</span> : <span className="pill">未开</span>}</div>
        <p className="small muted" style={{ marginBottom: 10 }}>{(profile.conditions || []).length ? '点一下即时生效，目标、推荐和分析都会跟着变。' : '孕期、高血压、糖尿病、健身增肌这类情况在这里勾选，点一下即时生效。'}</p>
        <ModesPicker sex={profile.sex} conditions={profile.conditions || []} trimester={profile.pregnancyTrimester} onChange={onSetConditions} />
        {targets.notes.length > 0 && <div style={{ marginTop: 10 }}><SignalChips notes={targets.notes} /></div>}
      </div>

      <div className="card">
        <h2>不想吃的菜</h2>
        {profile.dislikedDishes.length === 0 ? <p className="small muted">在推荐里点菜名旁的叉，以后就不再推荐它。</p> : (
          <div className="row wrap" style={{ gap: 6 }}>
            {profile.dislikedDishes.map((id) => <button key={id} className="chip" onClick={() => onUndislike(id)} aria-label={`恢复推荐 ${dishMap.get(id)?.name || id}`}>{dishMap.get(id)?.name || id} <IconClose size={12} /></button>)}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title"><h2>说一句话录餐</h2>{hasKey ? <span className="pill good">已启用 · {PROVIDER_LABEL[provider]}</span> : <span className="pill">未启用</span>}</div>
        <Bullets items={[
          { icon: <IconSparkle />, text: '一句话说吃了什么，模型对应到本地菜品库并估份量，营养仍由本地计算' },
          { icon: <IconLock />, text: 'key 只存这台设备，直连服务商，导出数据不带出' },
          { icon: <IconCoin />, text: '按次计费，一次几厘到几分钱' },
        ]} />
        <div className="seg" style={{ marginTop: 12 }}>
          {(['anthropic', 'deepseek'] as Provider[]).map((p) => (
            <button key={p} className={provider === p ? 'on' : ''} onClick={() => onSetProvider(p)}>{PROVIDER_LABEL[p]}{(p === 'deepseek' ? state.settings.deepseekKey : state.settings.anthropicKey) ? ' ●' : ''}</button>
          ))}
        </div>
        <Fold summary="费用与 key 从哪来">{PROVIDER_NOTE[provider]}</Fold>
        <div className="row" style={{ marginTop: 8 }}>
          <input className="input" type="password" autoComplete="off" placeholder={provider === 'deepseek' ? 'sk-...' : 'sk-ant-...'} value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)}
            style={{ flex: 1, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }} />
          <button className="btn primary" disabled={keyDraft.trim() === savedKey} onClick={() => onSetKey(provider, keyDraft)}>保存</button>
          {hasKey && <button className="btn danger sm" onClick={() => { onSetKey(provider, ''); setKeyDraft('') }}>清除</button>}
        </div>
      </div>

      {!isStandalone() && location.protocol !== 'file:' && (
        <div className="card">
          <div className="section-title"><h2>装到手机主屏幕</h2><span className="pill">离线可用</span></div>
          {canInstall ? (
            <div className="row">
              <p className="small ink2 grow">像 App 一样全屏打开，没网也能记。</p>
              <button className="btn primary sm" onClick={onInstall}>安装</button>
            </div>
          ) : isIOS() ? (
            <p className="small ink2">Safari 里点底部「分享」按钮，选「添加到主屏幕」。装好后从主屏幕图标打开，全屏且离线可用。</p>
          ) : (
            <p className="small ink2">Chrome 里点右上角菜单，选「安装应用」或「添加到主屏幕」。</p>
          )}
          <Fold summary="数据在哪、换手机怎么办、微信里打不开">
            <p>数据只存在这台设备的浏览器里，主屏幕图标和浏览器标签页共用同一份。换设备前在下方「数据」里导出，新设备导入即可。</p>
            <p>微信里收到的链接点右上角「···」选「在 Safari / 浏览器中打开」再安装；直接发 .html 文件给 iPhone 是打不开的，iOS 不允许本地文件运行网页应用。</p>
          </Fold>
        </div>
      )}

      <div className="card">
        <h2>数据</h2>
        <Stats items={[
          { label: '餐食记录', value: state.entries.length, unit: '条' },
          { label: '体重', value: state.weights.length, unit: '条' },
          { label: '自定义食物', value: state.customFoods.length, unit: '个' },
        ]} />
        <p className="tiny muted">只存这台设备的浏览器里，换设备前先导出。</p>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={() => { setIo('export'); copyExport() }}>导出</button>
          <button className="btn" onClick={() => { setIo('import'); setText(''); setMsg('') }}>导入</button>
          <span className="grow" />
          {!confirmReset ? <button className="btn danger sm" onClick={() => setConfirmReset(true)}>清空</button> : (
            <span className="row"><span className="small">确定清空全部？</span><button className="btn danger sm" onClick={() => { onReset(); setConfirmReset(false) }}>确定</button><button className="btn sm" onClick={() => setConfirmReset(false)}>取消</button></span>
          )}
        </div>
        {msg && <p className="small ink2" style={{ marginTop: 8 }}>{msg}</p>}
        {io !== 'none' && (
          <div className="stack" style={{ marginTop: 8 }}>
            <textarea className="json input" value={text} onChange={(e) => setText(e.target.value)} placeholder={io === 'import' ? '粘贴之前导出的 JSON' : ''} readOnly={io === 'export'} />
            {io === 'import' && <button className="btn primary" disabled={!text.trim()} onClick={doImport}>导入并覆盖当前数据</button>}
          </div>
        )}
      </div>

      <div className="card">
        <h2>关于</h2>
        <p className="small ink2">菜品营养由食材构成推导，推荐与分析全在本地，无账号；数值为估算，不构成医疗建议。</p>
        <Fold summary="数据来源与免责声明">
          <p>食材数据取自中国食物成分表与 USDA 常见值，属估算级精度。只有「说一句话录餐」在你填了 key 时才联网。</p>
          <p>肾病、进食障碍、未成年人以及任何在治疗中的疾病，请以医生或注册营养师的方案为准。</p>
        </Fold>
      </div>
    </div>
  )
}
