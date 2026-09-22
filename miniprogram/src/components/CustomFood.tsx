/**
 * 库里没有这个食物时的出路。复刻网页版 `src/ui/LogSheet.tsx` 的 CustomForm，
 * 规则全部来自 `@core/customDish` 与 `@core/dishGuess`，这里只负责点和填。
 *
 * 两个模式：
 * - **按食材搭配**（默认）：营养由食材配比推导，产物是一道带食材构成的菜，
 *   以后搜索、推荐、分析都认它，痛风/高血压那些按食材判定的规则也看得见它。
 *   搜不到时先用菜名猜一遍食材，用户多半只需要改克重。
 * - **按成分表**：照着包装上的营养成分表填。只有一组数值，判不了嘌呤、腌制这些，
 *   但包装食品只有这一条路。
 *
 * 小程序没有「说一句话」和扫码，这两个模式就是这里全部的兜底。
 */
import { useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Button, ScrollView } from '@tarojs/components'
import type { Dish, Ingredient } from '@core/types'
import type { CustomFood as CustomFoodItem } from '@store/storage'
import { INGREDIENTS, INGREDIENT_MAP } from '@data/ingredients'
import { dishNutrients, vegGrams } from '@core/nutrition'
import { CUSTOM_CATS, defaultGrams, draftDish, draftReady, kcalFromMacros } from '@core/customDish'
import type { CustomCat } from '@core/customDish'
import type { DishGuess } from '@core/dishGuess'
import { uid } from '../shared/state'

const r0 = (v: number) => Math.round(v)

/**
 * Taro 会把 `disabled={false}` 渲染成 `disabled="false"` 这个属性，
 * 而 `.btn[disabled]` 是属性选择器 —— 属性在就命中，值是什么它不管，
 * 于是没禁用的按钮也被画成半透明。只在真要禁用时才把这个属性给出去。
 */
const off = (disabled: boolean) => (disabled ? { disabled: true } : {})

interface Props {
  /** 搜不到的那个名字，用来预填 */
  initialName: string
  /** 按菜名猜出来的食材，有就直接铺好 */
  guess: DishGuess | null
  /** 'parts' 按食材搭配 / 'label' 按成分表 */
  initialMode?: 'parts' | 'label'
  onCancel: () => void
  onDish: (d: Dish) => void
  onFood: (f: CustomFoodItem) => void
}

export function CustomFood({ initialName, guess, initialMode = 'parts', onCancel, onDish, onFood }: Props) {
  const [mode, setMode] = useState<'parts' | 'label'>(initialMode)
  const [name, setName] = useState(guess?.name || initialName)

  // ── 按食材搭配 ──
  const [cat, setCat] = useState<CustomCat>(guess?.cat || 'protein')
  const [parts, setParts] = useState<Array<{ ing: string; g: number }>>(guess?.parts || [])
  const cook = guess?.cook || 'normal'
  const [iq, setIq] = useState('')
  const hits = useMemo(() => {
    const q = iq.trim().toLowerCase()
    if (!q) return []
    // 精确 > 前缀 > 包含；同级短名字优先，搜「油」先出植物油而不是油条
    const rank = (i: Ingredient) => {
      const n = i.name.toLowerCase()
      return n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : i.id.includes(q) ? 3 : 9
    }
    return INGREDIENTS.filter((i) => !parts.some((p) => p.ing === i.id) && rank(i) < 9)
      .sort((a, b) => rank(a) - rank(b) || a.name.length - b.name.length)
      .slice(0, 8)
  }, [iq, parts])

  const draft = draftDish({ name, cat, cook, parts })
  const dn = draft ? dishNutrients(draft) : null
  const dveg = draft ? vegGrams(draft) : 0
  const okParts = draftReady({ name, cat, cook, parts })

  const saveDish = () => {
    const d = draftDish({ name, cat, cook, parts }, 'custom_' + uid())
    if (!d) return
    onDish(d)
  }

  // ── 按成分表 ──
  const [serving, setServing] = useState('1份')
  const [v, setV] = useState({ kcal: '', protein: '', fat: '', carbs: '', fiber: '', vegG: '', fruitG: '' })
  const num = (s: string) => (s === '' ? 0 : Number(s) || 0)
  const macroKcal = kcalFromMacros(num(v.protein), num(v.fat), num(v.carbs))
  const kcal = v.kcal === '' ? macroKcal : num(v.kcal)
  const okLabel = !!name.trim() && kcal > 0

  const saveFood = () => {
    if (!okLabel) return
    onFood({
      id: uid(),
      name: name.trim(),
      serving: serving.trim() || '1份',
      nutrients: { kcal, protein: num(v.protein), fat: num(v.fat), carbs: num(v.carbs), fiber: num(v.fiber), sodium: 0 },
      ...(num(v.vegG) > 0 ? { vegG: num(v.vegG) } : {}),
      ...(num(v.fruitG) > 0 ? { fruitG: num(v.fruitG) } : {}),
    })
  }

  const LABEL_FIELDS: Array<[keyof typeof v, string, string]> = [
    ['kcal', '热量', '千卡'],
    ['protein', '蛋白', 'g'],
    ['fat', '脂肪', 'g'],
    ['carbs', '碳水', 'g'],
    ['fiber', '纤维', 'g'],
    ['vegG', '含蔬菜（可选）', 'g'],
    ['fruitG', '含水果（可选）', 'g'],
  ]

  return (
    <View className="card">
      <View className="h2">自己录一个</View>

      <View className="cats">
        <Text className={mode === 'parts' ? 'chip chip-on' : 'chip'} onClick={() => setMode('parts')}>
          按食材搭配
        </Text>
        <Text className={mode === 'label' ? 'chip chip-on' : 'chip'} onClick={() => setMode('label')}>
          按成分表
        </Text>
      </View>

      <Input
        className="search"
        value={name}
        placeholder={mode === 'parts' ? '叫什么，比如 四季豆炒肉' : '叫什么，比如 某牌燕麦棒'}
        onInput={(e) => setName(e.detail.value)}
      />

      {mode === 'parts' ? (
        <View>
          <Text className="muted">
            选食材、填一人份克重，营养自动算出来。以后搜索、推荐、分析都和菜品库里的菜一样。
          </Text>

          <ScrollView scrollX className="cats">
            {CUSTOM_CATS.map(([c, l]) => (
              <Text key={c} className={c === cat ? 'chip chip-on' : 'chip'} onClick={() => setCat(c)}>
                {l}
              </Text>
            ))}
          </ScrollView>

          <Input
            className="search"
            value={iq}
            placeholder="加食材，比如 四季豆、猪瘦肉、油"
            onInput={(e) => setIq(e.detail.value)}
          />
          {hits.length > 0 ? (
            <View className="cats">
              {hits.map((i) => (
                <Text
                  key={i.id}
                  className="chip"
                  onClick={() => {
                    setParts([...parts, { ing: i.id, g: defaultGrams(i) }])
                    setIq('')
                  }}
                >
                  ＋{i.name}
                </Text>
              ))}
            </View>
          ) : null}

          {parts.map((p, idx) => {
            const ing = INGREDIENT_MAP.get(p.ing)
            if (!ing) return null
            return (
              <View className="field" key={p.ing}>
                <Text className="k">{ing.name}</Text>
                <Input
                  className="ctl g-input"
                  type="digit"
                  value={String(p.g)}
                  onInput={(e) => {
                    const g = Number(e.detail.value) || 0
                    setParts(parts.map((x, i) => (i === idx ? { ...x, g } : x)))
                  }}
                />
                <Text className="muted">g</Text>
                <Text className="del" onClick={() => setParts(parts.filter((_, i) => i !== idx))}>
                  移除
                </Text>
              </View>
            )
          })}

          {dn ? (
            <View className="row">
              <Text className="label">一份约</Text>
              <Text className="value">
                {r0(dn.kcal)} 千卡 · 蛋白 {r0(dn.protein)} g · 脂肪 {r0(dn.fat)} g · 碳水 {r0(dn.carbs)} g
                {dveg > 0 ? ` · 蔬菜 ${r0(dveg)} g` : ''}
              </Text>
            </View>
          ) : (
            <Text className="muted">还没有食材。搜一样加进来，克重可以改。</Text>
          )}

          <Button className="btn" {...off(!okParts)} onClick={saveDish}>
            存下来并选用
          </Button>
        </View>
      ) : (
        <View>
          <Text className="muted">照着包装上的营养成分表填一份的量。热量不填就按三大宏量折算。</Text>

          <View className="field">
            <Text className="k">一份是多少</Text>
            <Input
              className="ctl"
              value={serving}
              placeholder="如 1盒(300g)"
              onInput={(e) => setServing(e.detail.value)}
            />
          </View>

          {LABEL_FIELDS.map(([k, label, unit]) => (
            <View className="field" key={k}>
              <Text className="k">{label}</Text>
              <Input
                className="ctl"
                type="digit"
                value={v[k]}
                placeholder="0"
                onInput={(e) => setV({ ...v, [k]: e.detail.value })}
              />
              <Text className="muted">{unit}</Text>
            </View>
          ))}

          {kcal > 0 ? (
            <View className="row">
              <Text className="label">一份</Text>
              <Text className="value">{r0(kcal)} 千卡{v.kcal === '' ? '（按宏量折算）' : ''}</Text>
            </View>
          ) : null}

          <Button className="btn" {...off(!okLabel)} onClick={saveFood}>
            存下来并选用
          </Button>
        </View>
      )}

      <Button className="btn btn-plain" onClick={onCancel}>
        返回搜索
      </Button>

      <Text className="muted tiny-note" onClick={() => Taro.showToast({ title: '自己录的会随云同步到网页版', icon: 'none' })}>
        自己录的东西只存在这台设备，开了云同步就会同步到网页版。
      </Text>
    </View>
  )
}
