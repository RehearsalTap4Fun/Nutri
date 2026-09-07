import { useState } from 'react'
import type { Dish, LogEntry, MealSlot } from '../core/types'
import { MEAL_SLOTS } from '../core/types'
import { scale, sum } from '../core/nutrition'
import { parseMealText, MealParseError, PROVIDER_LABEL } from '../llm/mealParser'
import type { LlmConfig, ParseResult, ParsedItem } from '../llm/mealParser'
import type { CustomFood } from '../store/storage'
import { uid } from '../store/storage'
import { SLOT_LABEL, portionLabel, r0 } from './format'
import { Bullets } from './bits'
import { IconClose, IconCoin, IconLock, IconSparkle } from './icons'

const EXAMPLES = ['中午吃了一碗兰州拉面加个卤蛋', '早上豆浆油条，还喝了杯拿铁', '晚饭半碗米饭、番茄炒蛋、清炒西兰花，一碗紫菜蛋花汤', '下午喝了杯珍珠奶茶']

export function SpeakPanel({ llm, date, isToday, now, defaultSlot, dishes, dishMap, onSave, onNeedKey, onBack }: {
  llm: LlmConfig
  date: string
  isToday: boolean
  now: string
  defaultSlot: MealSlot
  dishes: Dish[]
  dishMap: Map<string, Dish>
  onSave: (entries: LogEntry[], customFoods: CustomFood[]) => void
  onNeedKey: () => void
  onBack: () => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<ParseResult | null>(null)
  const [items, setItems] = useState<ParsedItem[]>([])
  const [slot, setSlot] = useState<MealSlot>(defaultSlot)
  const [time, setTime] = useState<string>(now)

  const run = async () => {
    if (!text.trim()) return
    setBusy(true)
    setErr(null)
    try {
      const r = await parseMealText(llm, text, dishes, dishMap, { date, now })
      setResult(r)
      setItems(r.items)
      if (r.slot) setSlot(r.slot)
      if (r.time) setTime(r.time)
      else if (!isToday) setTime(defaultTime(r.slot || slot))
      if (!r.items.length) setErr('没有识别出食物，换个说法试试')
    } catch (e) {
      setErr(e instanceof MealParseError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const setPortion = (i: number, p: number) => setItems(items.map((it, k) => (k === i ? { ...it, portion: Math.max(0.25, Math.min(6, p)) } : it)))
  const remove = (i: number) => setItems(items.filter((_, k) => k !== i))
  const totals = sum(items.map((it) => scale(it.perServing, it.portion)))

  const save = () => {
    const customFoods: CustomFood[] = []
    const entries: LogEntry[] = items.map((it) => {
      if (it.dishId) return { id: uid(), date, slot, time, dishId: it.dishId, portion: it.portion }
      const food: CustomFood = { id: uid(), name: it.name, serving: '1份(估算)', nutrients: it.perServing }
      if (it.perServing.kcal > 0) customFoods.push(food)
      return { id: uid(), date, slot, time, portion: it.portion, custom: { name: it.name, nutrients: it.perServing } }
    })
    onSave(entries, customFoods)
  }

  if (!llm.apiKey) {
    return (
      <div className="card stack">
        <h2>说一句话就能记</h2>
        <Bullets items={[
          { icon: <IconSparkle />, text: '一句话发给 Claude 或 DeepSeek，对应到本地菜品库并估份量，营养仍由本地计算' },
          { icon: <IconLock />, text: '要用你自己的 API key，只存这台设备，直连接口' },
          { icon: <IconCoin />, text: '每次解析几厘到几分钱' },
        ]} />
        <div className="row">
          <button className="btn" onClick={onBack}>返回</button>
          <button className="btn primary grow" onClick={onNeedKey}>去填写 API key</button>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      {!result && (
        <div className="card stack">
          <h2>说一句话就能记</h2>
          <textarea className="speak" rows={3} placeholder="比如：中午吃了一碗兰州拉面加个卤蛋" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          <div className="chips">
            {EXAMPLES.map((ex) => <button key={ex} className="chip" onClick={() => setText(ex)}>{ex}</button>)}
          </div>
          {err && <p className="small" style={{ color: 'var(--bad-text)' }}>{err}</p>}
          <div className="row">
            <button className="btn" onClick={onBack}>返回</button>
            <button className="btn primary grow" disabled={busy || !text.trim()} onClick={run}>{busy ? '解析中…' : '解析'}</button>
          </div>
        </div>
      )}

      {result && (
        <>
          <div className="card stack">
            <div className="row between">
              <h2>识别结果</h2>
              <button className="btn ghost sm" onClick={() => { setResult(null); setErr(null) }}>改一改再解析</button>
            </div>
            <p className="small muted">「{text}」</p>
            <div className="list">
              {items.map((it, i) => {
                const n = scale(it.perServing, it.portion)
                return (
                  <div key={i} className="list-item">
                    <div className="grow">
                      <div className="ellipsis">{it.name} {it.matched ? <span className="pill good">库内</span> : <span className="pill warn">估算</span>}</div>
                      <div className="tiny muted">{r0(n.kcal)} 千卡 · 蛋白 {r0(n.protein)} g · 脂肪 {r0(n.fat)} g · 碳水 {r0(n.carbs)} g{it.note ? ` · ${it.note}` : ''}</div>
                    </div>
                    <div className="stepper" style={{ transform: 'scale(.85)' }}>
                      <button onClick={() => setPortion(i, it.portion - 0.25)}>−</button>
                      <span className="val num">{portionLabel(it.portion)}</span>
                      <button onClick={() => setPortion(i, it.portion + 0.25)}>+</button>
                    </div>
                    <button className="btn ghost sm" onClick={() => remove(i)} aria-label="删除"><IconClose /></button>
                  </div>
                )
              })}
              {items.length === 0 && <div className="empty small">没有可记录的条目</div>}
            </div>
            <div className="grid2 slot-time">
              <div className="field"><label>餐次</label>
                <div className="seg">{MEAL_SLOTS.map((s) => <button key={s} className={slot === s ? 'on' : ''} onClick={() => setSlot(s)}>{SLOT_LABEL[s]}</button>)}</div>
              </div>
              <div className="field"><label>时间</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
            </div>
            <div className="note">合计 <b>{r0(totals.kcal)}</b> 千卡 · 蛋白 {r0(totals.protein)} g · 脂肪 {r0(totals.fat)} g · 碳水 {r0(totals.carbs)} g</div>
            {err && <p className="small" style={{ color: 'var(--bad-text)' }}>{err}</p>}
            <p className="tiny muted">本次 {PROVIDER_LABEL[llm.provider]} ({result.model}) · 输入 {result.usage.input + result.usage.cacheRead + result.usage.cacheWrite} / 输出 {result.usage.output} token · 约 ${result.usage.usd.toFixed(3)}</p>
          </div>
          <div className="row">
            <button className="btn" onClick={onBack}>取消</button>
            <button className="btn primary grow" disabled={items.length === 0} onClick={save}>记录 {items.length} 条</button>
          </div>
        </>
      )}
    </div>
  )
}

function defaultTime(slot: MealSlot): string {
  return { breakfast: '08:00', lunch: '12:30', dinner: '18:30', snack: '15:30' }[slot]
}
