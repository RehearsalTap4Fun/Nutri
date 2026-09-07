import { useMemo, useState } from 'react'
import type { ActivityLevel, Allergen, DietStyle, Goal, Profile, Sex } from '../core/types'
import { ModesPicker } from './ModesPicker'
import { TargetBasis } from './Sources'
import { bmi, bmiLabel, computeTargets } from '../core/energy'
import { ACTIVITY_LABEL, ALLERGEN_LABEL, GOAL_LABEL, SEX_LABEL, STYLE_DESC, STYLE_LABEL } from './format'

const ALLERGENS: Allergen[] = ['seafood', 'peanut', 'nuts', 'dairy', 'gluten', 'egg', 'soy']

export function ProfileForm({ initial, onSave, onCancel }: { initial: Profile | null; onSave: (p: Profile) => void; onCancel?: () => void }) {
  const [p, setP] = useState<Profile>(initial || {
    sex: 'male', birthYear: 1990, heightCm: 172, weightKg: 68, bodyFatPct: undefined, activity: 'light', goal: 'maintain',
    dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: [],
  })
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => {
    const next = { ...x, [k]: v }
    // 切到男性时去掉孕期/哺乳期
    if (k === 'sex' && v === 'male') return { ...next, conditions: (next.conditions || []).filter((c) => c !== 'pregnancy' && c !== 'lactation'), pregnancyTrimester: undefined }
    return next
  })
  const valid = p.heightCm >= 120 && p.heightCm <= 230 && p.weightKg >= 30 && p.weightKg <= 250 && p.birthYear >= 1920 && p.birthYear <= new Date().getFullYear() - 10
  const preview = useMemo(() => (valid ? computeTargets(p) : null), [p, valid])
  const b = bmi(p.weightKg, p.heightCm)
  const conds = p.conditions || []

  return (
    <div className="onboard stack">
      <div>
        <h1>{initial ? '编辑档案' : '你好，先建个档案'}</h1>
        <p className="ink2">根据身体数据和目标算出每天该吃多少，推荐和分析都以此为准。</p>
      </div>

      <div className="card stack">
        <div className="field"><label>性别</label>
          <div className="seg">{(['male', 'female'] as Sex[]).map((s) => <button key={s} className={p.sex === s ? 'on' : ''} onClick={() => set('sex', s)}>{SEX_LABEL[s]}</button>)}</div>
        </div>
        <div className="grid2">
          <div className="field"><label>出生年份</label><input type="number" inputMode="numeric" value={p.birthYear} onChange={(e) => set('birthYear', Number(e.target.value))} /></div>
          <div className="field"><label>身高 cm</label><input type="number" inputMode="decimal" value={p.heightCm} onChange={(e) => set('heightCm', Number(e.target.value))} /></div>
          <div className="field"><label>体重 kg</label><input type="number" inputMode="decimal" step="0.1" value={p.weightKg} onChange={(e) => set('weightKg', Number(e.target.value))} /></div>
          <div className="field"><label>体脂率 %（可选，估算）</label><input type="number" inputMode="decimal" step="0.5" placeholder="不填则按身高体重估" value={p.bodyFatPct ?? ''} onChange={(e) => set('bodyFatPct', e.target.value === '' ? undefined : Number(e.target.value))} /></div>
        </div>
        {valid && <p className="small muted">BMI {b.toFixed(1)}，{bmiLabel(b)}。体脂率填了会用 Katch-McArdle 公式，通常更准。</p>}
      </div>

      <div className="card stack">
        <div className="field"><label>日常活动量</label>
          <select value={p.activity} onChange={(e) => set('activity', e.target.value as ActivityLevel)}>
            {(Object.keys(ACTIVITY_LABEL) as ActivityLevel[]).map((k) => <option key={k} value={k}>{ACTIVITY_LABEL[k]}</option>)}
          </select>
        </div>
        <div className="field"><label>目标</label>
          <div className="seg">{(['lose', 'maintain', 'gain'] as Goal[]).map((g) => <button key={g} className={p.goal === g ? 'on' : ''} onClick={() => set('goal', g)}>{GOAL_LABEL[g]}</button>)}</div>
        </div>
        <div className="field"><label>饮食风格</label>
          <select value={p.dietStyle} onChange={(e) => set('dietStyle', e.target.value as DietStyle)}>
            {(Object.keys(STYLE_LABEL) as DietStyle[]).map((k) => <option key={k} value={k}>{STYLE_LABEL[k]}</option>)}
          </select>
          <p className="small muted">{STYLE_DESC[p.dietStyle]}</p>
        </div>
        <div className="field"><label>每天餐次</label>
          <div className="seg">
            <button className={p.mealsPerDay === 3 ? 'on' : ''} onClick={() => set('mealsPerDay', 3)}>三餐</button>
            <button className={p.mealsPerDay === 4 ? 'on' : ''} onClick={() => set('mealsPerDay', 4)}>三餐 + 加餐</button>
          </div>
        </div>
        <div className="field"><label>过敏或不吃</label>
          <div className="row wrap">
            {ALLERGENS.map((a) => (
              <button key={a} className={`chip${p.allergens.includes(a) ? ' on' : ''}`} onClick={() => set('allergens', p.allergens.includes(a) ? p.allergens.filter((x) => x !== a) : [...p.allergens, a])}>{ALLERGEN_LABEL[a]}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card stack">
        <div>
          <h2 style={{ marginBottom: 2 }}>营养模式（可选）</h2>
          <p className="small muted">有特殊情况就勾上，目标、推荐和分析都会按对应指南调整；没有就跳过。</p>
        </div>
        <ModesPicker sex={p.sex} conditions={conds} trimester={p.pregnancyTrimester} onChange={(c, t) => setP((x) => ({ ...x, conditions: c, pregnancyTrimester: t }))} />
      </div>

      {preview && (
        <div className="card">
          <h2>每日目标预览</h2>
          <div className="kv"><span>基础代谢 BMR</span><span className="num">{preview.bmr} 千卡 <span className="muted small">({preview.method === 'katch' ? '按瘦体重' : '按身高体重'})</span></span></div>
          <div className="kv"><span>每日消耗 TDEE</span><span className="num">{preview.tdee} 千卡</span></div>
          <div className="kv"><span>目标摄入</span><span className="num"><b>{preview.kcal}</b> 千卡</span></div>
          <div className="kv"><span>蛋白 / 脂肪 / 碳水</span><span className="num">{preview.protein} / {preview.fat} / {preview.carbs} g</span></div>
          {conds.includes('hypertension')
            ? <div className="kv"><span>膳食纤维 · 蔬菜 · 钠上限</span><span className="num">{preview.fiber} g · {preview.vegServings} 份 · {preview.sodiumMax} mg</span></div>
            : <div className="kv"><span>膳食纤维 · 蔬菜</span><span className="num">{preview.fiber} g · {preview.vegServings} 份</span></div>}
          <div className="kv"><span>水果 · 奶类 · 饮水</span><span className="num">{preview.fruitG} g · {preview.dairyG} g · {preview.waterMl} ml</span></div>
          <TargetBasis profile={p} targets={preview} />
          {preview.notes.length > 0 && <div className="stack" style={{ gap: 6, marginTop: 10 }}>{preview.notes.map((n, i) => <div key={i} className="note">{n}</div>)}</div>}
        </div>
      )}

      <div className="row">
        {onCancel && <button className="btn" onClick={onCancel}>取消</button>}
        <button className="btn primary grow" disabled={!valid} onClick={() => onSave(p)}>{initial ? '保存' : '开始使用'}</button>
      </div>
      <p className="disclaimer">本工具的数值为估算，不构成医疗建议。肾病、进食障碍、未成年人以及任何在治疗中的疾病，请以医生或注册营养师的方案为准。</p>
    </div>
  )
}
