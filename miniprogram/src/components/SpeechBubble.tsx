/** 小管家的气泡。复刻网页版 Creature.tsx 里的 SpeechBubble：白底细描边，左侧一个尖角 */
import { View, Text } from '@tarojs/components'

export function SpeechBubble({ text }: { text: string }) {
  return (
    <View className="bubble">
      <View className="bubble-tail" />
      <Text>{text}</Text>
    </View>
  )
}
