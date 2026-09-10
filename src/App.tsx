import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dish, LogEntry, MealSlot, Nutrients, Profile, VitalEntry, WaterEntry, WeightEntry } from './core/types'
import { fluidFromDrinks } from './core/water'
import { MEAL_SLOTS } from './core/types'
import { computeTargets } from './core/energy'
import { analyze, dayStat } from './core/analysis'
import { planDay } from './core/planner'
import { remainOf, suggestForBudget } from './core/budget'
import { frequentBySlot, frequentDishes } from './core/recent'
import type { MealPlan } from './core/planner'
import { DISHES, DISH_MAP } from './data/dishes/index'
import { addDays, nowTimeStr, shortDate, todayStr, weekdayLabel } from './core/dates'
import { defaultState, loadState, saveState, uid } from './store/storage'
import type { AppState, CustomFood } from './store/storage'
import type { LlmConfig, Provider, SpeakJob } from './llm/mealParser'
import { MealParseError, parseMealText } from './llm/mealParser'
import type { Condition } from './core/types'
import { ProfileForm } from './ui/ProfileForm'
import { Today } from './ui/Today'
import { LogSheet } from './ui/LogSheet'
import type { LogSheetResult } from './ui/LogSheet'
import { PlanView } from './ui/Plan'
import { AnalysisView } from './ui/Analysis'
import { MeView } from './ui/Me'
import { Toast } from './ui/Toast'
import { SpeakJobBanner } from './ui/SpeakJobBanner'
import { useToast } from './ui/hooks'
import { IconBowl, IconChart, IconLeaf, IconPerson, IconPlus } from './ui/icons'
import { SLOT_LABEL, defaultTimeForSlot, entryPortionText, guessSlot, portionText, showsSodium } from './ui/format'
import { entryName, servingGrams } from './core/nutrition'
import { captureInstallPrompt, isIOS, isStandalone, isWeChat, registerSW } from './pwa'
import { deleteRemote, syncOnce, SyncError } from './sync/client'
import { applySyncState, fingerprint, mergeSync, toSyncState } from './sync/merge'
import { generateSyncCode } from './sync/crypto'
import type { SyncStatus } from './ui/CloudSync'
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
  // 说一句话录餐的后台任务：跑在这里而不是弹窗组件里，弹窗关掉、切页面都不会丢，跑完了下面的提示条随时能打开看结果
  const [speakJob, setSpeakJob] = useState<SpeakJob | null>(null)
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
  // 菜品库 + 用户自建菜：搜索、统计、推荐都用合并后的表
  const allDishes = useMemo(() => [...DISHES, ...state.customDishes], [state.customDishes])
  const dishMap = useMemo(() => { const m = new Map(DISH_MAP); for (const d of state.customDishes) m.set(d.id, d); return m }, [state.customDishes])

  const isTrainingDay = state.trainingDays.includes(date)
  const baseTargets = useMemo(() => (profile ? computeTargets(profile, new Date(), undefined, { trainingDay: isTrainingDay }) : null), [profile, isTrainingDay])
  const analysis = useMemo(
    () => (profile && baseTargets ? analyze(profile, baseTargets, state.entries, state.weights, dishMap, date, state.water) : null),
    [profile, baseTargets, state.entries, state.weights, state.water, date, dishMap],
  )
  const targets = useMemo(() => {
    if (!profile || !baseTargets) return null
    if (state.settings.useAdaptiveTdee && analysis?.adaptive) return computeTargets(profile, new Date(), analysis.adaptive.tdee, { trainingDay: isTrainingDay })
    return baseTargets
  }, [profile, baseTargets, analysis, state.settings.useAdaptiveTdee, isTrainingDay])

  const dayWater = useMemo(() => state.water.filter((w) => w.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || '')), [state.water, date])
  const fluidMl = useMemo(() => fluidFromDrinks(state.entries, dishMap, date), [state.entries, date, dishMap])
  const dayEntries = useMemo(() => state.entries.filter((e) => e.date === date).sort((a, b) => (a.time || '').localeCompare(b.time || '')), [state.entries, date])
  const stat = useMemo(() => (targets ? dayStat(date, state.entries, dishMap, targets.kcal) : null), [state.entries, date, targets, dishMap])

  const plan = useMemo(() => {
    if (!profile || !targets || !analysis) return null
    const eaten: Partial<Record<MealSlot, Nutrients>> = {}
    if (stat) for (const s of MEAL_SLOTS) eaten[s] = stat.bySlot[s]
    const seeds = state.planSeeds[date] || { day: 0, meals: {} }
    const from = addDays(date, -7)
    return planDay({
      profile, targets, dishes: allDishes, dishMap: dishMap, date, seed: seeds.day, mealSeeds: seeds.meals,
      recentEntries: state.entries.filter((e) => e.date >= from && e.date <= date),
      adjustments: analysis.adjustments, eatenToday: eaten,
    })
  }, [profile, targets, analysis, stat, state.planSeeds, state.entries, date, dishMap, allDishes])

  // 常吃：不分餐次的总榜给「能不能吃」搜索与预算建议加分用；分餐次的给今日页一键补记与录入页默认列表
  const recentDishIds = useMemo(() => frequentDishes(state.entries, today), [state.entries, today])
  const recentBySlot = useMemo(() => frequentBySlot(state.entries, today), [state.entries, today])
  // 每个餐次的一键补记候选：该餐次常吃 → 适合该餐次的收藏 → 总榜里适合该餐次的菜补位
  const quickBySlot = useMemo(() => {
    const fits = (id: string, s: MealSlot) => !!dishMap.get(id)?.slots.includes(s)
    const o = {} as Record<MealSlot, string[]>
    for (const s of MEAL_SLOTS) o[s] = [...new Set([...recentBySlot[s], ...state.favorites.filter((id) => fits(id, s)), ...recentDishIds.filter((id) => fits(id, s))])]
    return o
  }, [recentBySlot, recentDishIds, state.favorites, dishMap])
  // 下一餐是哪一餐：今天按当前时间猜，其他日期按第一个没记录的餐次
  const nextSlot: MealSlot = useMemo(() => {
    const empty = MEAL_SLOTS.filter((s) => s !== 'snack' && !dayEntries.some((e) => e.slot === s))
    if (date === today) { const g = guessSlot(nowTimeStr()); return empty.includes(g) ? g : (empty[0] || 'snack') }
    return empty[0] || 'snack'
  }, [dayEntries, date, today])
  // 用剩下的预算还能吃什么
  const budgetPicks = useMemo(() => {
    if (!profile || !targets || !stat) return []
    return suggestForBudget({ remain: remainOf(targets, stat.n), targets, slot: nextSlot, dishes: allDishes, profile, favorites: state.favorites, recentIds: recentDishIds })
  }, [profile, targets, stat, nextSlot, state.favorites, recentDishIds, allDishes])
  // 任意一天的推荐（一周视图用）：已吃的餐视为完成，其余按剩余预算给
  const planFor = useCallback((d: string) => {
    if (!profile || !targets || !analysis) return null
    const statD = dayStat(d, state.entries, dishMap, targets.kcal)
    const eaten: Partial<Record<MealSlot, Nutrients>> = {}
    for (const s of MEAL_SLOTS) eaten[s] = statD.bySlot[s]
    const seeds = state.planSeeds[d] || { day: 0, meals: {} }
    return planDay({ profile, targets, dishes: allDishes, dishMap: dishMap, date: d, seed: seeds.day, mealSeeds: seeds.meals, recentEntries: state.entries.filter((e) => e.date >= addDays(d, -7) && e.date <= d), adjustments: analysis.adjustments, eatenToday: eaten })
  }, [profile, targets, analysis, state.entries, state.planSeeds])
  const llm: LlmConfig = { provider: state.settings.provider, apiKey: state.settings.provider === 'deepseek' ? state.settings.deepseekKey : state.settings.anthropicKey }

  // ---- 云同步 ----
  const stateRef = useRef(state)
  stateRef.current = state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    try { const j = JSON.parse(localStorage.getItem('nutri.sync.status') || '{}'); return { busy: false, lastSyncAt: j.lastSyncAt, version: j.version } } catch { return { busy: false } }
  })
  const syncBusy = useRef(false)
  const lastSyncedFp = useRef<string>('')
  const runSync = useCallback(async (silentIfSame = true) => {
    const cur = stateRef.current
    const cfg = cur.settings.sync
    if (!cfg.enabled || !cfg.code || syncBusy.current) return
    syncBusy.current = true
    setSyncStatus((st) => ({ ...st, busy: true }))
    try {
      const r = await syncOnce(cur, cfg.code)
      if (r.pulledChanges) {
        setState((s) => applySyncState(s, mergeSync(toSyncState(s), toSyncState(r.state))))
        if (!silentIfSame) show('已从云端合并最新记录')
      } else if (!silentIfSame) show(r.pushed ? '已推送到云端' : '云端已是最新')
      lastSyncedFp.current = fingerprint(toSyncState(r.state))
      const st = { busy: false, lastSyncAt: Date.now(), version: r.version }
      setSyncStatus(st)
      try { localStorage.setItem('nutri.sync.status', JSON.stringify({ lastSyncAt: st.lastSyncAt, version: st.version })) } catch { /* ignore */ }
    } catch (e) {
      const msg = e instanceof SyncError ? e.message : String(e)
      setSyncStatus((st) => ({ ...st, busy: false, lastError: msg }))
      if (!silentIfSame) show('同步失败：' + msg)
    } finally {
      syncBusy.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const syncEnabled = state.settings.sync.enabled
  // 开启时 / 回到前台时拉一次
  useEffect(() => {
    if (!syncEnabled) return
    runSync(true)
    const onVis = () => { if (document.visibilityState === 'visible') runSync(true) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [syncEnabled, runSync])
  // 本地有改动后延迟 4 秒推送
  const syncFp = useMemo(() => (syncEnabled ? fingerprint(toSyncState(state)) : ''), [state, syncEnabled])
  useEffect(() => {
    if (!syncEnabled || !syncFp || syncFp === lastSyncedFp.current) return
    const t = window.setTimeout(() => runSync(true), 4000)
    return () => window.clearTimeout(t)
  }, [syncFp, syncEnabled, runSync])
  const enableSync = (code: string, mode: 'new' | 'join') => {
    const now = Date.now()
    update((s) => ({
      ...s,
      settings: { ...s.settings, sync: { code, enabled: true } },
      // 首台设备：给档案与设置盖上当前时间，避免被后来加入的新设备的默认档案覆盖；
      // 加入的设备：清零，让云端的档案与设置优先（它的记录仍会并入）
      meta: mode === 'new' ? { profileAt: s.meta.profileAt || now, settingsAt: s.meta.settingsAt || now } : { profileAt: 0, settingsAt: 0 },
    }))
    show(mode === 'new' ? '云同步已开启，正在上传…' : '已接入，正在合并云端数据…')
  }
  const disableSync = async (removeRemote: boolean) => {
    const code = state.settings.sync.code
    update((s) => ({ ...s, settings: { ...s.settings, sync: { code: '', enabled: false } } }))
    lastSyncedFp.current = ''
    if (removeRemote && code) { try { await deleteRemote(code) } catch { /* 网络问题也不阻塞关闭 */ } }
    show(removeRemote ? '已关闭同步并删除云端副本' : '已在本机关闭同步，云端副本保留')
  }
  /** 记一笔的提示：第一次记录、这台设备还没配过同步码时，顺手自动开起来（可在「我的」手动关闭） */
  const noticeAfterLog = (text: string, undo: () => void) => {
    if (state.entries.length === 0 && !state.settings.sync.code) {
      enableSync(generateSyncCode(), 'new')
      show(`${text} · 已自动开启云同步，同步码在「我的」页可查看`, { label: '撤销', run: undo })
    } else {
      show(text, { label: '撤销', run: undo })
    }
  }

  // ---- actions ----
  const saveProfile = (p: Profile) => {
    update((s) => ({ ...s, profile: p, meta: { ...s.meta, profileAt: Date.now() } }))
    setEditingProfile(false)
  }

  const openAdd = (slot?: MealSlot) => {
    const slotGuess = slot || (date === today ? guessSlot(nowTimeStr()) : 'lunch')
    setSheet({ slot: slotGuess })
  }

  // 说一句话录餐：跑在这里，不在弹窗组件里，所以关掉弹窗、切到别的页面都不影响结果送达
  const runSpeakJob = (text: string, slot: MealSlot, time: string) => {
    const jobDate = date
    setSpeakJob({ status: 'running', text, slot, time, date: jobDate })
    parseMealText(llm, text, allDishes, dishMap, { date: jobDate, now: nowTimeStr() })
      .then((r) => setSpeakJob({ status: 'done', text, slot: r.slot || slot, time: r.time || time, date: jobDate, result: r }))
      .catch((e) => setSpeakJob({ status: 'error', text, slot, time, date: jobDate, error: e instanceof MealParseError ? e.message : String(e) }))
  }
  const consumeSpeakJob = () => setSpeakJob(null)
  const openSpeakJob = () => { if (speakJob) { setDate(speakJob.date); setSheet({ slot: speakJob.slot }) } }

  const tomb = (coll: AppState['tombstones'][number]['coll'], ids: string[]) => ids.map((id) => ({ coll, id, at: Date.now() }))
  const removeEntries = (ids: string[]) => update((s) => ({ ...s, entries: s.entries.filter((e) => !ids.includes(e.id)), tombstones: [...s.tombstones, ...tomb('entries', ids)] }))
  const restoreEntries = (list: LogEntry[]) => update((s) => ({ ...s, entries: [...s.entries, ...list.map((e) => ({ ...e, updatedAt: Date.now() }))], tombstones: s.tombstones.filter((t) => !(t.coll === 'entries' && list.some((e) => e.id === t.id))) }))

  const onSheetResult = (r: LogSheetResult) => {
    if (r.kind === 'save') {
      const isEdit = !!r.entry.id && state.entries.some((e) => e.id === r.entry.id)
      const entry = { ...r.entry, id: r.entry.id || uid(), updatedAt: Date.now() }
      update((s) => ({ ...s, entries: isEdit ? s.entries.map((e) => (e.id === entry.id ? entry : e)) : [...s.entries, entry] }))
      if (!isEdit) noticeAfterLog(`已记录 · ${entryName(entry, dishMap)} × ${entryPortionText(entry, dishMap)}`, () => removeEntries([entry.id]))
      else show('已保存修改')
    } else if (r.kind === 'saveMany') {
      update((s) => ({ ...s, entries: [...s.entries, ...r.entries], customFoods: [...r.customFoods, ...s.customFoods].slice(0, 200) }))
      noticeAfterLog(`已记录 ${r.entries.length} 条`, () => removeEntries(r.entries.map((e) => e.id)))
    } else if (r.kind === 'delete') {
      const removed = state.entries.find((e) => e.id === r.id)
      removeEntries([r.id])
      if (removed) show(`已删除 · ${entryName(removed, dishMap)}`, { label: '撤销', run: () => restoreEntries([removed]) })
    } else if (r.kind === 'needKey') {
      setTab('me')
    }
    setSheet(null)
  }

  const addCustomDish = (d: Dish) => {
    update((s) => ({ ...s, customDishes: [...s.customDishes.filter((x) => x.id !== d.id), d] }))
    show(`已保存自建菜「${d.name}」，以后搜索、推荐都能用`)
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
    const entries: LogEntry[] = meal.items.map((it) => ({ id: uid(), updatedAt: Date.now(), date, slot: meal.slot, time, dishId: it.dishId, portion: it.portion, ...(it.lowSalt ? { lowSalt: true } : {}), ...(it.lowOil ? { lowOil: true } : {}) }))
    restoreEntries(entries)
    show(`${SLOT_LABEL[meal.slot]}已记录 ${entries.length} 项`, { label: '撤销', run: () => removeEntries(entries.map((e) => e.id)) })
  }

  // 一键补记：空餐次下点常吃的菜，直接按一份记，可撤销
  const quickLog = (slot: MealSlot, dishId: string, portion = 1) => {
    const time = date === today ? nowTimeStr() : defaultTimeForSlot(slot)
    const entry: LogEntry = { id: uid(), updatedAt: Date.now(), date, slot, time, dishId, portion }
    restoreEntries([entry])
    noticeAfterLog(`已记录 · ${dishMap.get(dishId)?.name || dishId} × ${portionText(portion, dishMap.get(dishId) ? servingGrams(dishMap.get(dishId)!) : undefined)}`, () => removeEntries([entry.id]))
  }

  // 记录条目直接删除（今日页的叉与左滑），toast 可撤销
  const removeEntry = (e: LogEntry) => {
    removeEntries([e.id])
    show(`已删除 · ${entryName(e, dishMap)} × ${entryPortionText(e, dishMap)}`, { label: '撤销', run: () => restoreEntries([e]) })
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
  const removeVital = (id: string) => update((s) => ({ ...s, vitals: s.vitals.filter((x) => x.id !== id), tombstones: [...s.tombstones, ...tomb('vitals', [id])] }))

  const dislikeDish = (id: string) => {
    update((s) => (s.profile ? { ...s, profile: { ...s.profile, dislikedDishes: [...new Set([...s.profile.dislikedDishes, id])] } } : s))
    show(`以后不再推荐「${dishMap.get(id)?.name || id}」`, { label: '撤销', run: () => undislikeDish(id) })
  }
  const undislikeDish = (id: string) => update((s) => (s.profile ? { ...s, profile: { ...s.profile, dislikedDishes: s.profile.dislikedDishes.filter((x) => x !== id) } } : s))

  // 饮水按杯点亮：把这一天的总量设为 ml（旧记录打墓碑，新写一条），toast 可撤销
  const setWater = (ml: number) => {
    const prev = state.water.filter((w) => w.date === date)
    const entry: WaterEntry = { id: uid(), updatedAt: Date.now(), date, time: date === today ? nowTimeStr() : undefined, ml: Math.round(ml) }
    update((s) => ({ ...s, water: [...s.water.filter((w) => w.date !== date), ...(ml > 0 ? [entry] : [])], tombstones: [...s.tombstones, ...tomb('water', prev.map((w) => w.id))] }))
    const cupsN = Math.round(ml / 250)
    show(ml > 0 ? `喝到第 ${cupsN} 杯 · ${Math.round(ml)} ml` : '今天的饮水清零了', {
      label: '撤销',
      run: () => update((s) => ({
        ...s,
        water: [...s.water.filter((w) => w.date !== date), ...prev.map((w) => ({ ...w, updatedAt: Date.now() }))],
        tombstones: [...s.tombstones.filter((t) => !(t.coll === 'water' && prev.some((w) => w.id === t.id))), ...(ml > 0 ? tomb('water', [entry.id]) : [])],
      })),
    })
  }
  const addWeight = (w: WeightEntry) => {
    update((s) => ({ ...s, weights: [...s.weights.filter((x) => x.date !== w.date), w].sort((a, b) => a.date.localeCompare(b.date)) }))
    show(`已记录体重 ${w.kg} kg`)
  }
  const setConditions = (c: Condition[], trimester?: 1 | 2 | 3) => {
    update((s) => (s.profile ? { ...s, profile: { ...s.profile, conditions: c, pregnancyTrimester: trimester }, meta: { ...s.meta, profileAt: Date.now() } } : s))
    show(c.length ? `营养模式已更新：${c.length} 个` : '营养模式已全部关闭')
  }
  const goModes = () => {
    setTab('me')
    window.setTimeout(() => document.getElementById('modes-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
  const toggleTrainingDay = () => update((s) => ({ ...s, trainingDays: s.trainingDays.includes(date) ? s.trainingDays.filter((d) => d !== date) : [...s.trainingDays, date] }))
  const setAdaptive = (v: boolean) => update((s) => ({ ...s, settings: { ...s.settings, useAdaptiveTdee: v }, meta: { ...s.meta, settingsAt: Date.now() } }))
  const setProvider = (p: Provider) => update((s) => ({ ...s, settings: { ...s.settings, provider: p }, meta: { ...s.meta, settingsAt: Date.now() } }))
  const markContributed = (id: string) => update((s) => ({ ...s, settings: { ...s.settings, contributedFoodIds: [...new Set([...s.settings.contributedFoodIds, id])] }, meta: { ...s.meta, settingsAt: Date.now() } }))
  const setKey = (p: Provider, k: string) => update((s) => ({ ...s, settings: { ...s.settings, [p === 'deepseek' ? 'deepseekKey' : 'anthropicKey']: k.trim() } }))
  // 导入的数据不带 key，保留本机已填的
  const importState = (ns: AppState) => setState((s) => ({ ...ns, settings: { ...ns.settings, anthropicKey: s.settings.anthropicKey, deepseekKey: s.settings.deepseekKey, sync: s.settings.sync } }))
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
        {speakJob && <SpeakJobBanner job={speakJob} onOpen={openSpeakJob} onDismiss={consumeSpeakJob} />}
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
          <Today date={date} entries={dayEntries} targets={targets} stat={stat} dishMap={dishMap} dishes={allDishes} customFoods={state.customFoods} favorites={state.favorites} onAdd={openAdd} onEdit={(e) => setSheet({ slot: e.slot, editing: e })} planNotes={plan?.notes || []} goPlan={() => setTab('plan')} goModes={goModes} conditions={profile.conditions} trainingDay={profile.conditions.includes('training') ? isTrainingDay : undefined} onToggleTrainingDay={toggleTrainingDay} quickBySlot={quickBySlot} recentDishIds={recentDishIds} onQuickLog={quickLog} onRemove={removeEntry} budgetPicks={budgetPicks} nextSlot={nextSlot} onDislike={dislikeDish} water={dayWater} fluidMl={fluidMl} onSetWater={setWater} />
        )}
        {tab === 'plan' && plan && targets && (
          <PlanView showSodium={showNa} date={date} planFor={planFor} onRerollWeek={rerollWeek} onPickDate={setDate} plan={plan} targets={targets} dishMap={dishMap} dayEntries={dayEntries} onReroll={reroll} onLogMeal={logMeal} onDislike={dislikeDish} isToday={date === today} />
        )}
        {tab === 'analysis' && analysis && targets && (
          <AnalysisView vitals={state.vitals} onAddVital={addVital} onRemoveVital={removeVital} analysis={analysis} targets={targets} weights={state.weights} entries={state.entries} water={state.water} onAddWeight={addWeight} useAdaptive={state.settings.useAdaptiveTdee} onToggleAdaptive={setAdaptive} date={date} profile={profile} dishMap={dishMap} />
        )}
        {tab === 'me' && targets && (
          <MeView profile={profile} targets={targets} state={state} onEdit={() => setEditingProfile(true)} onUndislike={undislikeDish} onImport={importState} onReset={resetAll} dishMap={dishMap} onSetProvider={setProvider} onSetKey={setKey} onSetConditions={setConditions} onMarkContributed={markContributed} sync={{ code: state.settings.sync.code, enabled: state.settings.sync.enabled, status: syncStatus }} onSyncEnable={enableSync} onSyncDisable={disableSync} onSyncNow={() => runSync(false)} canInstall={!!installEvt} onInstall={promptInstall} />
        )}
      </div>

      {tab === 'today' && !sheet && dayEntries.length > 0 && <button className="fab" onClick={() => openAdd()} aria-label="记录餐食"><IconPlus /></button>}

      <nav className="nav">
        <svg className="nav-shore" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden focusable="false"><path d="M0 10V6.5C18 3 34 9 52 5.5C70 2 84 8 100 4.5V10Z" /></svg>
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
        <LogSheet showSodium={showNa} date={date} isToday={date === today} slot={sheet.slot} editing={sheet.editing} dishes={allDishes} dishMap={dishMap} customFoods={state.customFoods}
          favorites={state.favorites} recentBySlot={recentBySlot} onResult={onSheetResult} onAddCustomFood={addCustomFood} onAddCustomDish={addCustomDish} onToggleFavorite={toggleFavorite} llm={llm} defaultLowSalt={profile.conditions.includes('hypertension')}
          speakJob={speakJob} onSpeakStart={runSpeakJob} onConsumeSpeakJob={consumeSpeakJob} />
      )}
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  )
}

