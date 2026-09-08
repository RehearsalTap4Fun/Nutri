// 食物库严格审计：对台湾食药署实测值逐条比对，超阈值的偏差必须在 accepted.json 里写明理由；
// 另有几条结构性规则（动物性食材碳水、植物性食材纤维）。方法与结果见 docs/audit.md。
import { describe, expect, it } from 'vitest'
import { INGREDIENTS, INGREDIENT_MAP } from '../src/data/ingredients'
import ref from '../scripts/audit/tfdaRef.json'
import accepted from '../scripts/audit/accepted.json'

type Ref = { id: string; name: string; tw: { id: string; name: string; kcal: number | null; protein: number | null; fat: number | null; carbs: number | null; fiber: number | null } }
const REF = ref as Ref[]
const ACCEPTED = accepted as Record<string, string>

/** 偏差判定：热量差 >20% 且 >20 千卡；蛋白/脂肪/碳水差 >25% 且 >2.5 g；纤维差 >50% 且 >1.5 g */
export function deviations(ours: { kcal: number; protein: number; fat: number; carbs: number; fiber: number }, tw: Ref['tw']): string[] {
  const out: string[] = []
  if (tw.kcal != null && Math.abs(ours.kcal - tw.kcal) > Math.max(20, 0.2 * tw.kcal)) out.push('kcal')
  for (const k of ['protein', 'fat', 'carbs'] as const) {
    const t = tw[k]
    if (t != null && Math.abs(ours[k] - t) > Math.max(2.5, 0.25 * t)) out.push(k)
  }
  if (tw.fiber != null && Math.abs(ours.fiber - tw.fiber) > Math.max(1.5, 0.5 * tw.fiber)) out.push('fiber')
  return out
}

describe('食物库审计 · 对台湾食药署实测值', () => {
  it('参考表里的每个 id 都还在库里', () => {
    for (const r of REF) expect(INGREDIENT_MAP.has(r.id), r.id).toBe(true)
  })
  it('超阈值的偏差都有书面理由（accepted.json）', () => {
    const missing: string[] = []
    for (const r of REF) {
      const i = INGREDIENT_MAP.get(r.id)!
      const d = deviations(i.per100, r.tw)
      if (d.length && !ACCEPTED[r.id]) missing.push(`${r.id} ${r.name} ⚠${d.join(',')} 我们 ${i.per100.kcal}/${i.per100.protein}/${i.per100.fat}/${i.per100.carbs}/${i.per100.fiber} 台 ${r.tw.kcal}/${r.tw.protein}/${r.tw.fat}/${r.tw.carbs}/${r.tw.fiber} ← ${r.tw.name}`)
    }
    expect(missing, missing.join('\n')).toEqual([])
  })
  it('accepted.json 里没有已经不再偏差的陈旧条目', () => {
    const stale = Object.keys(ACCEPTED).filter((id) => { const r = REF.find((x) => x.id === id); return !r || deviations(INGREDIENT_MAP.get(id)!.per100, r.tw).length === 0 })
    expect(stale, stale.join(', ')).toEqual([])
  })
  it('至少覆盖 270 个食材，且纤维系统性偏低已消除（偏低条目不超过可比项的 45%）', () => {
    expect(REF.length).toBeGreaterThanOrEqual(270)
    const comparable = REF.filter((r) => r.tw.fiber != null && r.tw.fiber >= 1)
    const low = comparable.filter((r) => INGREDIENT_MAP.get(r.id)!.per100.fiber - r.tw.fiber! < -0.5)
    expect(low.length / comparable.length).toBeLessThan(0.45)
  })
})

describe('食物库审计 · 结构性规则', () => {
  // 加工肉制品（含淀粉/糖）与内脏（糖原）本就有碳水，不在此规则内
  const processed = /肠|丸|午餐肉|火腿|培根|饼|鸡块|炸|排\(|馅|鸭脖|卤|烤鸭|凤爪|肉干|肝|舌|心|肚|腰|胗/
  it('纯肉禽类食材碳水不超过 1.5 g（中国表的差减法残差已归零）', () => {
    const bad = INGREDIENTS.filter((i) => (i.cat === 'meat' || i.cat === 'poultry') && !processed.test(i.name) && i.per100.carbs > 1.5).map((i) => `${i.name} ${i.per100.carbs}`)
    expect(bad, bad.join(', ')).toEqual([])
  })
  it('蛋类碳水不超过 5 g', () => {
    const bad = INGREDIENTS.filter((i) => i.cat === 'egg' && i.per100.carbs > 5).map((i) => `${i.name} ${i.per100.carbs}`)
    expect(bad, bad.join(', ')).toEqual([])
  })
  it('植物性食材都有纤维值（纯淀粉、糖、油、汁除外）', () => {
    const plant = new Set(['grain', 'tuber', 'vegetable', 'mushroom', 'fruit', 'legume', 'nut', 'soy'])
    const exempt = /淀粉|珍珠|糖|油|汁|酒|饮|浆|米饭|白粥|白饭/
    const bad = INGREDIENTS.filter((i) => plant.has(i.cat) && !exempt.test(i.name) && i.per100.fiber <= 0).map((i) => i.name)
    expect(bad, bad.join(', ')).toEqual([])
  })
  it('热量与宏量自洽（差 >25% 且 >40 千卡的只能是酒类或香料）', () => {
    const bad = INGREDIENTS.filter((i) => {
      const est = 4 * i.per100.protein + 9 * i.per100.fat + 4 * i.per100.carbs
      return i.per100.kcal > 20 && Math.abs(i.per100.kcal - est) > Math.max(40, 0.25 * est) && !/酒|香料|花椒|辣椒粉|咖喱粉|桂皮|螺旋藻|茴香|八角|孜然/.test(i.name)
    }).map((i) => `${i.name} ${i.per100.kcal} vs ${Math.round(4 * i.per100.protein + 9 * i.per100.fat + 4 * i.per100.carbs)}`)
    expect(bad, bad.join(', ')).toEqual([])
  })
})
