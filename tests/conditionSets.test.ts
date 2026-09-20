// core/conditions.ts 里的食材集合是硬编码 id 清单，补录食材时极易漏登记——
// 漏一条，该食材对特殊人群模式就完全隐形（2026-09 就是这样漏掉了全部内脏和贝类，
// 痛风模式对「爆炒腰花」「蒜蓉生蚝」一律判为安全）。
// 这里用行为断言把规则锁住：结构守卫保证将来补录新肉类会直接让测试失败。
import fs from 'node:fs'
import { CANDIDATES } from '../scripts/data/gapCandidates'
import { describe, expect, it } from 'vitest'
import { INGREDIENTS, INGREDIENT_MAP } from '../src/data/ingredients'
import { DISHES } from '../src/data/dishes/index'
import { conditionExcludes, conditionWeight, dairyGrams, hasPurineLevel, isAcidicDish, isFattyMeat, isHardToChew, isHighPurine, isMediumPurine, isPickledOrCured, isRefinedStaple, isWholeGrain } from '../src/core/conditions'
import type { Dish, Profile } from '../src/core/types'

/** 只含单一食材的探针菜，用来反查某食材落在哪个集合里 */
function probe(ing: string, g = 100, cat: Dish['cat'] = 'protein'): Dish {
  return { id: 'probe_' + ing, name: 'probe', cat, cuisine: 'cn', cook: 'normal', slots: ['lunch'], serving: '1 份', parts: [{ ing, g }] }
}
const dish = (name: string): Dish => {
  const d = DISHES.find((x) => x.name === name)
  if (!d) throw new Error(`菜品不存在: ${name}`)
  return d
}

describe('嘌呤集合', () => {
  it('每一种畜禽鱼贝食材都必须有嘌呤等级（补录新肉类忘了登记会在这里失败；确属低嘌呤的登记进 PURINE_LOW）', () => {
    const uncovered = INGREDIENTS
      .filter((i) => ['meat', 'poultry', 'seafood'].includes(i.cat))
      .filter((i) => !hasPurineLevel(i.id))
      .map((i) => `${i.id}(${i.name})`)
    expect(uncovered).toEqual([])
  })

  it('内脏一律高嘌呤', () => {
    for (const id of ['pork_liver', 'pork_kidney', 'pork_heart', 'pork_intestine', 'beef_tripe', 'chicken_liver', 'chicken_gizzard']) {
      expect(INGREDIENT_MAP.has(id), `食材 ${id} 不存在`).toBe(true)
      expect(isHighPurine(probe(id)), `${INGREDIENT_MAP.get(id)?.name} 应判高嘌呤`).toBe(true)
    }
  })

  it('贝类与头足一律高嘌呤', () => {
    for (const id of ['clam', 'oyster', 'mussel', 'scallop', 'abalone', 'octopus', 'squid']) {
      expect(isHighPurine(probe(id)), `${INGREDIENT_MAP.get(id)?.name} 应判高嘌呤`).toBe(true)
    }
  })

  it('痛风模式下这些真实菜品必须命中高嘌呤（2026-09 回归）', () => {
    for (const name of ['爆炒腰花', '干锅肥肠', '凉拌牛肚', '尖椒炒鸡胗', '猪心汤', '泡椒腰花面',
      '蒜蓉生蚝', '白灼青口', '蒜蓉粉丝扇贝', '鲍鱼捞饭', '章鱼小丸子(6个)', '夫妻肺片']) {
      expect(isHighPurine(dish(name)), `${name} 应判高嘌呤`).toBe(true)
    }
  })

  it('低嘌呤的蛋奶豆不应被误判', () => {
    for (const id of ['egg', 'milk', 'tofu', 'rice_cooked', 'potato']) {
      expect(isHighPurine(probe(id)), `${id} 不应判高嘌呤`).toBe(false)
    }
  })

  it('血制品登记为低嘌呤，痛风模式不得按肉降权', () => {
    for (const id of ['pork_blood', 'duck_blood']) {
      expect(hasPurineLevel(id), `${id} 应已登记嘌呤等级`).toBe(true)
      expect(isHighPurine(probe(id)), `${INGREDIENT_MAP.get(id)?.name} 不应判高嘌呤`).toBe(false)
      expect(isMediumPurine(probe(id)), `${INGREDIENT_MAP.get(id)?.name} 不应判中嘌呤`).toBe(false)
    }
  })
})

describe('深色叶菜集合（备孕模式补叶酸）', () => {
  const pregnant: Profile = {
    sex: 'female', birthYear: 1994, heightCm: 163, weightKg: 58, activity: 'light', goal: 'maintain',
    dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: ['preconception'],
  }
  const isLeafy = (id: string) => conditionWeight(probe(id, 150, 'veg'), 'veg', pregnant).reason === '深绿叶菜补叶酸'

  it('库里的深色叶菜都已登记', () => {
    for (const id of ['spinach', 'choy_sum', 'water_spinach', 'bok_choy', 'youmaicai', 'garlic_chives',
      'gai_lan', 'garland_chrysanthemum', 'amaranth_leaves', 'sweet_potato_leaves', 'mustard_greens', 'kale', 'arugula', 'pumpkin_leaves']) {
      expect(INGREDIENT_MAP.has(id), `食材 ${id} 不存在`).toBe(true)
      expect(isLeafy(id), `${INGREDIENT_MAP.get(id)?.name} 应计入深色叶菜`).toBe(true)
    }
  })

  it('浅色/结球蔬菜与茎菜不计入（叶酸密度不够，计入会虚高摄入量）', () => {
    for (const id of ['chinese_cabbage', 'cabbage', 'red_cabbage', 'celtuce', 'cucumber', 'potato']) {
      expect(isLeafy(id), `${INGREDIENT_MAP.get(id)?.name} 不应计入深色叶菜`).toBe(false)
    }
  })

  it('真实叶菜菜品在备孕模式下被加权', () => {
    for (const name of ['蒜蓉茼蒿', '白灼芥兰', '炒芥菜', '蒜蓉苋菜', '炒红薯叶']) {
      expect(conditionWeight(dish(name), 'veg', pregnant).reason).toBe('深绿叶菜补叶酸')
    }
  })
})

describe('集合完整性', () => {
  it('所有集合里的食材 id 都真实存在（悬空 id = 该判定永远不触发）', () => {
    const src = fs.readFileSync(new URL('../src/core/conditions.ts', import.meta.url), 'utf8')
    const dangling: string[] = []
    let found = 0
    for (const m of src.matchAll(/const ([A-Z_]+) = new Set\(\[([\s\S]*?)\]\)/g)) {
      found++
      for (const idm of m[2].matchAll(/'([^']+)'/g)) {
        if (!INGREDIENT_MAP.has(idm[1])) dangling.push(`${m[1]}: ${idm[1]}`)
      }
    }
    expect(found, '没解析到任何集合，正则可能失效了').toBeGreaterThan(10)
    expect(dangling).toEqual([])
  })
})

describe('其余集合复核（2026-09-20）', () => {
  it('低脂奶与无糖酸奶计入奶类，糖脂载体不计入', () => {
    const d = (id: string) => dairyGrams(probe(id, 250, 'drink'))
    for (const id of ['milk', 'milk_skim', 'milk_lowfat', 'yogurt', 'yogurt_plain', 'greek_yogurt']) {
      expect(d(id), `${INGREDIENT_MAP.get(id)?.name} 应计入奶类`).toBe(250)
    }
    // 炼乳/黄油/淡奶油/冰淇淋是糖与脂肪的载体，计进来会让孕期 500 g 奶类目标被甜食刷满
    for (const id of ['condensed_milk', 'butter', 'cream', 'ice_cream']) {
      expect(d(id), `${INGREDIENT_MAP.get(id)?.name} 不应计入奶类`).toBe(0)
    }
  })

  it('脂肪≥20g/100g 的畜禽肉都判为高脂', () => {
    for (const id of ['pork_ground', 'beef_ground', 'pork_shoulder', 'beef_ribeye', 'pork_belly', 'bacon']) {
      expect(isFattyMeat(probe(id, 100)), `${INGREDIENT_MAP.get(id)?.name} 应判高脂`).toBe(true)
    }
    for (const id of ['chicken_breast', 'pork_lean', 'beef_lean']) {
      expect(isFattyMeat(probe(id, 100)), `${INGREDIENT_MAP.get(id)?.name} 不应判高脂`).toBe(false)
    }
  })

  it('难咀嚼看的是入口时的硬度，糊状与需泡发的不算', () => {
    for (const id of ['cashew', 'pistachio', 'macadamia', 'pecan', 'red_dates', 'biscuits', 'beef_jerky']) {
      expect(isHardToChew(probe(id, 30, 'snack')), `${INGREDIENT_MAP.get(id)?.name} 应判难咀嚼`).toBe(true)
    }
    // 花生酱芝麻酱是糊状；干香菇/粉丝/干豆都要泡发煮熟后才入口
    for (const id of ['peanut_butter', 'sesame_paste', 'shiitake_dried', 'glass_noodles_dry', 'soybeans_dry']) {
      expect(isHardToChew(probe(id, 30, 'snack')), `${INGREDIENT_MAP.get(id)?.name} 不应判难咀嚼`).toBe(false)
    }
  })

  it('全谷与杂豆判为粗粮，精制与高糖麦片不算', () => {
    for (const id of ['whole_wheat_flour', 'rice_brown_raw', 'cornmeal', 'barley_cooked', 'black_beans_cooked', 'kidney_beans_cooked']) {
      expect(isWholeGrain(probe(id, 100, 'staple')), `${INGREDIENT_MAP.get(id)?.name} 应判粗粮`).toBe(true)
    }
    // 即食玉米片已在 REFINED_STAPLE；格兰诺拉含糖高，都不该算粗粮
    for (const id of ['cereal_flakes', 'granola', 'bread_white', 'rice_cooked']) {
      expect(isWholeGrain(probe(id, 100, 'staple')), `${INGREDIENT_MAP.get(id)?.name} 不应判粗粮`).toBe(false)
    }
  })

  it('反流模式的酸性食物已补全', () => {
    for (const id of ['pineapple', 'grapefruit', 'vinaigrette', 'tomato', 'lemon']) {
      expect(isAcidicDish(probe(id, 100, 'fruit')), `${INGREDIENT_MAP.get(id)?.name} 应判酸性`).toBe(true)
    }
  })

  it('天然高钠的海藻不得归入腌腊（高血压模式是硬排除，归错会禁掉本该推荐的食物）', () => {
    const hyper: Profile = {
      sex: 'male', birthYear: 1980, heightCm: 175, weightKg: 75, activity: 'light', goal: 'maintain',
      dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: ['hypertension'],
    }
    for (const id of ['nori', 'wakame', 'kelp']) {
      expect(conditionExcludes(probe(id, 50, 'veg'), hyper), `${INGREDIENT_MAP.get(id)?.name} 不应被高血压模式排除`).toBe(false)
    }
    // 真正的腌腊制品仍必须被排除
    for (const id of ['bacon', 'chinese_sausage', 'pickled_mustard']) {
      expect(conditionExcludes(probe(id, 50, 'protein'), hyper), `${INGREDIENT_MAP.get(id)?.name} 应被高血压模式排除`).toBe(true)
    }
  })
})

describe('P1 补录批次（2026-09-20，29 条）', () => {
  it('新增的畜禽鱼贝都已归入嘌呤等级', () => {
    for (const id of ['pork_tripe', 'cuttlefish', 'eel_rice_field', 'snakehead', 'lamb_ribs', 'cured_pork', 'duck_leg']) {
      expect(INGREDIENT_MAP.has(id), `食材 ${id} 不存在`).toBe(true)
      expect(hasPurineLevel(id), `${INGREDIENT_MAP.get(id)?.name} 应已登记嘌呤等级`).toBe(true)
    }
    // 内脏与头足归高嘌呤
    for (const id of ['pork_tripe', 'cuttlefish']) expect(isHighPurine(probe(id)), id).toBe(true)
    // 普通鱼肉归中嘌呤
    for (const id of ['eel_rice_field', 'snakehead', 'lamb_ribs', 'duck_leg']) expect(isMediumPurine(probe(id)), id).toBe(true)
  })

  it('腊肉属腌腊高脂，高血压模式硬排除', () => {
    expect(isPickledOrCured(probe('cured_pork', 50))).toBe(true)
    expect(isFattyMeat(probe('cured_pork'))).toBe(true)
    const hyper: Profile = {
      sex: 'male', birthYear: 1980, heightCm: 175, weightKg: 75, activity: 'light', goal: 'maintain',
      dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: ['hypertension'],
    }
    expect(conditionExcludes(probe('cured_pork', 50), hyper)).toBe(true)
  })

  it('羊排比笼统的羊肉更肥，判为高脂', () => {
    expect(INGREDIENT_MAP.get('lamb_ribs')!.per100.fat).toBeGreaterThan(INGREDIENT_MAP.get('lamb')!.per100.fat)
    expect(isFattyMeat(probe('lamb_ribs'))).toBe(true)
  })

  it('杂粮判粗粮，粉条河粉判精制', () => {
    for (const id of ['black_rice', 'millet_raw', 'purple_sweet_potato']) {
      expect(isWholeGrain(probe(id, 100, 'staple')), `${INGREDIENT_MAP.get(id)?.name} 应判粗粮`).toBe(true)
    }
    for (const id of ['sweet_potato_noodle', 'rice_noodle_flat']) {
      expect(isRefinedStaple(probe(id, 100, 'staple')), `${INGREDIENT_MAP.get(id)?.name} 应判精制主食`).toBe(true)
    }
  })

  it('干木耳的纤维远高于水发木耳（原先只有水发态，记录干货会严重低估）', () => {
    const dry = INGREDIENT_MAP.get('wood_ear_dried')!.per100
    const wet = INGREDIENT_MAP.get('wood_ear')!.per100
    expect(dry.fiber).toBeGreaterThan(wet.fiber * 3)
    expect(dry.kcal).toBeGreaterThan(wet.kcal * 5)
  })

  it('豌豆尖与香椿计入深色叶菜', () => {
    const pre: Profile = {
      sex: 'female', birthYear: 1994, heightCm: 163, weightKg: 58, activity: 'light', goal: 'maintain',
      dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: ['preconception'],
    }
    for (const id of ['pea_shoots', 'toon']) {
      expect(conditionWeight(probe(id, 150, 'veg'), 'veg', pre).reason, id).toBe('深绿叶菜补叶酸')
    }
  })
})

describe('P2/P3 补录批次（2026-09-20，9 条，清单清空）', () => {
  const hyper: Profile = {
    sex: 'male', birthYear: 1980, heightCm: 175, weightKg: 75, activity: 'light', goal: 'maintain',
    dietStyle: 'chinese', mealsPerDay: 3, dislikedDishes: [], dislikedIngredients: [], allergens: [], conditions: ['hypertension'],
  }

  it('腌菜与剁椒归腌腊，高血压模式硬排除', () => {
    for (const id of ['radish_dried', 'preserved_mustard', 'chopped_chili']) {
      expect(INGREDIENT_MAP.get(id)!.per100.sodium).toBeGreaterThan(3000)
      expect(isPickledOrCured(probe(id, 20, 'veg')), `${INGREDIENT_MAP.get(id)?.name} 应判腌腊`).toBe(true)
      expect(conditionExcludes(probe(id, 20, 'veg'), hyper), `${INGREDIENT_MAP.get(id)?.name} 应被高血压模式排除`).toBe(true)
    }
  })

  it('陈醋钠远高于笼统的「醋」，且同属酸性', () => {
    expect(INGREDIENT_MAP.get('vinegar_black')!.per100.sodium).toBeGreaterThan(INGREDIENT_MAP.get('vinegar')!.per100.sodium * 3)
    expect(isAcidicDish(probe('vinegar_black', 100, 'veg'))).toBe(true)
  })

  it('榛子难咀嚼，白果不算（淀粉质，煮熟即软）', () => {
    expect(isHardToChew(probe('hazelnut', 30, 'snack'))).toBe(true)
    expect(isHardToChew(probe('ginkgo', 30, 'snack'))).toBe(false)
  })

  it('花生油菜籽油与植物油在现有 6 个维度上等值（单列只为按名检索得到）', () => {
    const base = INGREDIENT_MAP.get('oil')!.per100
    for (const id of ['peanut_oil', 'rapeseed_oil']) {
      expect(INGREDIENT_MAP.get(id)!.per100).toEqual(base)
    }
    // 花生油带花生过敏原，植物油不带——这是两者唯一的实质差别
    expect(INGREDIENT_MAP.get('peanut_oil')!.allergens).toContain('peanut')
  })

  it('候选清单里已落库的条目，其声明的 sets 必须真的登记了（补录后忘登记会在这里失败）', () => {
    const src = fs.readFileSync(new URL('../src/core/conditions.ts', import.meta.url), 'utf8')
    const sets = new Map<string, Set<string>>()
    for (const m of src.matchAll(/const ([A-Z_]+) = new Set\(\[([\s\S]*?)\]\)/g)) {
      sets.set(m[1], new Set([...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])))
    }
    const unregistered: string[] = []
    for (const c of CANDIDATES) {
      if (!INGREDIENT_MAP.has(c.id) || !c.sets?.length) continue
      for (const name of c.sets) {
        const set = sets.get(name)
        if (!set) { unregistered.push(`${c.name}: 集合 ${name} 不存在`); continue }
        if (!set.has(c.id)) unregistered.push(`${c.name}(${c.id}) 未登记进 ${name}`)
      }
    }
    expect(unregistered).toEqual([])
  })
})
