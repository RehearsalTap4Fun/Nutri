import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Dish, DishCategory, LogEntry, MealSlot, Nutrients } from '../core/types'
import { MEAL_SLOTS } from '../core/types'
import { canLowOil, canLowSalt, dishNutrients, dishNutrientsFor, dishWeight, scale, vegGrams } from '../core/nutrition'
import { INGREDIENTS, INGREDIENT_MAP } from '../data/ingredients'
import type { Ingredient } from '../core/types'
import type { CustomFood } from '../store/storage'
import { uid } from '../store/storage'
import { nowTimeStr } from '../core/dates'
import { CAT_LABEL, COOK_LABEL, CUISINE_LABEL, SLOT_LABEL, defaultTimeForSlot, portionLabel, r0 } from './format'
import { SpeakPanel } from './SpeakPanel'
import { ScanPanel } from './ScanPanel'
import { IconScan, IconSparkle, IconStar, IconClose } from './icons'
import { Stats } from './bits'
import type { LlmConfig } from '../llm/mealParser'
import { searchFoods, type FoodPick } from './foodSearch'

export type LogSheetResult =
  | { kind: 'save'; entry: LogEntry }
  | { kind: 'saveMany'; entries: LogEntry[]; customFoods: CustomFood[] }
  | { kind: 'delete'; id: string }
  | { kind: 'needKey' }
  | { kind: 'close' }

type Pick = FoodPick

const CAT_CHIPS: Array<DishCategory | 'all'> = ['all', 'staple', 'protein', 'veg', 'soup', 'breakfast', 'combo', 'snack', 'fruit', 'drink']

export function LogSheet({ showSodium = false, date, isToday, slot: initialSlot, editing, dishes, dishMap, customFoods, favorites, recentBySlot, onResult, onAddCustomFood, onAddCustomDish, onToggleFavorite, llm, defaultLowSalt = false }: {
  defaultLowSalt?: boolean
  /** 只有高血压模式显示钠 */
  showSodium?: boolean
  date: string
  isToday: boolean
  slot: MealSlot
  llm: LlmConfig
  editing?: LogEntry
  dishes: Dish[]
  dishMap: Map<string, Dish>
  customFoods: CustomFood[]
  favorites: string[]
  /** 各餐次的常吃菜 id；默认列表跟着当前选中的餐次变 */
  recentBySlot: Partial<Record<MealSlot, string[]>>
  onResult: (r: LogSheetResult) => void
  onAddCustomFood: (f: CustomFood) => void
  onAddCustomDish: (d: Dish) => void
  onToggleFavorite: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<DishCategory | 'all'>('all')
  const [pick, setPick] = useState<Pick | null>(() => {
    if (!editing) return null
    if (editing.custom) return { kind: 'custom', food: { id: 'edit', name: editing.custom.name, serving: '1份', nutrients: editing.custom.nutrients } }
    const d = editing.dishId ? dishMap.get(editing.dishId) : undefined
    return d ? { kind: 'dish', dish: d } : null
  })
  const [portion, setPortion] = useState(editing?.portion ?? 1)
  const [byGram, setByGram] = useState(false)
  const [slot, setSlot] = useState<MealSlot>(editing?.slot ?? initialSlot)
  const [time, setTime] = useState(editing?.time ?? (isToday ? nowTimeStr() : defaultTimeForSlot(initialSlot)))
  const [showCustom, setShowCustom] = useState(false)
  const [speak, setSpeak] = useState(false)
  const [scan, setScan] = useState(false)
  const [customBarcode, setCustomBarcode] = useState<string | undefined>(undefined)
  const [lowSalt, setLowSalt] = useState<boolean>(editing ? !!editing.lowSalt : defaultLowSalt)
  const [lowOil, setLowOil] = useState<boolean>(editing ? !!editing.lowOil : false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // 拖拽手柄下拉关闭（vaul 式手感的简化版）
  const sheetRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y0: number; dy: number; t0: number } | null>(null)
  const onGrabStart = (e: React.TouchEvent) => {
    drag.current = { y0: e.touches[0].clientY, dy: 0, t0: Date.now() }
    sheetRef.current?.classList.add('dragging')
    sheetRef.current?.classList.remove('settle')
  }
  const onGrabMove = (e: React.TouchEvent) => {
    if (!drag.current || !sheetRef.current) return
    drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.y0)
    sheetRef.current.style.transform = `translateY(${drag.current.dy}px)`
  }
  const onGrabEnd = () => {
    const el = sheetRef.current
    if (!drag.current || !el) return
    const { dy, t0 } = drag.current
    const v = dy / Math.max(1, Date.now() - t0)
    drag.current = null
    el.classList.remove('dragging')
    el.classList.add('settle')
    if (dy > 120 || v > 0.6) {
      el.style.transform = 'translateY(105%)'
      window.setTimeout(() => onResult({ kind: 'close' }), 260)
    } else {
      el.style.transform = ''
    }
  }

  const recentDishIds = recentBySlot[slot] || []
  const results = useMemo(() => searchFoods(q, cat, dishes, customFoods, favorites, recentDishIds, dishMap), [q, cat, dishes, customFoods, favorites, recentDishIds, dishMap])

  const lowSaltable = pick?.kind === 'dish' && canLowSalt(pick.dish)
  const lowOilable = pick?.kind === 'dish' && canLowOil(pick.dish)
  const perServing: Nutrients | null = pick ? (pick.kind === 'dish' ? dishNutrientsFor(pick.dish, { lowSalt: lowSaltable && lowSalt, lowOil: lowOilable && lowOil }) : pick.food.nutrients) : null
  const weight = pick?.kind === 'dish' ? dishWeight(pick.dish) : 0
  const now = perServing ? scale(perServing, portion) : null

  const save = () => {
    if (!pick) return
    const entry: LogEntry = {
      id: editing?.id || '',
      date, slot, time: time || undefined, portion,
      ...(pick.kind === 'dish' ? { dishId: pick.dish.id, ...(lowSaltable && lowSalt ? { lowSalt: true } : {}), ...(lowOilable && lowOil ? { lowOil: true } : {}) } : { custom: { name: pick.food.name, nutrients: pick.food.nutrients } }),
    }
    onResult({ kind: 'save', entry })
  }

  return (
    <div className="sheet-bg" onClick={() => onResult({ kind: 'close' })}>
      <div className="sheet" ref={sheetRef} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" onTouchStart={onGrabStart} onTouchMove={onGrabMove} onTouchEnd={onGrabEnd} onTouchCancel={onGrabEnd}>
          <div className="sheet-handle" />
        </div>
        {!pick && !showCustom && !editing && (
          <div className="seg" style={{ alignSelf: 'stretch' }}>
            <button className={!speak && !scan ? 'on' : ''} onClick={() => { setSpeak(false); setScan(false) }}>搜菜名</button>
            <button className={speak ? 'on' : ''} onClick={() => { setSpeak(true); setScan(false) }}>说一句话 <IconSparkle /></button>
            <button className={scan ? 'on' : ''} onClick={() => { setScan(true); setSpeak(false) }}>扫码 <IconScan size={14} /></button>
          </div>
        )}

        {scan && !pick && !showCustom && (
          <ScanPanel customFoods={customFoods} onAddCustomFood={onAddCustomFood} onPick={(f) => { setPick({ kind: 'custom', food: f }); setScan(false) }}
            onManual={(code) => { setCustomBarcode(code); setShowCustom(true) }} onBack={() => onResult({ kind: 'close' })} />
        )}

        {speak && !scan && !pick && !showCustom && (
          <SpeakPanel llm={llm} date={date} isToday={isToday} now={isToday ? nowTimeStr() : defaultTimeForSlot(initialSlot)} defaultSlot={initialSlot}
            dishes={dishes} dishMap={dishMap} onSave={(entries, foods) => onResult({ kind: 'saveMany', entries, customFoods: foods })}
            onNeedKey={() => onResult({ kind: 'needKey' })} onBack={() => onResult({ kind: 'close' })} />
        )}

        {!speak && !scan && !pick && !showCustom && (
          <>
            <div className="search">
              <input autoFocus placeholder="搜菜名，如 番茄炒蛋、拉面、拿铁" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn" onClick={() => onResult({ kind: 'close' })}>取消</button>
            </div>
            <div className="chips">
              {CAT_CHIPS.map((c) => <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>{c === 'all' ? '全部' : CAT_LABEL[c]}</button>)}
            </div>
            <div className="card" style={{ padding: '4px 14px' }}>
              {!q && cat === 'all' && results.length > 0 && <div className="slot-head"><span>{SLOT_LABEL[slot]}常吃 / 收藏</span></div>}
              <div className="list">
                {results.map((r) => {
                  if (r.kind === 'custom') {
                    return (
                      <div key={'c' + r.food.id} className="list-item tap" onClick={() => setPick(r)}>
                        <div className="grow"><div className="ellipsis">{r.food.name} <span className="pill">自定义</span></div><div className="tiny muted">{r.food.serving}</div></div>
                        <div className="num ink2">{r0(r.food.nutrients.kcal)}</div>
                      </div>
                    )
                  }
                  const n = dishNutrients(r.dish)
                  return (
                    <div key={r.dish.id} className="list-item tap" onClick={() => setPick(r)}>
                      <div className="grow">
                        <div className="ellipsis">{r.dish.name}{favorites.includes(r.dish.id) && <span className="fav-mark"><IconStar filled size={12} /></span>}</div>
                        <div className="tiny muted">{r.dish.serving} · {CUISINE_LABEL[r.dish.cuisine]} · {COOK_LABEL[r.dish.cook]} · 蛋白 {r0(n.protein)} g</div>
                      </div>
                      <div className="num ink2">{r0(n.kcal)}</div>
                    </div>
                  )
                })}
                {results.length === 0 && <div className="empty small">没找到「{q}」，可以自定义录入</div>}
              </div>
            </div>
            <button className="btn" onClick={() => setShowCustom(true)}>找不到？自定义录入营养值</button>
          </>
        )}

        {showCustom && !pick && (
          <CustomForm barcode={customBarcode} onDoneDish={(d) => { onAddCustomDish(d); setPick({ kind: 'dish', dish: d }); setShowCustom(false); setCustomBarcode(undefined) }} onCancel={() => { setShowCustom(false); setCustomBarcode(undefined) }} onDone={(f) => { onAddCustomFood(f); setPick({ kind: 'custom', food: f }); setShowCustom(false); setCustomBarcode(undefined) }} />
        )}

        {pick && perServing && now && (
          <>
            <div className="row between">
              <div>
                <h2>{pick.kind === 'dish' ? pick.dish.name : pick.food.name}</h2>
                <p className="small muted">每份 {pick.kind === 'dish' ? pick.dish.serving : pick.food.serving}</p>
              </div>
              {pick.kind === 'dish' && <button className="btn ghost" onClick={() => onToggleFavorite(pick.dish.id)} aria-label={favorites.includes(pick.dish.id) ? '取消收藏' : '收藏'} aria-pressed={favorites.includes(pick.dish.id)}><IconStar filled={favorites.includes(pick.dish.id)} size={20} /></button>}
            </div>

            <div className="card stack">
              <div className="field"><label>份量</label>
                <div className="row wrap">
                  <div className="stepper">
                    <button onClick={() => setPortion(Math.max(0.25, portion - 0.25))}>−</button>
                    <span className="val num">{portionLabel(portion)}</span>
                    <button onClick={() => setPortion(Math.min(6, portion + 0.25))}>+</button>
                  </div>
                  <div className="row wrap" style={{ gap: 4 }}>
                    {[0.5, 1, 1.5, 2].map((v) => <button key={v} className={`chip${portion === v && !byGram ? ' on' : ''}`} onClick={() => { setByGram(false); setPortion(v) }}>{portionLabel(v)}</button>)}
                    {weight > 0 && <button className={`chip${byGram ? ' on' : ''}`} aria-pressed={byGram} onClick={() => setByGram(!byGram)}>按克</button>}
                  </div>
                </div>
                {weight > 0 && (
                  <div className="row small muted" style={{ marginTop: 4 }}>
                    <span>≈ {r0(weight * portion)} g</span>
                    {byGram && (
                      <input className="input" type="number" inputMode="numeric" autoFocus style={{ width: 100, padding: '6px 12px' }} placeholder="克"
                        onChange={(e) => { const g = Number(e.target.value); if (g > 0) setPortion(Math.max(0.25, Math.round((g / weight) * 4) / 4)) }} />
                    )}
                  </div>
                )}
              </div>
              {(lowSaltable || lowOilable) && (
                <div className="row wrap" style={{ gap: 8 }}>
                  {lowSaltable && <button className={`chip${lowSalt ? ' on' : ''}`} aria-pressed={lowSalt} onClick={() => setLowSalt(!lowSalt)}>少盐做法</button>}
                  {lowOilable && <button className={`chip${lowOil ? ' on' : ''}`} aria-pressed={lowOil} onClick={() => setLowOil(!lowOil)}>少油做法</button>}
                  <span className="tiny muted">自己做时盐或油放一半就勾上，按减半计</span>
                </div>
              )}
              <div className="grid2 slot-time">
                <div className="field"><label>餐次</label>
                  <div className="seg">{MEAL_SLOTS.map((s) => <button key={s} className={slot === s ? 'on' : ''} onClick={() => setSlot(s)}>{SLOT_LABEL[s]}</button>)}</div>
                </div>
                <div className="field"><label>时间</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
              </div>
              <Stats dense items={[
                { label: '热量', value: r0(now.kcal), unit: '千卡' },
                { label: '蛋白', value: r0(now.protein), unit: 'g' },
                { label: '脂肪', value: r0(now.fat), unit: 'g' },
                { label: '碳水', value: r0(now.carbs), unit: 'g' },
                { label: '纤维', value: r0(now.fiber), unit: 'g' },
                ...(showSodium ? [{ label: '钠', value: r0(now.sodium), unit: 'mg' }] : []),
              ]} />
            </div>

            <div className="row">
              {editing ? <button className="btn danger" onClick={() => onResult({ kind: 'delete', id: editing.id })}>删除</button> : <button className="btn" onClick={() => setPick(null)}>返回</button>}
              <button className="btn primary grow" onClick={save}>{editing ? '保存修改' : '记录'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

type CustomCat = 'protein' | 'veg' | 'staple' | 'soup' | 'breakfast' | 'snack'
const CUSTOM_CATS: Array<[CustomCat, string]> = [['protein', '荤菜/蛋白'], ['veg', '素菜'], ['staple', '主食'], ['soup', '汤'], ['breakfast', '早餐'], ['snack', '小食']]
const SLOTS_BY_CAT: Record<CustomCat, MealSlot[]> = { protein: ['lunch', 'dinner'], veg: ['lunch', 'dinner'], staple: ['breakfast', 'lunch', 'dinner'], soup: ['lunch', 'dinner'], breakfast: ['breakfast'], snack: ['snack', 'breakfast'] }
/** 加食材时的默认克重（一人份） */
function defaultGrams(ing: Ingredient): number {
  switch (ing.cat) {
    case 'vegetable': case 'mushroom': return 150
    case 'meat': case 'poultry': case 'seafood': return 100
    case 'egg': return 50
    case 'soy': case 'tuber': return 100
    case 'grain': return 100
    case 'dairy': case 'beverage': return 200
    case 'fruit': return 150
    case 'oil': return 10
    case 'condiment': return ing.id === 'salt' ? 1.5 : 10
    case 'sugar': return 5
    case 'nut': return 15
    case 'legume': return 50
    default: return 50
  }
}

function CustomForm({ onCancel, onDone, onDoneDish, barcode }: { onCancel: () => void; onDone: (f: CustomFood) => void; onDoneDish: (d: Dish) => void; barcode?: string }) {
  // 默认按食材搭配：营养与蔬菜量自动算出，和菜品库同一套逻辑；看包装成分表时切到「按成分表」
  const [mode, setMode] = useState<'parts' | 'label'>(barcode ? 'label' : 'parts')
  const [name, setName] = useState('')
  // 成分表模式
  const [serving, setServing] = useState('1份')
  const [v, setV] = useState({ kcal: '', protein: '', fat: '', carbs: '', fiber: '', sodium: '', vegG: '', fruitG: '' })
  const num = (s: string) => (s === '' ? 0 : Number(s))
  const macroKcal = num(v.protein) * 4 + num(v.fat) * 9 + num(v.carbs) * 4
  const kcal = v.kcal === '' ? macroKcal : num(v.kcal)
  const okLabel = name.trim() && kcal > 0
  // 食材模式
  const [cat, setCat] = useState<CustomCat>('protein')
  const [parts, setParts] = useState<Array<{ ing: string; g: number }>>([])
  const [iq, setIq] = useState('')
  const hits = useMemo(() => {
    const q = iq.trim().toLowerCase()
    if (!q) return []
    // 精确 > 前缀 > 包含；同级短名字优先，搜「油」先出植物油而不是油条
    const rank = (i: Ingredient) => { const n = i.name.toLowerCase(); return n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : i.id.includes(q) ? 3 : 9 }
    return INGREDIENTS.filter((i) => !parts.some((p) => p.ing === i.id) && rank(i) < 9)
      .sort((a, b) => rank(a) - rank(b) || (a.cat === 'oil' || a.cat === 'condiment' ? 0 : 1) - (b.cat === 'oil' || b.cat === 'condiment' ? 0 : 1) || a.name.length - b.name.length)
      .slice(0, 8)
  }, [iq, parts])
  const draft: Dish | null = parts.length ? { id: 'custom_draft', name: name || '自定义', cat, cuisine: 'cn', cook: 'normal', slots: SLOTS_BY_CAT[cat], serving: `1份(约${Math.round(parts.reduce((s, p) => s + p.g, 0))}g)`, parts } : null
  const dn = draft ? dishNutrients(draft) : null
  const dveg = draft ? vegGrams(draft) : 0
  const okParts = name.trim() && parts.length > 0 && parts.every((p) => p.g > 0)
  const saveDish = () => {
    if (!draft) return
    onDoneDish({ ...draft, id: 'custom_' + uid(), name: name.trim() })
  }
  return (
    <div className="card stack">
      <div className="row between"><h2>自定义食物</h2>
        <div className="seg" style={{ width: 200 }}>
          <button className={mode === 'parts' ? 'on' : ''} onClick={() => setMode('parts')}>按食材搭配</button>
          <button className={mode === 'label' ? 'on' : ''} onClick={() => setMode('label')}>按成分表</button>
        </div>
      </div>
      <div className="field"><label>名称</label><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === 'parts' ? '如 四季豆炒肉' : '如 某牌燕麦棒'} /></div>

      {mode === 'parts' && (
        <>
          <p className="small muted">选食材、填一人份克重，营养和蔬菜量自动算出，以后搜索、推荐、分析都和菜品库一样。</p>
          <div className="field"><label>类别</label>
            <div className="chips wrap">{CUSTOM_CATS.map(([c, l]) => <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>{l}</button>)}</div>
          </div>
          <div className="field"><label>加食材</label>
            <input className="input" value={iq} onChange={(e) => setIq(e.target.value)} placeholder="搜食材，如 四季豆、猪瘦肉、油、盐" />
            {hits.length > 0 && (
              <div className="chips wrap" style={{ marginTop: 6 }}>
                {hits.map((i) => <button key={i.id} className="chip" onClick={() => { setParts([...parts, { ing: i.id, g: defaultGrams(i) }]); setIq('') }}>{i.name}</button>)}
              </div>
            )}
          </div>
          {parts.length > 0 && (
            <div className="list">
              {parts.map((p, idx) => {
                const ing = INGREDIENT_MAP.get(p.ing)!
                return (
                  <div key={p.ing} className="list-item" style={{ padding: '6px 0' }}>
                    <span className="grow small">{ing.name}</span>
                    <input className="input num" type="number" inputMode="decimal" value={p.g} onChange={(e) => setParts(parts.map((x, i) => (i === idx ? { ...x, g: Number(e.target.value) } : x)))} style={{ width: 84, padding: '6px 10px' }} aria-label={`${ing.name} 克重`} />
                    <span className="tiny muted">g</span>
                    <button className="btn ghost sm" onClick={() => setParts(parts.filter((_, i) => i !== idx))} aria-label={`移除 ${ing.name}`}><IconClose size={12} /></button>
                  </div>
                )
              })}
            </div>
          )}
          {dn && <div className="note num">一份约 <b>{r0(dn.kcal)}</b> 千卡 · 蛋白 {r0(dn.protein)} g · 脂肪 {r0(dn.fat)} g · 碳水 {r0(dn.carbs)} g · 纤维 {r0(dn.fiber)} g · 钠 {r0(dn.sodium)} mg · 蔬菜 {r0(dveg)} g</div>}
          <div className="row">
            <button className="btn" onClick={onCancel}>返回</button>
            <button className="btn primary grow" disabled={!okParts} onClick={saveDish}>保存并选用</button>
          </div>
        </>
      )}

      {mode === 'label' && (
        <>
          <p className="small muted">看包装营养成分表填一份的量即可。热量不填就按三大宏量折算。{barcode ? `条码 ${barcode} 会一并记住，下次扫到直接用。` : ''}</p>
          <div className="field"><label>一份是多少</label><input value={serving} onChange={(e) => setServing(e.target.value)} placeholder="如 1盒(300g)" /></div>
          <div className="grid3">
            {([['kcal', '热量 千卡'], ['protein', '蛋白 g'], ['fat', '脂肪 g'], ['carbs', '碳水 g'], ['fiber', '纤维 g'], ['sodium', '钠 mg'], ['vegG', '含蔬菜 g（可选）'], ['fruitG', '含水果 g（可选）']] as const).map(([k, label]) => (
              <div key={k} className="field"><label>{label}</label><input type="number" inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></div>
            ))}
          </div>
          <div className="row">
            <button className="btn" onClick={onCancel}>返回</button>
            <button className="btn primary grow" disabled={!okLabel} onClick={() => onDone({ id: uid(), name: name.trim(), serving: serving || '1份', nutrients: { kcal, protein: num(v.protein), fat: num(v.fat), carbs: num(v.carbs), fiber: num(v.fiber), sodium: num(v.sodium) }, ...(num(v.vegG) > 0 ? { vegG: num(v.vegG) } : {}), ...(num(v.fruitG) > 0 ? { fruitG: num(v.fruitG) } : {}), ...(barcode ? { barcode } : {}) })}>保存并选用</button>
          </div>
        </>
      )}
    </div>
  )
}

