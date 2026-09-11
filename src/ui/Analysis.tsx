import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Dish, LogEntry, Profile, Targets, VitalEntry, WaterEntry, WeightEntry } from '../core/types'
import { avgWater } from '../core/water'
import type { Analysis, Finding } from '../core/analysis'
import { isHabitFinding, windowStats } from '../core/analysis'
import { macroKcalShare } from '../core/nutrition'
import { addDays, lastNDays, nowTimeStr, shortDate, todayStr, weekdayLabel } from '../core/dates'
import { BarChart, LineChart, Variance, VarianceAxis, type VarianceTone } from './charts'
import { r0, showsSodium } from './format'
import { IconAlert, IconCheck, IconChevron, IconClose, IconInfo } from './icons'
import { Fold, Legend, ProgressRow, ShareBar, Stats } from './bits'
import { TargetBasis } from './Sources'

export function AnalysisView({ analysis, targets, weights, entries, water = [], onAddWeight, useAdaptive, onToggleAdaptive, date, profile, dishMap, vitals = [], onAddVital, onRemoveVital }: {
  /** 血压 / 血糖记录（高血压、糖尿病模式下显示） */
  vitals?: VitalEntry[]
  onAddVital?: (v: Omit<VitalEntry, 'id'>) => void
  onRemoveVital?: (id: string) => void
  analysis: Analysis
  targets: Targets
  weights: WeightEntry[]
  entries: LogEntry[]
  water?: WaterEntry[]
  dishMap: Map<string, Dish>
  onAddWeight: (w: WeightEntry) => void
  useAdaptive: boolean
  onToggleAdaptive: (v: boolean) => void
  date: string
  profile: Profile
}) {
  const w = analysis.window
  const today = todayStr()
  const showNa = showsSodium(profile.conditions)
  const conds = profile.conditions || []
  const showBp = conds.includes('hypertension')
  const showGlucose = conds.includes('diabetes')
  const gdm = showGlucose && conds.includes('pregnancy')
  const bars = w.days.map((d) => ({
    label: d.date === today ? '今' : `周${weekdayLabel(d.date)}`,
    value: d.n.kcal,
    highlight: d.date === date,
    dim: !d.logged,
    tip: `${shortDate(d.date)}：${r0(d.n.kcal)} 千卡${d.logged ? '' : '（记录不全）'} · 蛋白 ${r0(d.n.protein)} g`,
  }))
  const share = macroKcalShare(w.avg)
  const k = w.loggedDays.length
  const [kg, setKg] = useState('')
  const [bf, setBf] = useState('')
  const recentWeights = weights.filter((x) => x.date >= addDays(today, -60))
  const ad = analysis.adaptive
  const latest = weights[weights.length - 1]
  const waterAvg = useMemo(() => avgWater(water, lastNDays(today, 7)), [water, today])
  const warn = analysis.findings.filter((f) => f.severity === 'warn' && (showNa || !f.key.startsWith('sodium_')))
  // 结论按宏量归位：挂到对应的条右侧；归不进去的是饮食习惯，单列
  const byMetric = useMemo(() => {
    const m: Record<string, Finding[]> = { kcal: [], protein: [], fat: [], sodium: [], veg: [], fiber: [], fruit: [], water: [] }
    const habits: Finding[] = []
    for (const f of analysis.findings) {
      const k = f.key
      if (k.startsWith('kcal_')) m.kcal.push(f)
      else if (k === 'protein_low' || k === 'protein_ok') m.protein.push(f)
      else if (k === 'fat_high') m.fat.push(f)
      else if (k.startsWith('sodium_')) m.sodium.push(f)
      else if (k.startsWith('veg_')) m.veg.push(f)
      else if (k === 'fiber_low') m.fiber.push(f)
      else if (k === 'fruit_low') m.fruit.push(f)
      else if (k.startsWith('water_')) m.water.push(f)
      else if (isHabitFinding(f)) habits.push(f)
    }
    return { m, habits }
  }, [analysis.findings])
  const cal = useMemo(() => {
    const w28 = windowStats(entries, dishMap, today, 28, targets.kcal)
    const days = w28.days.map((d) => {
      const status: 'hit' | 'miss' | 'none' = !d.logged ? 'none' : Math.abs(d.n.kcal - targets.kcal) <= targets.kcal * 0.1 ? 'hit' : 'miss'
      return { date: d.date, status, kcal: d.n.kcal, protein: d.n.protein }
    })
    let streak = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].status === 'hit') streak++
      else if (i === days.length - 1 && days[i].status === 'none') continue // 今天还没记完不算断
      else break
    }
    const hits = days.filter((d) => d.status === 'hit').length
    return { days, streak, hits }
  }, [entries, dishMap, today, targets.kcal])
  // 自适应消耗的三个门槛：近 4 周完整记录日 ≥10、体重 ≥3 次、体重跨度 ≥10 天
  const ready = useMemo(() => {
    const logged = cal.days.filter((d) => d.status !== 'none').length
    const ws = weights.filter((x) => x.date >= addDays(today, -28))
    const span = ws.length >= 2 ? Math.round((new Date(ws[ws.length - 1].date).getTime() - new Date(ws[0].date).getTime()) / 86400000) : 0
    return { logged, weights: ws.length, span }
  }, [cal, weights, today])

  return (
    <div>
      <div className="card">
        <div className="section-title"><h2>近 7 天热量</h2><span className="small muted">{k} 天有完整记录</span></div>
        <BarChart data={bars} target={targets.kcal} unit=" 千卡" />
        <Legend items={[{ swatch: 'land', label: '完整记录' }, { swatch: 'dim', label: '没记全，不计均值' }, { swatch: 'ink', label: '所选日期' }, { swatch: 'target', label: '目标' }]} />
      </div>

      <div className="card">
        <div className="section-title"><h2>近 4 周达标</h2><span className="small muted">{cal.streak > 0 ? `连续 ${cal.streak} 天` : '还没连上'} · 共 {cal.hits} 天</span></div>
        <div className="cal">
          {cal.days.map((d) => (
            <div key={d.date} className={`d ${d.status}${d.date === today ? ' today' : ''}`} title={`${shortDate(d.date)} ${d.status === 'none' ? '未记录' : `${Math.round(d.kcal)} 千卡`}`} />
          ))}
        </div>
        <div className="cal-legend"><span><i style={{ background: 'var(--land)' }} />热量在目标 ±10%</span><span><i style={{ background: 'var(--sun)' }} />有记录但偏离</span><span><i style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1.5px var(--hair)' }} />没记录</span></div>
      </div>

      <div className="card">
        <div className="section-title"><h2>日均 vs 目标</h2><span className="small muted">{k === 0 ? '' : warn.length ? `${warn.length} 项要改 · 点右侧标记看建议` : '都在范围内'}</span></div>
        {k === 0 ? <div className="empty small">还没有完整记录的日子</div> : (
          <>
            {/* 合适区间的宽度与 core/analysis 的判定阈值一致（热量 −20%/+10%，孕产期 −15%），柱色与右侧标记才不会自相矛盾 */}
            <VarianceAxis />
            <MetricRow findings={byMetric.m.kcal}><Variance label="热量" value={w.avg.kcal} target={targets.kcal} unit="kcal" color="var(--ring)" mode="near" tol={[(profile.conditions || []).some((c) => c === 'pregnancy' || c === 'lactation') ? 0.15 : 0.2, 0.1]} tone={sevOf(byMetric.m.kcal)} /></MetricRow>
            <MetricRow findings={byMetric.m.protein}><Variance label="蛋白" value={w.avg.protein} target={targets.protein} unit="g" color="var(--protein)" mode="atLeast" tol={0.15} tone={sevOf(byMetric.m.protein)} /></MetricRow>
            <MetricRow findings={byMetric.m.fat}><Variance label="脂肪" value={w.avg.fat} target={targets.fat} unit="g" color="var(--fat)" mode="atMost" tol={0.25} tone={sevOf(byMetric.m.fat)} /></MetricRow>
            <MetricRow findings={[]}><Variance label="碳水" value={w.avg.carbs} target={targets.carbs} unit="g" color="var(--carbs)" mode="atMost" tol={0.1} /></MetricRow>
            <MetricRow findings={byMetric.m.fiber}><Variance label="纤维" value={w.avg.fiber} target={targets.fiber} unit="g" color="var(--fiber)" mode="atLeast" tol={0.3} tone={sevOf(byMetric.m.fiber)} /></MetricRow>
            <MetricRow findings={byMetric.m.veg}><Variance label="蔬菜" value={w.avgVegServings} target={targets.vegServings} unit="份" color="var(--accent)" mode="atLeast" tol={0.4} tone={sevOf(byMetric.m.veg)} /></MetricRow>
            <MetricRow findings={byMetric.m.fruit}><Variance label="水果" value={w.avgFruitG} target={targets.fruitG} unit="g" color="var(--ink-2)" mode="atLeast" tol={Math.max(0.1, 1 - 100 / Math.max(1, targets.fruitG))} tone={sevOf(byMetric.m.fruit)} /></MetricRow>
            {showNa && <MetricRow findings={byMetric.m.sodium}><Variance label="钠" value={w.avg.sodium} target={targets.sodiumMax} unit="mg" color="var(--ink-2)" mode="atMost" tol={0.2} tone={sevOf(byMetric.m.sodium)} /></MetricRow>}
            {waterAvg.days > 0 && <MetricRow findings={byMetric.m.water}><Variance label="饮水" value={waterAvg.avg} target={targets.waterMl} unit="ml" color="var(--pond)" mode="atLeast" tol={0.3} tone={sevOf(byMetric.m.water)} /></MetricRow>}
            <Legend items={[{ swatch: 'shoal', label: '合适区间' }, { swatch: 'land', label: '达标' }, { swatch: 'sun', label: '要改' }]} />
            <ShareBar protein={share.protein} fat={share.fat} carbs={share.carbs} />
            <Fold summary="供能比参考范围">蛋白 15~25%、脂肪 25~35%、碳水 45~60%（中国居民膳食营养素参考摄入量 2023 版）。</Fold>
            <TargetBasis profile={profile} targets={targets} adaptive={useAdaptive} />
          </>
        )}
      </div>

      {byMetric.habits.length > 0 && (
        <div className="card">
          <div className="section-title"><h2>饮食习惯</h2><span className="small muted">近 7 天</span></div>
          <div>{byMetric.habits.map((f) => <FindingRow key={f.key} f={f} defaultOpen={f.severity === 'warn'} />)}</div>
        </div>
      )}

      <div className="card">
        <div className="section-title"><h2>体重与实际消耗</h2>{latest && <span className="small muted">最近 {latest.kg} kg · {shortDate(latest.date)}</span>}</div>
        <div className="row fields" style={{ marginBottom: 10 }}>
          <div className="field grow"><label>今日体重 kg</label><input className="input" type="number" inputMode="decimal" step="0.1" placeholder={latest ? String(latest.kg) : '例如 65.5'} value={kg} onChange={(e) => setKg(e.target.value)} /></div>
          <div className="field" style={{ width: 92 }}><label>体脂 %</label><input className="input" type="number" inputMode="decimal" step="0.5" placeholder="可选" value={bf} onChange={(e) => setBf(e.target.value)} /></div>
          <button className="btn primary" disabled={!(Number(kg) > 25)} onClick={() => { onAddWeight({ date: today, kg: Number(kg), bodyFatPct: bf ? Number(bf) : undefined }); setKg(''); setBf('') }}>记录</button>
        </div>
        {recentWeights.length > 0 ? <LineChart data={recentWeights.map((x) => ({ label: shortDate(x.date), value: x.kg, tip: `${shortDate(x.date)}：${x.kg} kg${x.bodyFatPct ? ` · 体脂 ${x.bodyFatPct}%` : ''}` }))} unit=" kg" /> : <p className="small muted">每周记 2~3 次早起空腹体重。</p>}
        <div className="divider" />
        {ad ? (
          <div className="stack" style={{ gap: 6 }}>
            <div className="kv"><span>实际日均摄入</span><span className="num">{ad.intakeAvg} 千卡</span></div>
            <div className="kv"><span>体重趋势</span><span className="num">{(ad.weightSlopePerDay * 7).toFixed(2)} kg / 周</span></div>
            <div className="kv"><span>反推实际消耗</span><span className="num"><b>{ad.tdee}</b> 千卡 <span className="muted small">(公式 {analysis.window ? targets.tdee : ''}，可信度{ad.confidence === 'high' ? '高' : ad.confidence === 'medium' ? '中' : '低'})</span></span></div>
            <p className="small ink2">{ad.note}</p>
            <label className="row small" style={{ gap: 8, marginTop: 4 }}>
              <input type="checkbox" checked={useAdaptive} onChange={(e) => onToggleAdaptive(e.target.checked)} />
              <span>用实际消耗替代公式来定每日目标{useAdaptive ? `（当前目标 ${targets.kcal} 千卡）` : ''}</span>
            </label>
          </div>
        ) : (
          <div>
            <p className="small ink2" style={{ marginBottom: 2 }}>凑齐这三条，就能反推你的真实消耗</p>
            <ProgressRow label="完整记录日" value={ready.logged} target={10} unit=" 天" />
            <ProgressRow label="体重记录" value={ready.weights} target={3} unit=" 次" />
            <ProgressRow label="体重跨度" value={ready.span} target={10} unit=" 天" />
            {!profile.bodyFatPct && <p className="tiny muted" style={{ marginTop: 4 }}>档案里填上体脂率，估算更准。</p>}
          </div>
        )}
      </div>

      {showBp && onAddVital && onRemoveVital && <VitalsCard kind="bp" vitals={vitals} onAdd={onAddVital} onRemove={onRemoveVital} gdm={false} />}
      {showGlucose && onAddVital && onRemoveVital && <VitalsCard kind="glucose" vitals={vitals} onAdd={onAddVital} onRemove={onRemoveVital} gdm={gdm} />}
    </div>
  )
}

/** 一条宏量条 + 右侧结论标记；点标记展开对应建议 */
/** 一组结论里最重的级别：要改 > 提示 > 良好；没有结论则 none */
function sevOf(findings: Finding[]): VarianceTone {
  return findings.length === 0 ? 'none' : findings.some((f) => f.severity === 'warn') ? 'warn' : findings.some((f) => f.severity === 'info') ? 'info' : 'good'
}

function MetricRow({ findings, children }: { findings: Finding[]; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const sev = sevOf(findings)
  return (
    <div className={`metric${open ? ' open' : ''}`}>
      {children}
      {/* 达标不放图标：绿柱已经说明了，右侧只留要改 / 提示两种需要点开看的 */}
      <button className={`metric-flag ${sev}`} disabled={sev === 'none' || sev === 'good'} aria-expanded={open} aria-label={findings[0] ? `${findings[0].title}，点开看建议` : undefined} onClick={() => setOpen(!open)}>
        {sev === 'good' ? <IconCheck size={12} /> : sev === 'warn' ? <IconAlert size={12} /> : sev === 'info' ? <IconInfo size={12} /> : null}
      </button>
      {open && findings.map((f) => (
        <div key={f.key} className="metric-detail"><div className="title">{f.title}</div><div className="num">{f.detail}</div><div className="action">{f.action}</div></div>
      ))}
    </div>
  )
}

/** 一条结构建议：要改的默认展开；其余只露标题和一句数据，点开才看做法 */
function FindingRow({ f, defaultOpen = false }: { f: Finding; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`finding${open ? ' open' : ''}`}>
      <span className={`ico ${f.severity}`} aria-label={f.severity === 'good' ? '良好' : f.severity === 'warn' ? '需注意' : '提示'}>{f.severity === 'good' ? <IconCheck /> : f.severity === 'warn' ? <IconAlert /> : <IconInfo />}</span>
      <div className="grow">
        <button className="finding-head" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="title">{f.title}</span>
          {!open && <span className="sub num">{f.detail}</span>}
          <IconChevron />
        </button>
        {open && (
          <>
            <div className="small ink2 num">{f.detail}</div>
            <div className="small action">{f.action}</div>
          </>
        )}
      </div>
    </div>
  )
}

type VitalStatus = { label: string; tone: 'good' | 'warn' | 'bad' }

/** 血压分级（成人家庭自测口径）：<130/80 达标；130~139/80~89 偏高；≥140/90 高 */
function bpStatus(sys: number, dia: number): VitalStatus {
  if (sys >= 140 || dia >= 90) return { label: '高', tone: 'bad' }
  if (sys >= 130 || dia >= 80) return { label: '偏高', tone: 'warn' }
  return { label: '达标', tone: 'good' }
}
/** 血糖：妊娠期按 空腹 ≤5.3 / 餐后 2h ≤6.7；2 型按 空腹 4.4~7.0 / 餐后 2h <10；<3.9 为偏低 */
function glucoseStatus(mmol: number, tag: VitalEntry['tag'], gdm: boolean): VitalStatus {
  if (mmol < 3.9) return { label: '偏低', tone: 'warn' }
  const hi = tag === 'fasting' ? (gdm ? 5.3 : 7.0) : (gdm ? 6.7 : 10.0)
  if (mmol > hi) return { label: '偏高', tone: 'bad' }
  return { label: '达标', tone: 'good' }
}

/** 血压 / 血糖记录卡：输入、近 7 条、7 天概览与趋势线 */
function VitalsCard({ kind, vitals, onAdd, onRemove, gdm }: { kind: 'bp' | 'glucose'; vitals: VitalEntry[]; onAdd: (v: Omit<VitalEntry, 'id'>) => void; onRemove: (id: string) => void; gdm: boolean }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [tag, setTag] = useState<'fasting' | 'post2h'>('fasting')
  const today = todayStr()
  const list = vitals.filter((v) => v.kind === kind).sort((x, y) => (y.date + (y.time || '')).localeCompare(x.date + (x.time || '')))
  const recent = list.filter((v) => v.date >= addDays(today, -7))
  const isBp = kind === 'bp'
  const status = (v: VitalEntry): VitalStatus => (isBp ? bpStatus(v.sys || 0, v.dia || 0) : glucoseStatus(v.mmol || 0, v.tag, gdm))
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null)
  const summary = isBp
    ? [{ label: '7 天平均收缩压', value: avg(recent.map((v) => v.sys || 0)) ?? '—', unit: 'mmHg' }, { label: '舒张压', value: avg(recent.map((v) => v.dia || 0)) ?? '—', unit: 'mmHg' }, { label: '记录', value: recent.length, unit: '次' }]
    : [{ label: '7 天空腹均值', value: avg(recent.filter((v) => v.tag === 'fasting').map((v) => v.mmol || 0)) ?? '—', unit: 'mmol/L' }, { label: '餐后 2h 均值', value: avg(recent.filter((v) => v.tag === 'post2h').map((v) => v.mmol || 0)) ?? '—', unit: 'mmol/L' }, { label: '记录', value: recent.length, unit: '次' }]
  const valid = isBp ? Number(a) >= 60 && Number(a) <= 260 && Number(b) >= 30 && Number(b) <= 160 : Number(a) >= 1 && Number(a) <= 35
  const submit = () => {
    if (!valid) return
    onAdd(isBp ? { kind, date: today, time: nowTimeStr(), sys: Number(a), dia: Number(b) } : { kind, date: today, time: nowTimeStr(), mmol: Number(a), tag })
    setA(''); setB('')
  }
  const series = [...list].reverse().slice(-14).map((v) => ({ label: shortDate(v.date), value: isBp ? (v.sys || 0) : (v.mmol || 0), tip: isBp ? `${shortDate(v.date)} ${v.time || ''}：${v.sys}/${v.dia}` : `${shortDate(v.date)} ${v.time || ''}：${v.mmol} mmol/L${v.tag === 'fasting' ? ' 空腹' : v.tag === 'post2h' ? ' 餐后 2h' : ''}` }))
  return (
    <div className="card">
      <div className="section-title"><h2>{isBp ? '血压' : '血糖'}</h2><span className="small muted">{isBp ? '高血压模式' : gdm ? '妊娠期糖尿病口径' : '糖尿病模式'}</span></div>
      <div className="row fields" style={{ marginBottom: 8 }}>
        {isBp ? (
          <>
            <div className="field grow"><label>收缩压 mmHg</label><input className="input" type="number" inputMode="numeric" placeholder="120" value={a} onChange={(e) => setA(e.target.value)} /></div>
            <div className="field grow"><label>舒张压 mmHg</label><input className="input" type="number" inputMode="numeric" placeholder="80" value={b} onChange={(e) => setB(e.target.value)} /></div>
          </>
        ) : (
          <>
            <div className="field grow"><label>血糖 mmol/L</label><input className="input" type="number" inputMode="decimal" step="0.1" placeholder="5.6" value={a} onChange={(e) => setA(e.target.value)} /></div>
            <div className="field" style={{ minWidth: 150 }}><label>时段</label>
              <div className="seg seg-sm"><button className={tag === 'fasting' ? 'on' : ''} onClick={() => setTag('fasting')}>空腹</button><button className={tag === 'post2h' ? 'on' : ''} onClick={() => setTag('post2h')}>餐后 2h</button></div>
            </div>
          </>
        )}
        <button className="btn primary" disabled={!valid} onClick={submit}>记录</button>
      </div>
      {recent.length > 0 && <Stats dense items={summary} />}
      {series.length >= 2 && <LineChart data={series} unit={isBp ? ' mmHg' : ' mmol/L'} />}
      {list.length === 0 ? <p className="small muted">{isBp ? '早晚各测一次，坐着休息 5 分钟后再测。' : gdm ? '空腹与三餐后 2 小时各测一次。' : '空腹与餐后 2 小时各测一次，记几天就能看出规律。'}</p> : (
        <div className="list" style={{ marginTop: 6 }}>
          {list.slice(0, 7).map((v) => {
            const st = status(v)
            return (
              <div key={v.id} className="list-item">
                <div className="grow row" style={{ gap: 8 }}>
                  <span className="small muted num" style={{ minWidth: 86 }}>{shortDate(v.date)} {v.time || ''}</span>
                  <span className="num" style={{ fontWeight: 700 }}>{isBp ? `${v.sys}/${v.dia}` : `${v.mmol}`}</span>
                  {!isBp && <span className="tiny muted">{v.tag === 'fasting' ? '空腹' : v.tag === 'post2h' ? '餐后 2h' : ''}</span>}
                  <span className={`pill ${st.tone}`}>{st.label}</span>
                </div>
                <button className="btn ghost sm row-del" onClick={() => onRemove(v.id)} aria-label="删除这条记录"><IconClose size={14} /></button>
              </div>
            )
          })}
        </div>
      )}
      <p className="tiny muted" style={{ marginTop: 8 }}>分级只是帮你看趋势，用药与目标以医生方案为准。</p>
    </div>
  )
}
