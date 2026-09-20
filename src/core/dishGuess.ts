// 搜不到菜时，把用户输入的菜名拆成食材猜测，直接喂给「按食材搭配」自建菜，省掉从零挑food的步骤。
// 只做保守猜测：认出食材名与做法词，克重取该类目的一人份常见量；猜不准没关系，用户在自建表单里能改。
import type { CookStyle, Ingredient, IngredientCategory } from './types'

export interface DishGuess {
  name: string
  cook: CookStyle
  /** 主食/荤菜/素菜/汤 的粗判，用来预选自建表单的类别 */
  cat: 'staple' | 'protein' | 'veg' | 'soup'
  parts: Array<{ ing: string; g: number }>
  /** 命中的食材名，用于在界面上说明「认出了什么」 */
  matched: string[]
}

/** 一人份常见克重，按类目给默认值 */
const DEFAULT_G: Partial<Record<IngredientCategory, number>> = {
  vegetable: 150, mushroom: 120, tuber: 150, grain: 100, fruit: 150,
  meat: 80, poultry: 80, seafood: 100, egg: 100, soy: 100, legume: 40, dairy: 200, nut: 20,
}
/** 做法词 → 烹饪方式与用油量（g）。顺序即优先级，越靠前越具体 */
const COOK_WORDS: Array<[RegExp, CookStyle, number]> = [
  [/油炸|炸|酥|脆皮/, 'fried', 18],
  [/红烧|干锅|回锅|爆炒|干煸|重油|焖|烧/, 'heavy', 15],
  [/清蒸|白灼|水煮|清炒|凉拌|蒸|煮|炖|汆|烩|汤/, 'light', 5],
  [/炒|煎|溜|爆/, 'normal', 10],
]

/**
 * 口语叫法 → 食材 id。库里的正式名对不上用户实际会打的字，这里补一层：
 * 「肉末豇豆」的肉末对应 pork_ground，「西红柿炒蛋」的西红柿对应 tomato。
 */
const SYNONYMS: Record<string, string> = {
  肉末: 'pork_ground', 肉沫: 'pork_ground', 肉糜: 'pork_ground', 肉馅: 'pork_ground', 猪肉末: 'pork_ground',
  肉丝: 'pork_lean', 肉片: 'pork_lean', 瘦肉: 'pork_lean', 猪肉: 'pork_lean',
  五花: 'pork_belly', 西红柿: 'tomato', 菜花: 'cauliflower', 花椰菜: 'cauliflower',
  豆腐: 'tofu', 青菜: 'bok_choy', 鸡蛋: 'egg', 炒蛋: 'egg', 蒸蛋: 'egg', 蛋花: 'egg', 滑蛋: 'egg', 鸡块: 'chicken_thigh', 鸡腿: 'chicken_thigh',
  牛肉: 'beef_lean', 羊肉: 'lamb', 大虾: 'shrimp', 虾仁: 'shrimp', 土豆: 'potato',
}

/**
 * 食材名里可检索的写法：整名、去掉括号后的名、以及括号内按 / 拆出的名。
 * 「海鱼(带鱼/黄鱼)」要能被「红烧带鱼」搜到，所以括号里的字也得参与匹配。
 */
export function ingredientAliases(name: string): string[] {
  const out = new Set<string>()
  const inner = [...name.matchAll(/[（(]([^）)]*)[）)]/g)].map((m) => m[1])
  const bare = name.replace(/[（(][^）)]*[）)]/g, '')
  for (const chunk of [bare, ...inner]) {
    for (const piece of chunk.split(/[\/／、]/)) {
      const t = piece.trim()
      // 「(生)」「(煮熟)」这类状态词不是食材名，跳过
      if (t.length >= 2 && !/^(生|干|鲜|熟|煮熟|水发|可食部|近似|即食|带皮|去皮|无糖|含糖)$/.test(t)) out.add(t)
    }
  }
  return [...out]
}

/**
 * 从菜名猜食材。命中不足 1 个食材时返回 null（说明这名字里没有能认出的东西）。
 * 匹配用最长优先，避免「豆腐干」被「豆腐」先吃掉。
 */
export function guessDishFromName(query: string, ingredients: Ingredient[]): DishGuess | null {
  const q = query.trim()
  if (q.length < 2) return null

  const byId = new Map(ingredients.map((i) => [i.id, i]))
  const cand: Array<{ alias: string; ing: Ingredient }> = []
  for (const ing of ingredients) {
    for (const alias of ingredientAliases(ing.name)) cand.push({ alias, ing })
  }
  for (const [word, id] of Object.entries(SYNONYMS)) {
    const ing = byId.get(id)
    if (ing) cand.push({ alias: word, ing })
  }
  cand.sort((a, b) => b.alias.length - a.alias.length)

  // 已被占用的字符区间，防止同一段文字被两个食材重复认领
  const taken: Array<[number, number]> = []
  const overlaps = (s: number, e: number) => taken.some(([a, b]) => s < b && a < e)
  const picked: Ingredient[] = []
  const matched: string[] = []
  for (const { alias, ing } of cand) {
    if (picked.some((p) => p.id === ing.id)) continue
    const i = q.indexOf(alias)
    if (i < 0 || overlaps(i, i + alias.length)) continue
    taken.push([i, i + alias.length])
    picked.push(ing)
    matched.push(ing.name)
    if (picked.length >= 6) break
  }
  if (!picked.length) return null

  let cook: CookStyle = 'normal'
  let oilG = 10
  for (const [re, c, g] of COOK_WORDS) {
    if (re.test(q)) { cook = c; oilG = g; break }
  }

  const parts = picked
    .filter((i) => i.cat !== 'oil' && i.cat !== 'condiment')
    .map((i) => ({ ing: i.id, g: DEFAULT_G[i.cat] ?? 100 }))
  if (!parts.length) return null
  // 菜名里没点出油盐时补上，否则热量与钠会明显偏低
  if (!picked.some((i) => i.cat === 'oil') && cook !== 'light') parts.push({ ing: 'oil', g: oilG })
  else if (cook === 'light') parts.push({ ing: 'oil', g: oilG })
  if (!picked.some((i) => i.cat === 'condiment')) parts.push({ ing: 'salt', g: 1.2 })

  const has = (...cats: IngredientCategory[]) => picked.some((i) => cats.includes(i.cat))
  const cat: DishGuess['cat'] = /汤|羹|煲$/.test(q) ? 'soup'
    : has('meat', 'poultry', 'seafood', 'egg') ? 'protein'
    : has('grain', 'tuber') && !has('vegetable', 'mushroom') ? 'staple'
    : has('vegetable', 'mushroom') ? 'veg'
    : 'protein'
  return { name: q, cook, cat, parts, matched }
}
