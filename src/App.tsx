import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dish, LogEntry, MealSlot, Nutrients, Profile, VitalEntry, WeightEntry } from './core/types'
import { fluidFromDrinks } from './core/water'
import { MEAL_SLOTS } from './core/types'
import { computeTargets } from './core/energy'
import { analyze, dayStat, NO_ADJUST } from './core/analysis'
import { planDay, planWeek } from './core/planner'
import { remainOf, suggestForBudget } from './core/budget'
import { frequentBySlot, frequentDishes } from './core/recent'
import type { MealPlan, PlanItem } from './core/planner'
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
import { SLOT_LABEL, defaultTimeForSlot, entryPortionText, guessSlot, portionText } from './ui/format'
import { entryName, servingGrams } from './core/nutrition'
import { captureInstallPrompt, isIOS, isStandalone, isWeChat, registerSW } from './pwa'
import { deleteRemote, syncOnce, SyncError } from './sync/client'
import { adoptSynced, fingerprint, toSyncState } from './sync/merge'
import * as act from './store/actions'
import { generateSyncCode } from './sync/crypto'
import { hatch, mutate, retire } from './core/creature'
import { recordSpec } from './core/catDex'
import { hashString, makeRng } from './core/rng'
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
  // 换页签回到顶部：四个页签共用同一条滚动轴，不回顶就会落在上一页滚到的位置，
  // 比如从分析页滚到一半点「我的」，开屏是营养模式卡的中间。
  // 换日期不回顶，那时人多半在原地对照前后两天。
  // 进出建档表单同理：表单很长，填完点「开始使用」要从今日页顶上的热量卡看起。
  const inProfileForm = !state.profile || editingProfile
  useEffect(() => { window.scrollTo(0, 0) }, [tab, inProfileForm])
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
      // 照推荐吃就别重排：先看沿用上次的还满不满足全天目标
      keep: state.planPicks[date],
    })
  }, [profile, targets, analysis, stat, state.planSeeds, state.planPicks, state.entries, date, dishMap, allDishes])

  // 把这次给出的推荐记下来，下次先试着沿用。只在真的变了时写，免得每次渲染都触发一次状态更新
  useEffect(() => {
    if (!plan) return
    const next: Partial<Record<MealSlot, PlanItem[]>> = {}
    for (const m of plan.meals) next[m.slot] = m.items
    const prev = state.planPicks[date]
    const same = prev && MEAL_SLOTS.every((s0) => {
      const a = prev[s0]?.map((i) => `${i.dishId}:${i.portion}`).join(',') || ''
      const b = next[s0]?.map((i) => `${i.dishId}:${i.portion}`).join(',') || ''
      return a === b
    })
    if (same) return
    update((s0) => ({ ...s0, planPicks: { ...s0.planPicks, [date]: next } }))
  }, [plan, date])

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
  // 一周的推荐：已吃的餐视为完成，其余按剩余预算给。串行避重的规则在 core/planner 的 planWeek 里
  const planWeekFor = useCallback((dates: string[]) => {
    if (!profile || !targets || !analysis) return dates.map((d) => ({ date: d, plan: null }))
    return planWeek(
      { profile, targets, dishes: allDishes, dishMap, recentEntries: state.entries, adjustments: analysis.adjustments },
      dates,
      (d) => {
        const statD = dayStat(d, state.entries, dishMap, targets.kcal)
        const eaten: Partial<Record<MealSlot, Nutrients>> = {}
        for (const s of MEAL_SLOTS) eaten[s] = statD.bySlot[s]
        const seeds = state.planSeeds[d] || { day: 0, meals: {} }
        // 单日视图沿用的那份推荐，这里也沿用，两个视图对同一天不该给出两套菜
        return { seed: seeds.day, mealSeeds: seeds.meals, eatenToday: eaten, keep: state.planPicks[d] }
      },
    )
  }, [profile, targets, analysis, state.entries, state.planSeeds, state.planPicks, dishMap, allDishes])
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
        setState((s) => adoptSynced(s, r.state))
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
    update((s) => act.enableSync(s, code, mode, now))
    show(mode === 'new' ? '云同步已开启，正在上传…' : '已接入，正在合并云端数据…')
  }
  const disableSync = async (removeRemote: boolean) => {
    const code = state.settings.sync.code
    update((s) => act.disableSync(s))
    lastSyncedFp.current = ''
    if (removeRemote && code) { try { await deleteRemote(code) } catch { /* 网络问题也不阻塞关闭 */ } }
    show(removeRemote ? '已关闭同步并删除云端副本' : '已在本机关闭同步，云端副本保留')
  }
  // ---- 健康小管家：还没孵化时记一笔就孵化（一次随机定型），孵化后每记一笔异变一个特征 ----
  const bumpCreature = () => {
    const now = Date.now()
    const rnd = makeRng(hashString(uid() + now))
    update((s) => {
      const prev = s.creature
      const next = prev ? mutate(prev, now, rnd) : hatch(uid(), now, rnd)
      // 图鉴在这里记：新出现的部件与新达成的称号各 +1。孵化时 prev 传 null，自带的那件也要记
      return { ...s, creature: next, creatureDex: recordSpec(s.creatureDex, prev ? prev.cat : null, next.cat) }
    })
  }
  const reforgeCreature = () => {
    const now = Date.now()
    update((s) => ({ ...s, creature: null, creatureHistory: s.creature ? [...s.creatureHistory, retire(s.creature, now)] : s.creatureHistory }))
    show('已毕业，换一颗新蛋')
  }

  /** 记一笔的提示：第一次记录、这台设备还没配过同步码时，顺手自动开起来（可在「我的」手动关闭）；顺带喂一下小管家 */
  const noticeAfterLog = (text: string, undo: () => void) => {
    bumpCreature()
    if (state.entries.length === 0 && !state.settings.sync.code) {
      enableSync(generateSyncCode(), 'new')
      show(`${text} · 已自动开启云同步，同步码在「我的」页可查看`, { label: '撤销', run: undo })
    } else {
      show(text, { label: '撤销', run: undo })
    }
  }

  // ---- actions ----
  const saveProfile = (p: Profile) => {
    update((s) => act.patchProfile(s, p, Date.now(), p))
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

  const removeEntries = (ids: string[]) => update((s) => act.removeEntries(s, ids, Date.now()))
  const restoreEntries = (list: LogEntry[]) => update((s) => act.addEntries(s, list, Date.now()))

  const onSheetResult = (r: LogSheetResult) => {
    if (r.kind === 'save') {
      const isEdit = !!r.entry.id && state.entries.some((e) => e.id === r.entry.id)
      const entry = { ...r.entry, id: r.entry.id || uid() }
      update((s) => act.saveEntry(s, entry, Date.now()))
      if (!isEdit) noticeAfterLog(`已记录 · ${entryName(entry, dishMap)} × ${entryPortionText(entry, dishMap)}`, () => removeEntries([entry.id]))
      else show('已保存修改')
    } else if (r.kind === 'saveMany') {
      update((s) => act.saveCustomFoods(act.addEntries(s, r.entries, Date.now()), r.customFoods, Date.now()))
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
    update((s) => act.saveCustomDish(s, d, Date.now()))
    show(`已保存自建菜「${d.name}」，以后搜索、推荐都能用`)
  }
  const addCustomFood = (f: CustomFood) => update((s) => act.saveCustomFoods(s, [f], Date.now()))
  const toggleFavorite = (id: string) => update((s) => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] }))

  const reroll = (slot?: MealSlot) => update((s) => act.reroll(s, [date], slot))

  const logMeal = (meal: MealPlan) => {
    const time = date === today ? nowTimeStr() : defaultTimeForSlot(meal.slot)
    const entries: LogEntry[] = meal.items.map((it) => ({ id: uid(), updatedAt: Date.now(), date, slot: meal.slot, time, dishId: it.dishId, portion: it.portion, ...(it.lowOil ? { lowOil: true } : {}) }))
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

  const rerollWeek = (dates: string[]) => update((s) => act.reroll(s, dates))
  const addVital = (v: Omit<VitalEntry, 'id'>) => {
    const entry: VitalEntry = { ...v, id: uid() }
    update((s) => act.addVital(s, entry, Date.now()))
    show(v.kind === 'bp' ? `已记录血压 ${v.sys}/${v.dia}` : `已记录血糖 ${v.mmol} mmol/L`, { label: '撤销', run: () => removeVital(entry.id) })
  }
  const removeVital = (id: string) => update((s) => act.removeVital(s, id, Date.now()))

  const dislikeDish = (id: string) => {
    update((s) => act.dislikeDish(s, id, Date.now()))
    show(`以后不再推荐「${dishMap.get(id)?.name || id}」`, { label: '撤销', run: () => undislikeDish(id) })
  }
  const undislikeDish = (id: string) => update((s) => act.undislikeDish(s, id, Date.now()))

  // 饮水按杯点亮：把这一天的总量设为 ml（旧记录打墓碑，新写一条），toast 可撤销
  const setWater = (ml: number) => {
    const prev = state.water.filter((w) => w.date === date)
    const prevMl = prev.reduce((s, w) => s + w.ml, 0)
    const newId = uid()
    update((s) => act.setWater(s, date, ml, Date.now(), newId, date === today ? nowTimeStr() : undefined))
    if (ml > prevMl) bumpCreature()
    const cupsN = Math.round(ml / 250)
    show(ml > 0 ? `喝到第 ${cupsN} 杯 · ${Math.round(ml)} ml` : '今天的饮水清零了', {
      label: '撤销',
      run: () => update((s) => act.restoreWater(s, date, prev, ml > 0 ? newId : null, Date.now())),
    })
  }
  const addWeight = (w: WeightEntry) => {
    update((s) => act.setWeight(s, w.date, w.kg, Date.now()))
    show(`已记录体重 ${w.kg} kg`)
  }
  const setConditions = (c: Condition[], trimester?: 1 | 2 | 3) => {
    update((s) => act.patchProfile(s, { conditions: c, pregnancyTrimester: trimester }, Date.now()))
    show(c.length ? `营养模式已更新：${c.length} 个` : '营养模式已全部关闭')
  }
  const goModes = () => {
    setTab('me')
    window.setTimeout(() => document.getElementById('modes-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
  const toggleTrainingDay = () => update((s) => ({ ...s, trainingDays: s.trainingDays.includes(date) ? s.trainingDays.filter((d) => d !== date) : [...s.trainingDays, date] }))
  const setAdaptive = (v: boolean) => update((s) => act.patchSettings(s, { useAdaptiveTdee: v }, Date.now()))
  const setProvider = (p: Provider) => update((s) => act.patchSettings(s, { provider: p }, Date.now()))
  const markContributed = (id: string) => update((s) => act.patchSettings(s, { contributedFoodIds: [...new Set([...s.settings.contributedFoodIds, id])] }, Date.now()))
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
          <Today date={date} entries={dayEntries} targets={targets} stat={stat} dishMap={dishMap} dishes={allDishes} customFoods={state.customFoods} favorites={state.favorites} onAdd={openAdd} onEdit={(e) => setSheet({ slot: e.slot, editing: e })} planNotes={plan?.notes || []} goPlan={() => setTab('plan')} goModes={goModes} conditions={profile.conditions} trainingDay={profile.conditions.includes('training') ? isTrainingDay : undefined} onToggleTrainingDay={toggleTrainingDay} quickBySlot={quickBySlot} recentDishIds={recentDishIds} onQuickLog={quickLog} onRemove={removeEntry} budgetPicks={budgetPicks} nextSlot={nextSlot} onDislike={dislikeDish} water={dayWater} fluidMl={fluidMl} onSetWater={setWater} creature={state.creature} findings={analysis?.findings ?? []} />
        )}
        {tab === 'plan' && plan && targets && (
          <PlanView adjustments={analysis?.adjustments ?? NO_ADJUST} profile={profile} date={date} planWeek={planWeekFor} onRerollWeek={rerollWeek} onPickDate={setDate} plan={plan} targets={targets} dishMap={dishMap} dayEntries={dayEntries} onReroll={reroll} onLogMeal={logMeal} onDislike={dislikeDish} isToday={date === today} budgetPicks={budgetPicks} nextSlot={nextSlot} onQuickLog={quickLog} />
        )}
        {tab === 'analysis' && analysis && targets && (
          <AnalysisView vitals={state.vitals} onAddVital={addVital} onRemoveVital={removeVital} analysis={analysis} targets={targets} weights={state.weights} entries={state.entries} water={state.water} onAddWeight={addWeight} useAdaptive={state.settings.useAdaptiveTdee} onToggleAdaptive={setAdaptive} date={date} profile={profile} dishMap={dishMap} />
        )}
        {tab === 'me' && targets && (
          <MeView profile={profile} targets={targets} state={state} onEdit={() => setEditingProfile(true)} onUndislike={undislikeDish} onImport={importState} onReset={resetAll} dishMap={dishMap} onSetProvider={setProvider} onSetKey={setKey} onSetConditions={setConditions} onMarkContributed={markContributed} sync={{ code: state.settings.sync.code, enabled: state.settings.sync.enabled, status: syncStatus }} onSyncEnable={enableSync} onSyncDisable={disableSync} onSyncNow={() => runSync(false)} canInstall={!!installEvt} onInstall={promptInstall} onReforgeCreature={reforgeCreature} />
        )}
      </div>

      {tab === 'today' && !sheet && <button className="fab" onClick={() => openAdd()} aria-label="记录餐食"><IconPlus /></button>}

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
        <LogSheet date={date} isToday={date === today} slot={sheet.slot} editing={sheet.editing} dishes={allDishes} dishMap={dishMap} customFoods={state.customFoods}
          favorites={state.favorites} recentBySlot={recentBySlot} onResult={onSheetResult} onAddCustomFood={addCustomFood} onAddCustomDish={addCustomDish} onToggleFavorite={toggleFavorite} llm={llm}
          speakJob={speakJob} onSpeakStart={runSpeakJob} onConsumeSpeakJob={consumeSpeakJob} />
      )}
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  )
}

