import { describe, expect, it } from 'vitest'
import { CAT_TITLES, newTitles, titlesFor } from '../src/core/catTitles'
import { dexOwned, dexTotals, emptyDex, isCatDex, recordSpec, seedDex } from '../src/core/catDex'
import { CAT_LINES, MUTATION_SLOTS, catForCreature, isFullyGrown, mutateCat, type CatSpec } from '../src/core/pixelcat'
import { makeRng } from '../src/core/rng'

const base: CatSpec = { coat: 'orange-white', body: 'standard', eyes: 'round', expression: 'small-fangs', crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none' }
const maxed: CatSpec = { ...base, crown: 'halo', ears: 'fin-ears', neck: 'frill-neck', back: 'dragon-wings', tailTip: 'flame-tail' }

describe('称号配方', () => {
  it('每个称号都有名字与凑法，id 不重复', () => {
    expect(CAT_TITLES.length).toBeGreaterThan(0)
    expect(new Set(CAT_TITLES.map((t) => t.id)).size).toBe(CAT_TITLES.length)
    for (const t of CAT_TITLES) { expect(t.name).toBeTruthy(); expect(t.hint).toBeTruthy() }
  })
  it('炎龙 / 天使 / 深海 / 林鹿 各自只在凑齐时达成', () => {
    expect(titlesFor(base)).toEqual([])
    expect(titlesFor({ ...base, crown: 'dragon-horns', back: 'dragon-wings', tailTip: 'flame-tail' })).toContain('flame-dragon')
    expect(titlesFor({ ...base, crown: 'dragon-horns', back: 'dragon-wings' })).not.toContain('flame-dragon')
    expect(titlesFor({ ...base, crown: 'halo', back: 'feathered-wings' })).toContain('angel')
    expect(titlesFor({ ...base, ears: 'fin-ears', neck: 'frill-neck', tailTip: 'forked-tail-tip' })).toContain('abyss')
    expect(titlesFor({ ...base, crown: 'antlers', neck: 'small-lion-mane' })).toContain('forest-deer')
  })
  it('孤高：只有额顶的光环，其余全空', () => {
    expect(titlesFor({ ...base, crown: 'halo' })).toContain('solitary')
    expect(titlesFor({ ...base, crown: 'halo', ears: 'fin-ears' })).not.toContain('solitary')
    expect(titlesFor({ ...base, crown: 'dragon-horns' })).not.toContain('solitary')
  })
  it('圆满：五个位置全部到顶', () => {
    expect(isFullyGrown(maxed)).toBe(true)
    expect(titlesFor(maxed)).toContain('complete')
    expect(titlesFor({ ...maxed, back: 'feathered-wings' })).not.toContain('complete')
  })
  it('newTitles 只报新达成的；prev 为 null 时全部算新', () => {
    const angel = { ...base, crown: 'halo', back: 'feathered-wings' } as CatSpec
    expect(newTitles(null, angel)).toContain('angel')
    expect(newTitles(angel, angel)).toEqual([])
    expect(newTitles({ ...base, crown: 'halo' }, angel)).toEqual(['angel'])
  })
})

describe('图鉴账本', () => {
  it('记录新出现的部件，已有的不重复计', () => {
    let dex = emptyDex()
    dex = recordSpec(dex, null, { ...base, crown: 'dragon-horns' })
    expect(dex.parts['dragon-horns']).toBe(1)
    dex = recordSpec(dex, { ...base, crown: 'dragon-horns' }, { ...base, crown: 'dragon-horns', ears: 'fin-ears' })
    expect(dex.parts['dragon-horns']).toBe(1)
    expect(dex.parts['fin-ears']).toBe(1)
  })
  it('第二只猫长出同一件时计数累加', () => {
    let dex = emptyDex()
    dex = recordSpec(dex, null, { ...base, crown: 'dragon-horns' })
    dex = recordSpec(dex, null, { ...base, crown: 'dragon-horns' })
    expect(dex.parts['dragon-horns']).toBe(2)
  })
  it('称号达成时计数 +1，重复判定不再累加', () => {
    let dex = emptyDex()
    const angel = { ...base, crown: 'halo', back: 'feathered-wings' } as CatSpec
    dex = recordSpec(dex, { ...base, crown: 'halo' }, angel)
    expect(dex.titles['angel']).toBe(1)
    dex = recordSpec(dex, angel, { ...angel, expression: 'small-fangs' })
    expect(dex.titles['angel']).toBe(1)
  })
  it('dexTotals 随美术阵容走，不写死', () => {
    const parts = MUTATION_SLOTS.reduce((n, s) => n + Object.values(CAT_LINES[s]).reduce((m, l) => m + l.length, 0), 0)
    expect(dexTotals()).toEqual({ parts, titles: CAT_TITLES.length })
  })
  it('dexOwned 只数见过的', () => {
    expect(dexOwned(emptyDex())).toEqual({ parts: 0, titles: 0 })
    expect(dexOwned(seedDex([maxed])).parts).toBe(5)
  })
  it('一只猫养到满级，图鉴收齐它路过的每一件', () => {
    let dex = emptyDex()
    let spec = catForCreature({ id: 'dex-1', mutations: 0 })
    dex = recordSpec(dex, null, spec)
    const rnd = makeRng(3)
    for (let i = 0; i < 200 && !isFullyGrown(spec); i++) {
      const next = mutateCat(spec, rnd)
      dex = recordSpec(dex, spec, next)
      spec = next
    }
    expect(isFullyGrown(spec)).toBe(true)
    // 沿链走过的每一阶都该被记下，包括被升掉的中间件
    expect(dex.parts['small-wings']).toBe(1)
    expect(dex.parts['feathered-wings']).toBe(1)
    expect(dex.parts['dragon-wings']).toBe(1)
    expect(dex.titles['complete']).toBe(1)
  })
  it('isCatDex 认形状；补种只按最终外观记一次', () => {
    expect(isCatDex(emptyDex())).toBe(true)
    expect(isCatDex({ parts: {}, titles: { a: 'x' } })).toBe(false)
    expect(isCatDex(null)).toBe(false)
    const seeded = seedDex([maxed, { ...base, crown: 'dragon-horns' }])
    expect(seeded.parts['halo']).toBe(1)
    expect(seeded.parts['dragon-horns']).toBe(1)
    expect(seeded.parts['small-wings']).toBeUndefined() // 途中升掉的找不回来
  })
})
