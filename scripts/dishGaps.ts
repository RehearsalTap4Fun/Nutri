// 反向找菜品缺口：npm run dishgaps
//
// 思路：不做笛卡尔积（「西瓜炒牛肉」也是个组合），而是从现有中式菜名里挖出「能产的命名模式」
// （被 ≥3 种食材用过的框架，如「蒜蓉◯」「◯炒蛋」），再看同类目里谁还没有这道菜。
//
// 它是**提示器不是生成器**。实测信噪比约 10%：86 条候选里人眼挑出约 8 条真缺的。
// 之所以还值得跑，是因为这 8 条里有几条（萝卜排骨汤、凉拌番茄、红烧牛腩）是
// 正向列 235 个菜名做搜索实测时完全没想到的——正向测只能验证「我想得到的」。
//
// 已知限制：库里没有「什么食材配什么做法」的知识，IngredientCategory 太粗
// （vegetable 底下不分叶菜/茄果/根茎/瓜类），所以会建议出「蒜蓉番茄」「青椒排骨汤」。
// 要提高信噪比得给 Ingredient 加更细的亚类标注，但那要人工标 78 种蔬菜，成本接近直接手写菜。
import { DISHES } from '../src/data/dishes/index'
import { INGREDIENTS } from '../src/data/ingredients'
import { ingredientAliases } from '../src/core/dishGuess'

// 只拿「能当主料出现在菜名里」的食材：蔬菜/菌菇/肉/蛋/豆/薯/水产
const MAIN_CATS = ['vegetable','mushroom','tuber','meat','poultry','seafood','egg','soy','legume']
type Ing = typeof INGREDIENTS[number]
const mains: Array<{ ing: Ing; alias: string }> = []
for (const i of INGREDIENTS) {
  if (!MAIN_CATS.includes(i.cat)) continue
  for (const a of ingredientAliases(i.name)) if (a.length >= 2) mains.push({ ing: i, alias: a })
}
// 从菜名里抠出「模式」：把食材名替换成占位符，剩下的框架就是模式
const frames = new Map<string, Set<string>>()   // 模式 -> 已覆盖的食材 id
const frameCat = new Map<string, Map<string, number>>()  // 模式 -> 该模式下食材类目分布
for (const d of DISHES) {
  if (d.cuisine !== 'cn') continue
  for (const { ing, alias } of mains) {
    if (!d.name.includes(alias)) continue
    const frame = d.name.replace(alias, '◯')
    if (frame === '◯' || frame.length > 7) continue
    if (!frames.has(frame)) { frames.set(frame, new Set()); frameCat.set(frame, new Map()) }
    frames.get(frame)!.add(ing.id)
    const cm = frameCat.get(frame)!
    cm.set(ing.cat, (cm.get(ing.cat) || 0) + 1)
  }
}
const productive = [...frames.entries()].filter(([, s]) => s.size >= 3).sort((a, b) => b[1].size - a[1].size)
console.log(`从 ${DISHES.filter(d=>d.cuisine==='cn').length} 道中式菜里挖出 ${productive.length} 个能产模式（被 ≥3 种食材用过）：\n`)
for (const [f, ids] of productive.slice(0, 22)) {
  const cats = [...frameCat.get(f)!.entries()].sort((a,b)=>b[1]-a[1])
  console.log(`  ${f.padEnd(9,'　')} ${String(ids.size).padStart(2)} 种  主类目 ${cats[0][0]}  例：${[...ids].slice(0,4).map(id=>INGREDIENTS.find(i=>i.id===id)!.name).join('、')}`)
}

// ── 反向：每个能产模式下，同类目里还没被用过的食材 ──
// 关键：用「作为主料出现的次数」而不是「出现过的次数」。洋葱胡萝卜香菜被几十道菜用到，
// 但几乎全是配料；按出现次数排会建议出「清炒洋葱」「凉拌猪瘦肉」这种不成菜的东西。
// 主料 = 在该道菜的 parts 里克重排前二（且 ≥40 g）。
const mainCount = new Map<string, number>()
for (const d of DISHES) {
  const top = [...d.parts].sort((a, b) => b.g - a.g).slice(0, 2).filter((pt) => pt.g >= 40)
  for (const pt of top) mainCount.set(pt.ing, (mainCount.get(pt.ing) || 0) + 1)
}
console.log('\n\n=== 反向缺口：该模式下同类目、且确实当过主料、却还没有这道菜的食材 ===')
let suggestions = 0
for (const [f, ids] of productive) {
  const cats = [...frameCat.get(f)!.entries()].sort((a, b) => b[1] - a[1])
  const domCat = cats[0][0]
  const missing = INGREDIENTS
    .filter((i) => i.cat === domCat && !ids.has(i.id))     // 只取主导类目，不放宽
    .filter((i) => (mainCount.get(i.id) || 0) >= 2)        // 至少当过 2 次主料
    .sort((a, b) => (mainCount.get(b.id) || 0) - (mainCount.get(a.id) || 0))
    .slice(0, 8)
  if (!missing.length) continue
  suggestions += missing.length
  console.log(`\n  【${f.replace('◯', '◯')}】已有 ${ids.size} 种 · 主导类目 ${domCat}`)
  for (const i of missing) {
    console.log(`     ${f.replace('◯', i.name.replace(/[（(].*/, ''))}   (该食材当过 ${mainCount.get(i.id)} 次主料)`)
  }
}
console.log(`\n共给出 ${suggestions} 条候选。这是「值得人眼过一遍的清单」，不是可以直接落库的菜。`)
