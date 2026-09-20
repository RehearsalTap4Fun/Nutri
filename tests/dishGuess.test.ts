// 搜不到菜时「从菜名猜食材」的行为约束。猜错不致命（用户在自建表单里能改），
// 但两件事必须守住：认不出时返回 null（不能瞎编），以及不能把状态词当食材。
import { describe, expect, it } from 'vitest'
import { INGREDIENTS } from '../src/data/ingredients'
import { guessDishFromName, ingredientAliases } from '../src/core/dishGuess'

const ids = (q: string) => guessDishFromName(q, INGREDIENTS)?.parts.map((p) => p.ing) ?? []

describe('从菜名猜食材', () => {
  it('认出口语叫法（库里叫「猪肉馅(肥瘦)」，用户打的是「肉末」「肉沫」）', () => {
    for (const q of ['肉末豇豆', '肉沫豇豆']) {
      expect(ids(q), q).toContain('long_beans')
      expect(ids(q), q).toContain('pork_ground')
    }
    expect(ids('西红柿炒鸡蛋')).toContain('tomato')
    expect(ids('干煸菜花')).toContain('cauliflower')
  })

  it('括号里的名字也能被搜到（海鱼(带鱼/黄鱼) ← 红烧带鱼）', () => {
    expect(ids('红烧带鱼')).toContain('fish_sea')
  })

  it('做法词决定烹饪方式与用油量', () => {
    expect(guessDishFromName('清蒸鲈鱼', INGREDIENTS)!.cook).toBe('light')
    expect(guessDishFromName('红烧带鱼', INGREDIENTS)!.cook).toBe('heavy')
    expect(guessDishFromName('油炸臭豆腐', INGREDIENTS)!.cook).toBe('fried')
    const light = guessDishFromName('清蒸鲈鱼', INGREDIENTS)!.parts.find((p) => p.ing === 'oil')!
    const fried = guessDishFromName('油炸臭豆腐', INGREDIENTS)!.parts.find((p) => p.ing === 'oil')!
    expect(fried.g).toBeGreaterThan(light.g)
  })

  it('认不出就返回 null，不瞎编', () => {
    for (const q of ['abc', '的', '', 'x']) expect(guessDishFromName(q, INGREDIENTS)).toBeNull()
  })

  it('总会带上油与盐，否则热量和钠会明显偏低', () => {
    const g = guessDishFromName('黄瓜炒肉', INGREDIENTS)!
    expect(g.parts.map((p) => p.ing)).toContain('oil')
    expect(g.parts.map((p) => p.ing)).toContain('salt')
  })

  it('状态词不当食材名（(生)/(煮熟)/(可食部) 这类）', () => {
    for (const bad of ['生', '干', '煮熟', '可食部', '水发', '近似']) {
      expect(ingredientAliases(`某某(${bad})`), bad).not.toContain(bad)
    }
    expect(ingredientAliases('海鱼(带鱼/黄鱼)')).toEqual(expect.arrayContaining(['海鱼', '带鱼', '黄鱼']))
  })

  it('猜出的食材 id 都真实存在', () => {
    const all = new Set(INGREDIENTS.map((i) => i.id))
    for (const q of ['肉末豇豆', '西红柿炒鸡蛋', '土豆烧牛肉', '蒜苔炒香干', '清蒸鲈鱼']) {
      for (const id of ids(q)) expect(all.has(id), `${q} → ${id}`).toBe(true)
    }
  })
})

describe('类别粗判（用来预选自建表单的类别）', () => {
  const cat = (q: string) => guessDishFromName(q, INGREDIENTS)?.cat
  it('有肉蛋鱼归荤菜，纯蔬菜归素菜，带汤字归汤', () => {
    expect(cat('肉末豇豆')).toBe('protein')
    expect(cat('清蒸鲈鱼')).toBe('protein')
    expect(cat('榄菜炒四季豆')).toBe('veg')
    expect(cat('蒜蓉西兰花')).toBe('veg')
    expect(cat('冬瓜排骨汤')).toBe('soup')
  })
})
