import { useMemo } from 'react'
import { View, Text, Picker, Input, Button } from '@tarojs/components'
import type { ActivityLevel, DietStyle, Goal, Profile, Sex } from '@core/types'
import { ageOf, bmi, bmiLabel } from '@core/energy'
import { useAppState } from '../../shared/useAppState'

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
        <View className="h2">关于这一版</View>
        <Text className="muted">
          这是小程序版的第一个可跑版本。目标计算、三餐推荐、菜品与食材数据，用的都是网页版的同一份源码，没有复制也没有改写。
          录餐、图表、健康小管家还没搬过来。
        </Text>
      </View>
    </View>
  )
}
