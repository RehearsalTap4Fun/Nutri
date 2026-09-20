import { useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Picker, Input, Button } from '@tarojs/components'
import type { ActivityLevel, DietStyle, Goal, Profile, Sex } from '@core/types'
import { ageOf, bmi, bmiLabel } from '@core/energy'
import { retire } from '@core/creature'
import { describeCat, isFullyGrown, growthSteps, maxGrowthSteps } from '@core/pixelcat'
import { getLatest, useAppState } from '../../shared/useAppState'
import { diagnose, dropRemote, newSyncCode, normalizeSyncCode, runSync } from '../../shared/sync'
import { CatDexCard } from '../../components/CatDex'
import { PixelCat } from '../../components/PixelCat'

const SEX: Array<[Sex, string]> = [
  ['male', '男'],
  ['female', '女'],
]
const ACTIVITY: Array<[ActivityLevel, string]> = [
  ['sedentary', '久坐，几乎不运动'],
  ['light', '轻度，每周动 1 到 3 次'],
  ['moderate', '中度，每周 3 到 5 次'],
  ['active', '高强度，每周 6 到 7 次'],
  ['very_active', '体力工作或每天两练'],
]
const GOAL: Array<[Goal, string]> = [
  ['lose', '减脂'],
  ['maintain', '维持'],
  ['gain', '增肌'],
]
const STYLE: Array<[DietStyle, string]> = [
  ['chinese', '中式家常'],
  ['low_carb', '低碳水'],
  ['high_protein', '高蛋白'],
  ['mediterranean', '地中海'],
  ['vegetarian', '素食（蛋奶）'],
  ['vegan', '纯素'],
  ['if168', '16:8 轻断食'],
]

function emptyProfile(): Profile {
  return {
    sex: 'male',
    birthYear: new Date().getFullYear() - 30,
    heightCm: 170,
    weightKg: 65,
    activity: 'light',
    goal: 'maintain',
    dietStyle: 'chinese',
    mealsPerDay: 3,
    dislikedDishes: [],
    dislikedIngredients: [],
    allergens: [],
    conditions: [],
  }
}

export default function Me() {
  const [state, update] = useAppState()
  const p = state.profile

  const setProfile = (patch: Partial<Profile>) =>
    update((s) => ({
      ...s,
      profile: { ...(s.profile || emptyProfile()), ...patch },
      meta: { ...s.meta, profileAt: Date.now() },
    }))

  const idx = useMemo(
    () => ({
      sex: p ? SEX.findIndex(([v]) => v === p.sex) : 0,
      activity: p ? ACTIVITY.findIndex(([v]) => v === p.activity) : 1,
      goal: p ? GOAL.findIndex(([v]) => v === p.goal) : 1,
      style: p ? STYLE.findIndex(([v]) => v === p.dietStyle) : 0,
    }),
    [p],
  )

  const creature = state.creature
  const fullyGrown = creature ? isFullyGrown(creature.cat) : false

  const [codeInput, setCodeInput] = useState('')
  const [syncing, setSyncing] = useState(false)
  const sync = state.settings.sync

  const setSync = (next: { code: string; enabled: boolean }) =>
    update((s) => ({
      ...s,
      settings: { ...s.settings, sync: next },
      meta: { ...s.meta, settingsAt: Date.now() },
    }))

  const doSync = async (code: string) => {
    if (syncing) return
    setSyncing(true)
    Taro.showLoading({ title: '同步中' })
    try {
      const r = await runSync(getLatest(), code)
      update(() => r.state)
      Taro.hideLoading()
      Taro.showToast({
        title: r.pulledChanges ? '已拉到云端的改动' : r.pushed ? '已上传' : '已是最新',
        icon: 'none',
      })
    } catch (e) {
      Taro.hideLoading()
      Taro.showModal({
        title: '同步没成功',
        content: e instanceof Error ? e.message : String(e),
        showCancel: false,
      })
    } finally {
      setSyncing(false)
    }
  }

  const enableNew = async () => {
    try {
      const code = await newSyncCode()
      setSync({ code, enabled: true })
      await doSync(code)
    } catch (e) {
      Taro.showModal({ title: '开不了同步', content: String(e), showCancel: false })
    }
  }

  const enableExisting = () => {
    const norm = normalizeSyncCode(codeInput)
    if (!norm) {
      Taro.showToast({ title: '同步码格式不对', icon: 'none' })
      return
    }
    setSync({ code: norm, enabled: true })
    setCodeInput('')
    void doSync(norm)
  }

  const runDiagnose = async () => {
    Taro.showLoading({ title: '自检中' })
    try {
      const steps = await diagnose(sync.code || 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ')
      Taro.hideLoading()
      const text = steps.map((x) => `${x.ok ? '✓' : '✗'} ${x.name}\n    ${x.detail}`).join('\n\n')
      Taro.showModal({ title: '同步自检', content: text, showCancel: false, confirmText: '知道了' })
      console.log('[同步自检]', steps)
    } catch (e) {
      Taro.hideLoading()
      Taro.showModal({ title: '自检本身失败了', content: String(e), showCancel: false })
    }
  }

  const disableSync = () => {
    Taro.showModal({
      title: '关闭同步？',
      content: '本机数据保留。云端副本也一起删掉吗？',
      cancelText: '只关闭',
      confirmText: '连云端一起删',
      success: (r) => {
        const code = sync.code
        setSync({ code: r.confirm ? '' : code, enabled: false })
        if (r.confirm && code) void dropRemote(code).catch(() => undefined)
      },
    })
  }

  const graduate = () => {
    if (!creature) return
    Taro.showModal({
      title: '让它毕业？',
      content: '会换一颗新蛋重新养。现在这只进图鉴，长出来的部件和称号都留着。',
      success: (r) => {
        if (!r.confirm) return
        const now = Date.now()
        update((s) => ({
          ...s,
          creature: null,
          creatureHistory: s.creature ? [...s.creatureHistory, retire(s.creature, now)] : s.creatureHistory,
        }))
        Taro.showToast({ title: '已毕业，换一颗新蛋', icon: 'none' })
      },
    })
  }

  if (!p) {
    return (
      <View className="wrap">
        <View className="card">
          <View className="h1">还没有档案</View>
          <Text className="muted">
            建立档案后，才能按你的身体数据算出每日热量与三大营养素，并据此推荐三餐。
          </Text>
          <Button className="btn" onClick={() => setProfile({})}>
            建立档案
          </Button>
        </View>
      </View>
    )
  }

  const age = ageOf(p.birthYear)
  const b = bmi(p.weightKg, p.heightCm)

  return (
    <View className="wrap">
      <View className="card">
        <View className="h2">身体数据</View>

        <Picker
          mode="selector"
          range={SEX.map(([, l]) => l)}
          value={idx.sex}
          onChange={(e) => setProfile({ sex: SEX[Number(e.detail.value)][0] })}
        >
          <View className="field">
            <Text className="k">性别</Text>
            <Text className="ctl">{SEX[idx.sex][1]}</Text>
          </View>
        </Picker>

        <View className="field">
          <Text className="k">出生年份</Text>
          <Input
            className="ctl"
            type="number"
            value={String(p.birthYear)}
            onInput={(e) => {
              const v = Number(e.detail.value)
              if (v >= 1900 && v <= new Date().getFullYear()) setProfile({ birthYear: v })
            }}
          />
        </View>

        <View className="field">
          <Text className="k">身高（厘米）</Text>
          <Input
            className="ctl"
            type="digit"
            value={String(p.heightCm)}
            onInput={(e) => {
              const v = Number(e.detail.value)
              if (v > 0) setProfile({ heightCm: v })
            }}
          />
        </View>

        <View className="field">
          <Text className="k">体重（公斤）</Text>
          <Input
            className="ctl"
            type="digit"
            value={String(p.weightKg)}
            onInput={(e) => {
              const v = Number(e.detail.value)
              if (v > 0) setProfile({ weightKg: v })
            }}
          />
        </View>

        <View className="field">
          <Text className="k">现在</Text>
          <Text className="ctl">
            {age} 岁 · BMI {b.toFixed(1)}（{bmiLabel(b)}）
          </Text>
        </View>
      </View>

      <View className="card">
        <View className="h2">目标与口味</View>

        <Picker
          mode="selector"
          range={ACTIVITY.map(([, l]) => l)}
          value={idx.activity}
          onChange={(e) => setProfile({ activity: ACTIVITY[Number(e.detail.value)][0] })}
        >
          <View className="field">
            <Text className="k">活动量</Text>
            <Text className="ctl">{ACTIVITY[idx.activity][1]}</Text>
          </View>
        </Picker>

        <Picker
          mode="selector"
          range={GOAL.map(([, l]) => l)}
          value={idx.goal}
          onChange={(e) => setProfile({ goal: GOAL[Number(e.detail.value)][0] })}
        >
          <View className="field">
            <Text className="k">目标</Text>
            <Text className="ctl">{GOAL[idx.goal][1]}</Text>
          </View>
        </Picker>

        <Picker
          mode="selector"
          range={STYLE.map(([, l]) => l)}
          value={idx.style}
          onChange={(e) => setProfile({ dietStyle: STYLE[Number(e.detail.value)][0] })}
        >
          <View className="field">
            <Text className="k">饮食风格</Text>
            <Text className="ctl">{STYLE[idx.style][1]}</Text>
          </View>
        </Picker>

        <Picker
          mode="selector"
          range={['三餐', '三餐 + 加餐']}
          value={p.mealsPerDay === 4 ? 1 : 0}
          onChange={(e) => setProfile({ mealsPerDay: Number(e.detail.value) === 1 ? 4 : 3 })}
        >
          <View className="field">
            <Text className="k">每天几餐</Text>
            <Text className="ctl">{p.mealsPerDay === 4 ? '三餐 + 加餐' : '三餐'}</Text>
          </View>
        </Picker>
      </View>

      <View className="card">
        <View className="h2">健康小管家</View>
        {creature ? (
          <View>
            <View className="cat-row">
              <PixelCat id="meCat" spec={creature.cat} size={128} />
              <View className="cat-info">
                <View className="cat-desc">{describeCat(creature.cat)}</View>
                <Text className="entry-sub">
                  养了 {creature.mutations} 次 · 成长 {growthSteps(creature.cat)} / {maxGrowthSteps()} 阶
                </Text>
              </View>
            </View>
            <Text className="muted">
              {fullyGrown
                ? '已经长齐了。可以让它毕业，换一颗新蛋重新养，长出来的部件都会留在图鉴里。'
                : '还能继续长。毕业会换一颗新蛋，现在这只进图鉴，不会消失。'}
            </Text>
            <Button className="btn btn-plain" onClick={graduate}>
              让它毕业
            </Button>
          </View>
        ) : (
          <Text className="muted">还是一颗蛋。去「今日」记下第一笔就会孵化。</Text>
        )}
      </View>

      <View className="card">
        <View className="h2">云同步</View>
        {sync.enabled && sync.code ? (
          <View>
            <Text className="muted">
              同步码就是钥匙。云端只存密文，服务器解不开，码丢了数据也就取不回来了。在网页版填同一个码，两边就是同一份数据。
            </Text>
            <View className="field">
              <Text className="k">同步码</Text>
              <Text className="ctl code">{sync.code}</Text>
            </View>
            <Button
              className="btn btn-plain"
              onClick={() => {
                Taro.setClipboardData({ data: sync.code })
              }}
            >
              复制同步码
            </Button>
            <Button className="btn" loading={syncing} onClick={() => void doSync(sync.code)}>
              立即同步
            </Button>
            <Button className="btn btn-plain" onClick={() => void runDiagnose()}>
              同步自检
            </Button>
            <Button className="btn btn-plain" onClick={disableSync}>
              关闭同步
            </Button>
          </View>
        ) : (
          <View>
            <Text className="muted">
              开启后换手机不会丢数据。已经在网页版用着的话，把那边的同步码填进来，两边就合成一份。
            </Text>
            <View className="field">
              <Text className="k">已有同步码</Text>
              <Input
                className="ctl"
                value={codeInput}
                placeholder="XXXX-XXXX-…"
                onInput={(e) => setCodeInput(e.detail.value)}
              />
            </View>
            <Button className="btn" onClick={enableExisting}>
              用这个码同步
            </Button>
            <Button className="btn btn-plain" onClick={() => void enableNew()}>
              生成新的同步码
            </Button>
            <Button className="btn btn-plain" onClick={() => void runDiagnose()}>
              同步自检
            </Button>
          </View>
        )}
      </View>

      <CatDexCard creature={creature} history={state.creatureHistory} dex={state.creatureDex} />

      <View className="card">
        <View className="h2">关于这一版</View>
        <Text className="muted">
          目标计算、三餐推荐、菜品与食材数据、小管家的成长规则，用的都是网页版的同一份源码，没有复制也没有改写。
          云同步、喝水与血压血糖记录还没搬过来。
        </Text>
      </View>
    </View>
  )
}
