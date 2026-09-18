import { useMemo } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { todayStr } from '@core/dates'
import { useAppState } from '../../shared/useAppState'
import { derive } from '../../shared/derive'

export default function Today() {
  const [state] = useAppState()
  const date = todayStr()
  const d = useMemo(() => derive(state, date), [state, date])

  if (!d.profile || !d.targets) {
    return (
      <View className="wrap">
        <View className="card">
          <View className="h1">先建立档案</View>
          <Text className="muted">
            填上身高、体重、年龄和目标，才能算出今天该吃多少。
          </Text>
          <Button className="btn" onClick={() => Taro.switchTab({ url: '/pages/me/index' })}>
            去「我的」填写
          </Button>
        </View>
      </View>
    )
  }

  const t = d.targets
  const eaten = d.stat ? Math.round(d.stat.n.kcal) : 0
  const remain = Math.max(0, Math.round(t.kcal) - eaten)

  return (
    <View className="wrap">
      <View className="card">
        <Text className="label">今天还可以吃</Text>
        <View className="big">{remain}</View>
        <Text className="muted">
          目标 {Math.round(t.kcal)} 千卡，已记录 {eaten} 千卡
        </Text>
        <View className="macros">
          <View className="macro">
            <View className="k">蛋白质</View>
            <View className="v">{Math.round(t.protein)}g</View>
          </View>
          <View className="macro">
            <View className="k">脂肪</View>
            <View className="v">{Math.round(t.fat)}g</View>
          </View>
          <View className="macro">
            <View className="k">碳水</View>
            <View className="v">{Math.round(t.carbs)}g</View>
          </View>
        </View>
      </View>

      <View className="card">
        <View className="h2">基础代谢与消耗</View>
        <View className="row">
          <Text className="label">基础代谢</Text>
          <Text className="value">{Math.round(t.bmr)} 千卡</Text>
        </View>
        <View className="row">
          <Text className="label">每日总消耗</Text>
          <Text className="value">{Math.round(t.tdee)} 千卡</Text>
        </View>
        <View className="row">
          <Text className="label">计算方法</Text>
          <Text className="value">{t.method === 'katch' ? 'Katch-McArdle' : 'Mifflin-St Jeor'}</Text>
        </View>
        <View className="row">
          <Text className="label">膳食纤维</Text>
          <Text className="value">{Math.round(t.fiber)} g</Text>
        </View>
        <View className="row">
          <Text className="label">钠上限</Text>
          <Text className="value">{Math.round(t.sodiumMax)} mg</Text>
        </View>
      </View>

      <View className="card">
        <View className="h2">记录</View>
        <Text className="muted">
          录餐还没搬到小程序。目前这一页展示的是按你的档案实时算出的目标，数字来自网页版同一套计算。
        </Text>
      </View>
    </View>
  )
}
