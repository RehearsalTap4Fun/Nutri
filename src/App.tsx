import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LogEntry, MealSlot, Nutrients, Profile, VitalEntry, WaterEntry, WeightEntry } from './core/types'
import { fluidFromDrinks } from './core/water'
import { MEAL_SLOTS } from './core/types'
import { computeTargets } from './core/energy'
import { analyze, dayStat } from './core/analysis'
import { planDay } from './core/planner'
import { suggestForBudget } from './core/budget'
import type { MealPlan } from './core/planner'
import { DISHES, DISH_MAP } from './data/dishes/index'
import { addDays, nowTimeStr, shortDate, todayStr, weekdayLabel } from './core/dates'
import { defaultState, loadState, saveState, uid } from './store/storage'
import type { AppState, CustomFood } from './store/storage'
import type { LlmConfig, Provider } from './llm/mealParser'
import type { Condition } from './core/types'
import { ProfileForm } from './ui/ProfileForm'
import { Today } from './ui/Today'
import { LogSheet } from './ui/LogSheet'
import type { LogSheetResult } from './ui/LogSheet'
import { PlanView } from './ui/Plan'
import { AnalysisView } from './ui/Analysis'
import { MeView } from './ui/Me'
import { Toast } from './ui/Toast'
import { useToast } from './ui/hooks'
import { IconBowl, IconChart, IconLeaf, IconPerson, IconPlus } from './ui/icons'
import { SLOT_LABEL, defaultTimeForSlot, guessSlot, portionLabel, showsSodium } from './ui/format'
import { entryName } from './core/nutrition'
import { captureInstallPrompt, isIOS, isStandalone, isWeChat, registerSW } from './pwa'
import type { InstallPromptEvent } from './pwa'

type Tab = 'today' | 'plan' | 'analysis' | 'me'

const TABS: Array<{ key: Tab; label: string; icon: () => JSX.Element }> = [
  { key: 'today', label: '今日', icon: IconBowl },
  { key: 'plan', label: '推荐', icon: IconLeaf },
  { key: 'analysis', label: '分析', icon: IconChart },
  { key: 'me', label: '我的', icon: IconPerson },
]

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState<string>(() => todayStr())
  const [sheet, setSheet] = useState<{ slot: MealSlot; editing?: LogEntry } | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const { toast, show, dismiss } = useToast()
  const [installEvt, setInstallEvt] = useState<InstallPromptEvent | null>(null)
  const [wxHint, setWxHint] = useState<boolean>(() => {
    try { return isWeChat() && !isStandalone() && sessionStorage.getItem('nutri.wxhint') !== '1' } catch { return isWeChat() }
  })
  const dismissWx = () => { setWxHint(false); try { sessionStorage.setItem('nutri.wxhint', '1') } catch { /* ignore */ } }

  useEffect(() => saveState(state), [state])
  useEffect(() => {
    registerSW((reload) => show('有新版本', { label: '刷新', run: reload }))
    captureInstallPrompt(setInstallEvt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const promptInstall = async () => {
    if (!installEvt) return
    await installEvt.prompt()
    const { outcome } = await installEvt.userChoice
    if (outcome === 'accepted') { setInstallEvt(null); show('已添加到主屏幕') }
  }

  const update = (fn: (s: AppState) => AppState) => setState((s) => fn(s))
  const today = todayStr()
  const profile = state.profile

  const isTrainingDay = state.trainingDays.includes(date)
  const baseTargets = useMemo(() => (profile ? computeTargets(profile, new Date(), undefined, { trainingDay: isTrainingDay }) : null), [profile, isTrainingDay])
  const analysis = useMemo(
    () => (profile && baseTargets ? analyze(profile, baseTargets, state.entries, state.weights, DISH_MAP, date, state.water) : null),
    [profile, baseTargets, state.entries, state.weights, state.water, date],
  )
  const targets = useMemo(() => {
    if (!profile || !baseTargets) return null
    if (state.settings.useAdaptiveTdee && analysis?.adaptive) return computeTargets(profile, new Date(), analysis.adaptive.tdee, { trainingDay: isTrainingDay })
    return baseTargets
  }, [profile, baseTargets, analysis, state.settings.useAdaptiveTdee, isTrainingDay])

  const dayWater = useMemo(() => state.water.filter((w) => w.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || '')), [state.water, date])
  const fluidMl = useMemo(() => fluidFromDrinks(state.entries, DISH_MAP, date), [state.entries, date])
  const dayEntries = useMemo(() => state.entries.filter((e) => e.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || '')), [state.entries, date])
  const stat = useMemo(() => (targets ? dayStat(date, state.entries, DISH_MAP, targets.kcal) : null), [state.entries, date, targets])

  const plan = useMemo(() => {
    if (!profile || !targets || !analysis) return null
    const eaten: Partial<Record<MealSlot, Nutrients>> = {}
    if (stat) for (const s of MEAL_SLOTS) eaten[s] = stat.bySlot[s]
    const seeds = state.planSeeds[date] || { day: 0, meals: {} }
    const from = addDays(date, -7)
    return planDay({
      profile, targets, dishes: DISHES, dishMap: DISH_MAP, date, seed: seeds.day, mealSeeds: seeds.meals,
      recentEntries: state.entries.filter((e) => e.date >= from && e.date <= date),
      adjustments: analysis.adjustments, eatenToday: eaten,
    })
  }, [profile, targets, analysis, stat, state.planSeeds, state.entries, date])

  const recentDishIds = useMemoRecent(state.entries, today)
  const quickIds = useMemo(() => [...new Set([...recentDishIds, ...state.favorites])], [recentDishIds, state.favorites])
  // 下一餐是哪一餐：今天按当前时间猜，其他日期按第一个没记录的餐次
  const nextSlot: MealSlot = useMemo(() => {
    const empty = MEAL_SLOTS.filter((s) => s !== 'snack' && !dayEntries.some((e) => e.slot === s))
    if (date === today) { const g = guessSlot(nowTimeStr()); return empty.includes(g) ? g : (empty[0] || 'snack') }
    return empty[0] || 'snack'
  }, [dayEntries, date, today])
  // 用剩下的预算还能吃什么
  const budgetPicks = useMemo(() => {
    if (!profile || !targets || !stat) return []
    return suggestForBudget({ remainKcal: targets.kcal - stat.n.kcal, remainProtein: targets.protein - stat.n.protein, slot: nextSlot, dishes: DISHES, profile, favorites: state.favorites, recentIds: recentDishIds })
  }, [profile, targets, stat, nextSlot, state.favorites, recentDishIds])
  // 任意一天的推荐（一周视图用）：已吃的餐视为完成，其余按剩余预算给
  const planFor = useCallback((d: string) => {
    if (!profile || !targets || !analysis) return null
    const statD = dayStat(d, state.entries, DISH_MAP, targets.kcal)
    const eaten: Partial<Record<MealSlot, Nutrients>> = {}
    for (const s of MEAL_SLOTS) eaten[s] = statD.bySlot[s]
    const seeds = state.planSeeds[d] || { day: 0, meals: {} }
    return planDay({ profile, targets, dishes: DISHES, dishMap: DISH_MAP, date: d, seed: seeds.day, mealSeeds: seeds.meals, recentEntries: state.entries.filter((e) => e.date >= addDays(d, -7) && e.date <= d), adjustments: analysis.adjustments, eatenToday: eaten })
  }, [profile, targets, analysis, state.entries, state.planSeeds])
  const llm: LlmConfig = { provider: state.settings.provider, apiKey: state.settings.provider === 'deepseek' ? state.settings.deepseekKey : state.settings.anthropicKey }

  // ---- actions ----
  const saveProfile = (p: Profile) => {
    update((s) => ({ ...s, profile: p }))
    setEditingProfile(false)
  }

  const openAdd = (slot?: MealSlot) => {
    const slotGuess = slot || (date === today ? guessSlot(nowTimeStr()) : 'lunch')
    setSheet({ slot: slotGuess })
  }

  const removeEntries = (ids: string[]) => update((s) => ({ ...s, entries: s.entries.filter((e) => !ids.includes(e.id)) }))
  const restoreEntries = (list: LogEntry[]) => update((s) => ({ ...s, entries: [...s.entries, ...list] }))

  const onSheetResult = (r: LogSheetResult) => {
    if (r.kind === 'save') {
      const isEdit = !!r.entry.id && state.entries.some((e) => e.id === r.entry.id)
      const entry = { ...r.entry, id: r.entry.id || uid() }
      update((s) => ({ ...s, entries: isEdit ? s.entries.map((e) => (e.id === entry.id ? entry : e)) : [...s.entries, entry] }))
      if (!isEdit) show(`已记录 · ${entryName(entry, DISH_MAP)} × ${portionLabel(entry.portion)}`, { label: '撤销', run: () => removeEntries([entry.id]) })
      else show('已保存修改')
    } else if (r.kind === 'saveMany') {
      update((s) => ({ ...s, entries: [...s.entries, ...r.entries], customFoods: [...r.customFoods, ...s.customFoods].slice(0, 200) }))
      show(`已记录 ${r.entries.length} 条`, { label: '撤销', run: () => removeEntries(r.entries.map((e) => e.id)) })
    } else if (r.kind === 'delete') {
      const removed = state.entries.find((e) => e.id === r.id)
      removeEntries([r.id])
      if (removed) show(`已删除 · ${entryName(removed, DISH_MAP)}`, { label: '撤销', run: () => restoreEntries([removed]) })
    } else if (r.kind === 'needKey') {
      setTab('me')
    }
    setSheet(null)
  }

  const addCustomFood = (f: CustomFood) => update((s) => ({ ...s, customFoods: [f, ...s.customFoods.filter((x) => x.id !== f.id)] }))
  const toggleFavorite = (id: string) => update((s) => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] }))

  const reroll = (slot?: MealSlot) => update((s) => {
    const cur = s.planSeeds[date] || { day: 0, meals: {} }
    const next = slot ? { ...cur, meals: { ...cur.meals, [slot]: (cur.meals[slot] || 0) + 1 } } : { day: cur.day + 1, meals: {} }
    return { ...s, planSeeds: { ...s.planSeeds, [date]: next } }
  })

  const logMeal = (meal: MealPlan) => {
    const time = date === today ? nowTimeStr() : defaultTimeForSlot(meal.slot)
    const entries: LogEntry[] = meal.items.map((it) => ({ id: uid(), date, slot: meal.slot, time, dishId: it.dishId, portion: it.portion, ...(it.lowSalt ? { lowSalt: true } : {}), ...(it.lowOil ? { lowOil: true } : {}) }))
    restoreEntries(entries)
    show(`${SLOT_LABEL[meal.slot]}已记录 ${entries.length} 项`, { label: '撤销', run: () => removeEntries(entries.map((e) => e.id)) })
  }

  // 一键补记：空餐次下点常吃的菜，直接按一份记，可撤销
  const quickLog = (slot: MealSlot, dishId: string, portion = 1) => {
    const time = date === today ? nowTimeStr() : defaultTimeForSlot(slot)
    const entry: LogEntry = { id: uid(), date, slot, time, dishId, portion }
    restoreEntries([entry])
    show(`已记录 · ${DISH_MAP.get(dishId)?.name || dishId} × ${portionLabel(portion)}`, { label: '撤销', run: () => removeEntries([entry.id]) })
  }

  // 记录条目直接删除（今日页的叉与左滑），toast 可撤销
  const removeEntry = (e: LogEntry) => {
    removeEntries([e.id])
    show(`已删除 · ${entryName(e, DISH_MAP)} × ${portionLabel(e.portion)}`, { label: '撤销', run: () => restoreEntries([e]) })
  }

  const rerollWeek = (dates: string[]) => update((s) => {
    const next = { ...s.planSeeds }
    for (const d of dates) { const cur = next[d] || { day: 0, meals: {} }; next[d] = { day: cur.day + 1, meals: {} } }
    return { ...s, planSeeds: next }
  })
  const addVital = (v: Omit<VitalEntry, 'id'>) => {
    const entry: VitalEntry = { ...v, id: uid() }
    update((s) => ({ ...s, vitals: [...s.vitals, entry] }))
    show(v.kind === 'bp' ? `已记录血压 ${v.sys}/${v.dia}` : `已记录血糖 ${v.mmol} mmol/L`, { label: '撤销', run: () => update((s) => ({ ...s, vitals: s.vitals.filter((x) => x.id !== entry.id) })) })
  }
  const removeVital = (id: string) => update((s) => ({ ...s, vitals: s.vitals.filter((x) => x.id !== id) }))

  const dislikeDish = (id: string) => {
    update((s) => (s.profile ? { ...s, profile: { ...s.profile, dislikedDishes: [...new Set([...s.profile.dislikedDishes, id])] } } : s))
    show(`以后不再推荐「${DISH_MAP.get(id)?.name || id}」`, { label: '撤销', run: () => undislikeDish(id) })
  }
  const undislikeDish = (id: string) => update((s) => (s.profile ? { ...s, profile: { ...s.profile, dislikedDishes: s.profile.dislikedDishes.filter((x) => x !== id) } } : s))

  const addWater = (ml: number) => {
    const w: WaterEntry = { id: uid(), date, time: date === today ? nowTimeStr() : undefined, ml: Math.round(ml) }
    update((s) => ({ ...s, water: [...s.water, w] }))
    show(`+${w.ml} ml`, { label: '撤销', run: () => update((s) => ({ ...s, water: s.water.filter((x) => x.id !== w.id) })) })
  }
  const removeWater = (id: string) => {
    const w = state.water.find((x) => x.id === id)
    update((s) => ({ ...s, water: s.water.filter((x) => x.id !== id) }))
    if (w) show(`已删除 ${w.ml} ml`, { label: '撤销', run: () => update((s) => ({ ...s, water: [...s.water, w] })) })
  }
  const addWeight = (w: WeightEntry) => {
    update((s) => ({ ...s, weights: [...s.weights.filter((x) => x.date !== w.date), w].sort((a, b) => a.date.localeCompare(b.date)) }))
    show(`已记录体重 ${w.kg} kg`)
  }
  const setConditions = (c: Condition[], trimester?: 1 | 2 | 3) => {
    update((s) => (s.profile ? { ...s, profile: { ...s.profile, conditions: c, pregnancyTrimester: trimester } } : s))
    show(c.length ? `营养模式已更新：${c.length} 个` : '营养模式已全部关闭')
  }
  const goModes = () => {
    setTab('me')
    window.setTimeout(() => document.getElementById('modes-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
  const toggleTrainingDay = () => update((s) => ({ ...s, trainingDays: s.trainingDays.includes(date) ? s.trainingDays.filter((d) => d !== date) : [...s.trainingDays, date] }))
  const setAdaptive = (v: boolean) => update((s) => ({ ...s, settings: { ...s.settings, useAdaptiveTdee: v } }))
  const setProvider = (p: Provider) => update((s) => ({ ...s, settings: { ...s.settings, provider: p } }))
  const setKey = (p: Provider, k: string) => update((s) => ({ ...s, settings: { ...s.settings, [p === 'deepseek' ? 'deepseekKey' : 'anthropicKey']: k.trim() } }))
  // 导入的数据不带 key，保留本机已填的
  const importState = (ns: AppState) => setState((s) => ({ ...ns, settings: { ...ns.settings, anthropicKey: s.settings.anthropicKey, deepseekKey: s.settings.deepseekKey } }))
  const resetAll = () => setState(defaultState())

  // ---- render ----
  const wxBanner = wxHint ? (
    <div className="note" role="status" style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span className="grow">微信里只能看不能装。点右上角「···」，选「{isIOS() ? '在 Safari 中打开' : '在浏览器中打开'}」，再添加到主屏幕，就能全屏离线使用，数据也更稳。</span>
      <button className="btn ghost sm" onClick={dismissWx} aria-label="知道了">知道了</button>
    </div>
  ) : null

  if (!profile || editingProfile) {
    return (
      <div className="app">
        {wxBanner}
        <ProfileForm initial={profile} onSave={saveProfile} onCancel={profile ? () => setEditingProfile(false) : undefined} />
      </div>
    )
  }

  const showNa = showsSodium(profile.conditions)
  const dateLabel = date === today ? '今天' : date === addDays(today, -1) ? '昨天' : date === addDays(today, 1) ? '明天' : `${shortDate(date)} 周${weekdayLabel(date)}`

  return (
    <>
      <div className={`app${sheet ? ' dimmed' : ''}`}>
        {wxBanner}
        <div className="topbar">
          <h1>{TABS.find((t) => t.key === tab)?.label}</h1>
          {(tab === 'today' || tab === 'plan') && (
            <div className="datenav">
              <button onClick={() => setDate(addDays(date, -1))} aria-label="前一天">‹</button>
              <button className="cur" onClick={() => setDate(today)}>{dateLabel}</button>
              <button onClick={() => setDate(addDays(date, 1))} aria-label="后一天">›</button>
            </div>
          )}
        </div>

        {tab === 'today' && targets && stat && (
          <Today date={date} entries={dayEntries} targets={targets} stat={stat} dishMap={DISH_MAP} onAdd={openAdd} onEdit={(e) => setSheet({ slot: e.slot, editing: e })} planNotes={plan?.notes || []} goPlan={() => setTab('plan')} goModes={goModes} conditions={profile.conditions} trainingDay={profile.conditions.includes('training') ? isTrainingDay : undefined} onToggleTrainingDay={toggleTrainingDay} quickIds={quickIds} onQuickLog={quickLog} onRemove={removeEntry} budgetPicks={budgetPicks} nextSlot={nextSlot} water={dayWater} fluidMl={fluidMl} onAddWater={addWater} onRemoveWater={removeWater} />
        )}
        {tab === 'plan' && plan && targets && (
          <PlanView showSodium={showNa} date={date} planFor={planFor} onRerollWeek={rerollWeek} onPickDate={setDate} plan={plan} targets={targets} dishMap={DISH_MAP} dayEntries={dayEntries} onReroll={reroll} onLogMeal={logMeal} onDislike={dislikeDish} isToday={date === today} />
        )}
        {tab === 'analysis' && analysis && targets && (
          <AnalysisView vitals={state.vitals} onAddVital={addVital} onRemoveVital={removeVital} analysis={analysis} targets={targets} weights={state.weights} entries={state.entries} water={state.water} onAddWeight={addWeight} useAdaptive={state.settings.useAdaptiveTdee} onToggleAdaptive={setAdaptive} date={date} profile={profile} dishMap={DISH_MAP} />
        )}
        {tab === 'me' && targets && (
          <MeView profile={profile} targets={targets} state={state} onEdit={() => setEditingProfile(true)} onUndislike={undislikeDish} onImport={importState} onReset={resetAll} dishMap={DISH_MAP} onSetProvider={setProvider} onSetKey={setKey} onSetConditions={setConditions} canInstall={!!installEvt} onInstall={promptInstall} />
        )}
      </div>

      {tab === 'today' && !sheet && dayEntries.length > 0 && <button className="fab" onClick={() => openAdd()} aria-label="记录餐食"><IconPlus /></button>}

      <nav className="nav">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
              <span className="ico"><t.icon /></span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {sheet && (
        <LogSheet showSodium={showNa} date={date} isToday={date === today} slot={sheet.slot} editing={sheet.editing} dishes={DISHES} dishMap={DISH_MAP} customFoods={state.customFoods}
          favorites={state.favorites} recentDishIds={recentDishIds} onResult={onSheetResult} onAddCustomFood={addCustomFood} onToggleFavorite={toggleFavorite} llm={llm} defaultLowSalt={profile.conditions.includes('hypertension')} />
      )}
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  )
}

function useMemoRecent(entries: LogEntry[], today: string): string[] {
  return useMemo(() => {
    const from = addDays(today, -14)
    const seen = new Set<string>()
    const out: string[] = []
    const sorted = [...entries].filter((e) => e.dishId && e.date >= from).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')))
    for (const e of sorted) {
      if (e.dishId && !seen.has(e.dishId)) { seen.add(e.dishId); out.push(e.dishId) }
      if (out.length >= 12) break
    }
    return out
  }, [entries, today])
}
