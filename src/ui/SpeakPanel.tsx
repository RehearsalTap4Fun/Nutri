import { useEffect, useState } from 'react'
import type { Dish, LogEntry, MealSlot } from '../core/types'
import { MEAL_SLOTS } from '../core/types'
import { scale, sum, servingGrams } from '../core/nutrition'
import { PROVIDER_LABEL } from '../llm/mealParser'
import type { LlmConfig, ParsedItem, SpeakJob } from '../llm/mealParser'
import type { CustomFood } from '../store/storage'
import { uid } from '../store/storage'
import { SLOT_LABEL, portionText, r0 } from './format'
import { Bullets } from './bits'
import { IconClose, IconCoin, IconLock, IconSparkle } from './icons'

const EXAMPLES = ['中午吃了一碗兰州拉面加个卤蛋', '早上豆浆油条，还喝了杯拿铁', '晚饭半碗米饭、番茄炒蛋、清炒西兰花，一碗紫菜蛋花汤', '下午喝了杯珍珠奶茶']

export function SpeakPanel({ llm, date, isToday, now, defaultSlot, dishMap, job, onStart, onConsume, onSave, onNeedKey, onBack }: {
  llm: LlmConfig
  date: string
  isToday: boolean
  now: string
  defaultSlot: MealSlot
  dishes: Dish[]
  dishMap: Map<string, Dish>
  /** 当前这台设备上唯一在跑（或跑完待处理）的说一句话任务，null 就是还没开始 */
  job: SpeakJob | null
  /** 发起解析：调用方（App）在后台跑，跑完前弹窗随时可以关 */
  onStart: (text: string, slot: MealSlot, time: string) => void
  /** 这个任务已经处理完（记录了或明确放弃），可以清掉了 */
  onConsume: () => void
  onSave: (entries: LogEntry[], customFoods: CustomFood[]) => void
  onNeedKey: () => void
  onBack: () => void
}) {
  const [text, setText] = useState(job?.text ?? '')
  const [slot, setSlot] = useState<MealSlot>(job?.slot ?? defaultSlot)
  const [time, setTime] = useState<string>(job?.time ?? now)
  const [items, setItems] = useState<ParsedItem[]>(job?.status === 'done' ? job.result.items : [])

  // 任务从「跑着」变成「跑完」时，把结果同步进本地可编辑状态；弹窗全程开着等结果时会走到这里
  useEffect(() => {
    if (job?.status === 'done') {
      setItems(job.result.items)
      if (job.result.slot) setSlot(job.result.slot)
      if (job.result.time) setTime(job.result.time)
    }
  }, [job])

  const start = () => {
    if (!text.trim()) return
    onStart(text, slot, time)
  }
  const retry = () => { if (job) onStart(job.text, job.slot, job.time) }
  const editAgain = () => { onConsume() }

  const setPortion = (i: number, p: number) => setItems(items.map((it, k) => (k === i ? { ...it, portion: Math.max(0.25, Math.min(6, p)) } : it)))
  const remove = (i: number) => setItems(items.filter((_, k) => k !== i))
  const totals = sum(items.map((it) => scale(it.perServing, it.portion)))

  const save = () => {
    const logDate = job?.status === 'done' ? job.date : date
    const customFoods: CustomFood[] = []
    const entries: LogEntry[] = items.map((it) => {
      if (it.dishId) return { id: uid(), date: logDate, slot, time, dishId: it.dishId, portion: it.portion }
      const extra = { ...(it.vegG ? { vegG: it.vegG } : {}), ...(it.fruitG ? { fruitG: it.fruitG } : {}) }
      const food: CustomFood = { id: uid(), name: it.name, serving: '1份(估算)', nutrients: it.perServing, ...extra }
      if (it.perServing.kcal > 0) customFoods.push(food)
      return { id: uid(), date: logDate, slot, time, portion: it.portion, custom: { name: it.name, nutrients: it.perServing, ...extra } }
    })
    onConsume()
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

  if (!job) {
    return (
      <div className="card stack">
        <h2>说一句话就能记</h2>
        <textarea className="speak" rows={3} placeholder="比如：中午吃了一碗兰州拉面加个卤蛋" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <div className="chips">
          {EXAMPLES.map((ex) => <button key={ex} className="chip" onClick={() => setText(ex)}>{ex}</button>)}
        </div>
        <div className="row">
          <button className="btn" onClick={onBack}>返回</button>
          <button className="btn primary grow" disabled={!text.trim()} onClick={start}>解析</button>
        </div>
      </div>
    )
  }

  if (job.status === 'running') {
    return (
      <div className="card stack">
        <h2>解析中…</h2>
        <p className="small muted">「{job.text}」</p>
        <p className="tiny muted">可能要几秒到十几秒，关掉这个弹窗去别的页面也没事，跑完了会提示，随时回来看结果或记为已吃。</p>
        <div className="row">
          <button className="btn primary grow" onClick={onBack}>先去做别的</button>
        </div>
      </div>
    )
  }

  if (job.status === 'error') {
    return (
      <div className="card stack">
        <h2>解析失败</h2>
        <p className="small muted">「{job.text}」</p>
        <p className="small" style={{ color: 'var(--bad-text)' }}>{job.error}</p>
        <div className="row">
          <button className="btn" onClick={editAgain}>改一改再试</button>
          <button className="btn primary grow" onClick={retry}>重试</button>
        </div>
        <button className="btn ghost sm" onClick={onBack}>关闭（保留这次结果，之后还能看）</button>
      </div>
    )
  }

  return (
    <>
      <div className="card stack">
        <div className="row between">
          <h2>识别结果</h2>
          <button className="btn ghost sm" onClick={editAgain}>改一改再解析</button>
        </div>
        <p className="small muted">「{job.text}」</p>
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
                  <span className="val num">{portionText(it.portion, it.dishId ? servingGrams(dishMap.get(it.dishId)!) : undefined)}</span>
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
        <div className="note">合计 <b>{r0(totals.kcal)}</b> 千卡 · 蛋白 {r0(totals.protein)} g · 脂肪 {r0(totals.fat)} g · 碳水 {r0(totals.carbs)} g · 纤维 {r0(totals.fiber)} g</div>
        {!isToday && job.date !== date && <p className="small" style={{ color: 'var(--bad-text)' }}>会记到 {job.date}（发起解析时看的那天），不是当前正看的这天。</p>}
        <p className="tiny muted">本次 {PROVIDER_LABEL[llm.provider]} ({job.result.model}) · 输入 {job.result.usage.input + job.result.usage.cacheRead + job.result.usage.cacheWrite} / 输出 {job.result.usage.output} token · 约 ${job.result.usage.usd.toFixed(3)}</p>
      </div>
      <div className="row">
        <button className="btn" onClick={onBack}>关闭（先不记，保留结果）</button>
        <button className="btn primary grow" disabled={items.length === 0} onClick={save}>记录 {items.length} 条</button>
      </div>
    </>
  )
}
