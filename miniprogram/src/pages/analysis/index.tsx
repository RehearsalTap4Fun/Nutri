import { View, Text } from '@tarojs/components'
import { DISHES } from '@data/dishes/index'
import { INGREDIENTS } from '@data/ingredients'

export default function Analysis() {
  return (
    <View className="wrap">
      <View className="card">
        <View className="h2">还没搬过来</View>
        <Text className="muted">
          分析页在网页版是三张手写的 SVG 图表。小程序没有 svg 元素，这几张图要改用 canvas 重画，排在录餐之后。
        </Text>
      </View>

      <View className="card">
        <View className="h2">共用的数据已就位</View>
        <View className="row">
          <Text className="label">菜品</Text>
          <Text className="value">{DISHES.length} 道</Text>
        </View>
        <View className="row">
          <Text className="label">食材</Text>
          <Text className="value">{INGREDIENTS.length} 种</Text>
        </View>
        <Text className="muted">
          这两份数据和网页版是同一份源码，小程序这边没有复制副本。
        </Text>
      </View>
    </View>
  )
}
