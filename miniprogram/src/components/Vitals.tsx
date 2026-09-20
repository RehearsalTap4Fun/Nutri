/**
 * 血压 / 血糖记录。只在对应的人群模式下出现：高血压给血压，糖尿病给血糖。
 *
 * 这一块不做判读，只负责记和列。判读是医生的事，应用给出的任何数值解释都可能误导。
 */
import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Button } from '@tarojs/components'
import type { VitalEntry } from '@core/types'
import { shortDate } from '@core/dates'

const TAG_LABEL: Record<string, string> = { fasting: '空腹', post2h: '餐后 2 小时', other: '其他' }
const TAGS: Array<VitalEntry['tag']> = ['fasting', 'post2h', 'other']

interface Props {
  kind: 'bp' | 'glucose'
  entries: VitalEntry[]
  date: string
  onAdd: (v: Omit<VitalEntry, 'id'>) => void
  onRemove: (id: string) => void
}

export function Vitals({ kind, entries, date, onAdd, onRemove }: Props) {
  const [sys, setSys] = useState('')
  const [dia, setDia] = useState('')
  const [mmol, setMmol] = useState('')
  const [tag, setTag] = useState<VitalEntry['tag']>('fasting')

  const mine = entries
    .filter((e) => e.kind === kind)
    .sort((a, b) => (a.date + (a.time || '') < b.date + (b.time || '') ? 1 : -1))
    .slice(0, 10)

  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const addBp = () => {
    const s = Number(sys)
    const d = Number(dia)
    if (!(s >= 60 && s <= 260) || !(d >= 30 && d <= 200) || d >= s) {
      Taro.showToast({ title: '血压看起来不对', icon: 'none' })
      return
    }
    onAdd({ date, time: hhmm, kind: 'bp', sys: s, dia: d, updatedAt: Date.now() })
    setSys('')
    setDia('')
    Taro.showToast({ title: '记下了', icon: 'none' })
  }

  const addGlucose = () => {
    const v = Number(mmol)
    if (!(v >= 1 && v <= 40)) {
      Taro.showToast({ title: '血糖看起来不对', icon: 'none' })
      return
    }
    onAdd({ date, time: hhmm, kind: 'glucose', mmol: v, tag, updatedAt: Date.now() })
    setMmol('')
    Taro.showToast({ title: '记下了', icon: 'none' })
  }

  return (
    <View>
      {kind === 'bp' ? (
        <View>
          <View className="field">
            <Text className="k">收缩压 / 高压</Text>
            <Input
              className="ctl"
              type="number"
              value={sys}
              placeholder="mmHg"
              onInput={(e) => setSys(e.detail.value)}
            />
          </View>
          <View className="field">
            <Text className="k">舒张压 / 低压</Text>
            <Input
              className="ctl"
              type="number"
              value={dia}
              placeholder="mmHg"
              onInput={(e) => setDia(e.detail.value)}
            />
          </View>
          <Button className="btn" onClick={addBp}>
            记一次血压
          </Button>
        </View>
      ) : (
        <View>
          <View className="field">
            <Text className="k">血糖</Text>
            <Input
              className="ctl"
              type="digit"
              value={mmol}
              placeholder="mmol/L"
              onInput={(e) => setMmol(e.detail.value)}
            />
          </View>
          <View className="cats">
            {TAGS.map((t) => (
              <Text
                key={t}
                className={t === tag ? 'chip chip-on' : 'chip'}
                onClick={() => setTag(t)}
              >
                {TAG_LABEL[t as string]}
              </Text>
            ))}
          </View>
          <Button className="btn" onClick={addGlucose}>
            记一次血糖
          </Button>
        </View>
      )}

      {mine.length === 0 ? (
        <Text className="entry-sub">还没有记录。</Text>
      ) : (
        mine.map((e) => (
          <View className="entry" key={e.id} onClick={() => onRemove(e.id)}>
            <View>
              <View className="entry-name">
                {e.kind === 'bp'
                  ? `${e.sys} / ${e.dia} mmHg`
                  : `${e.mmol} mmol/L${e.tag ? ` · ${TAG_LABEL[e.tag]}` : ''}`}
              </View>
              <View className="entry-sub">
                {shortDate(e.date)}
                {e.time ? ` ${e.time}` : ''}
              </View>
            </View>
          </View>
        ))
      )}
      {mine.length > 0 ? <Text className="entry-sub">点一条可以删掉。</Text> : null}
    </View>
  )
}
