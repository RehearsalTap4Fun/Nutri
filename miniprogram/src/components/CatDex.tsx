/**
 * 图鉴：跨猫的收集账本。
 *
 * 判定全部来自共用源码：`CAT_LINES` 给每个槽位的进化链，`CAT_TIER` 给品质，
 * `dexOwned` / `dexTotals` 给收集进度，`titlesFor` 给当前达成的称号。这里只负责排版。
 */
import { View, Text } from '@tarojs/components'
import type { Creature, RetiredCreature } from '@core/creature'
import { PERSONALITY_LABEL } from '@core/creature'
import {
  CAT_LINES,
  CAT_LINE_NAMES,
  CAT_NAMES,
  CAT_SLOT_NAMES,
  CAT_TIER,
  MUTATION_SLOTS,
  TIER_NAMES,
} from '@core/pixelcat'
import type { CatSpec } from '@core/pixelcat'
import { CAT_TITLES, titlesFor } from '@core/catTitles'
import { dexOwned, dexTotals } from '@core/catDex'
import type { CatDex } from '@core/catDex'
import { PixelCat } from './PixelCat'

/** 部件图鉴：按槽位 × 进化链 × 阶排格，没见过的显示问号 */
function PartDex({ dex, current }: { dex: CatDex; current: CatSpec | null }) {
  return (
    <View>
      {MUTATION_SLOTS.map((slot) => (
        <View className="dex-slot" key={slot}>
          <Text className="dex-slot-name">{CAT_SLOT_NAMES[slot]}</Text>
          {Object.entries(CAT_LINES[slot]).map(([line, parts]) => (
            <View className="dex-line" key={line}>
              <Text className="dex-line-name">{CAT_LINE_NAMES[line] || line}</Text>
              {parts.map((part) => {
                const times = dex.parts[part] || 0
                const owned = times > 0
                const onNow = current ? MUTATION_SLOTS.some((s) => current[s] === part) : false
                const cls = ['dex-cell', owned ? 'dex-own' : 'dex-unknown', onNow ? 'dex-now' : '']
                  .filter(Boolean)
                  .join(' ')
                return (
                  <Text className={cls} key={part}>
                    {owned ? `${CAT_NAMES[part]}${times > 1 ? ` ×${times}` : ''}` : '？'}
                  </Text>
                )
              })}
            </View>
          ))}
        </View>
      ))}
      <Text className="entry-sub">
        深色描边的是现在身上这件。括号里的数字是养过的猫里出现过几只。
      </Text>
    </View>
  )
}

/** 称号：达成过的显示名字，没达成的只给凑法 */
function TitleDex({ dex, current }: { dex: CatDex; current: CatSpec | null }) {
  const now = new Set(current ? titlesFor(current) : [])
  return (
    <View>
      {CAT_TITLES.map((t) => {
        const times = dex.titles[t.id] || 0
        const owned = times > 0
        return (
          <View className="title-row" key={t.id}>
            <Text className={owned ? 'title-name' : 'title-name title-locked'}>
              {owned ? t.name : '？？'}
            </Text>
            <View className="title-body">
              <Text className="title-hint">{t.hint}</Text>
              <Text className="title-meta">
                {now.has(t.id) ? '现在就是' : owned ? `出现过 ${times} 只` : '还没达成'}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

export function CatDexCard({
  creature,
  history,
  dex,
}: {
  creature: Creature | null
  history: RetiredCreature[]
  dex: CatDex
}) {
  const owned = dexOwned(dex)
  const totals = dexTotals()
  const current = creature ? creature.cat : null
  // 每只历史猫都要一块画布，多了会拖慢页面，只显示最近几只
  const recent = history.slice(-6).reverse()

  return (
    <View>
      <View className="card">
        <View className="h2">图鉴</View>
        <View className="row">
          <Text className="label">部件</Text>
          <Text className="value">
            {owned.parts} / {totals.parts}
          </Text>
        </View>
        <View className="row">
          <Text className="label">称号</Text>
          <Text className="value">
            {owned.titles} / {totals.titles}
          </Text>
        </View>
        <View className="row">
          <Text className="label">养过</Text>
          <Text className="value">{history.length + (creature ? 1 : 0)} 只</Text>
        </View>
        <View className="dex-wrap">
          <PartDex dex={dex} current={current} />
        </View>
      </View>

      <View className="card">
        <View className="h2">称号</View>
        <TitleDex dex={dex} current={current} />
      </View>

      {recent.length > 0 ? (
        <View className="card">
          <View className="h2">毕业过的</View>
          <View className="hist">
            {recent.map((c, i) => (
              <View className="hist-item" key={c.id}>
                <PixelCat id={`hist${i}`} spec={c.cat} size={64} />
                <Text className="hist-meta">
                  {CAT_NAMES[c.cat.coat] || c.cat.coat}
                  {'\n'}
                  {PERSONALITY_LABEL[c.personality]} · {c.mutations} 次
                </Text>
              </View>
            ))}
          </View>
          {history.length > recent.length ? (
            <Text className="entry-sub">另有 {history.length - recent.length} 只更早的没显示。</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
