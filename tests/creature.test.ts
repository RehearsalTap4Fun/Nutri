import { describe, expect, it } from 'vitest'
import { BODIES, COLORS, EXTRAS, EYES, MOUTHS, PATTERNS, PERSONALITIES, ensureCat, hatch, mutate, retire, type Creature } from '../src/core/creature'
import { MUTABLE_SLOTS, MUTATION_SLOTS, PIXEL_CAT_RULES, catForCreature, catKey, isCatSpec, tierRank } from '../src/core/pixelcat'
import { ART_IDENTITY, artPlanForCat } from '../src/core/catArt'
import { makeRng } from '../src/core/rng'

describe('hatch：一次随机定型', () => {
  it('生成的每个特征都落在各自的选项池里', () => {
    const c = hatch('a', 1000, makeRng(1))
    expect(BODIES).toContain(c.traits.body)
    expect(COLORS).toContain(c.traits.color)
    expect(PATTERNS).toContain(c.traits.pattern)
    expect(EYES).toContain(c.traits.eyes)
    expect(MOUTHS).toContain(c.traits.mouth)
    expect(EXTRAS).toContain(c.traits.extra)
    expect(c.mutations).toBe(0)
    expect(c.bornAt).toBe(1000)
    expect(c.lastMutatedAt).toBe(1000)
    expect(PERSONALITIES).toContain(c.personality)
  })
  it('不同种子孵化出不同的样子（跑几次总有不一样的）', () => {
    const all = Array.from({ length: 20 }, (_, i) => JSON.stringify(hatch('a', 0, makeRng(i)).traits))
    expect(new Set(all).size).toBeGreaterThan(1)
  })
})

describe('mutate：每次只换一个特征槽，且换成不同的值', () => {
  it('只有一个特征变了，其余保持不变', () => {
    const c = hatch('a', 0, makeRng(7))
    const m = mutate(c, 2000, makeRng(9))
    const keys = Object.keys(c.traits) as Array<keyof typeof c.traits>
    const changed = keys.filter((k) => c.traits[k] !== m.traits[k])
    expect(changed.length).toBe(1)
    expect(m.mutations).toBe(1)
    expect(m.lastMutatedAt).toBe(2000)
    expect(m.bornAt).toBe(c.bornAt)
    expect(m.id).toBe(c.id)
  })
  it('换的那个槽位一定跟原来不一样（不会白转一圈换回原值）', () => {
    for (let s = 0; s < 30; s++) {
      const c = hatch('a', 0, makeRng(s))
      const m = mutate(c, 0, makeRng(s + 100))
      const keys = Object.keys(c.traits) as Array<keyof typeof c.traits>
      const changedKey = keys.find((k) => c.traits[k] !== m.traits[k])
      if (changedKey) expect(m.traits[changedKey]).not.toBe(c.traits[changedKey])
    }
  })
  it('连续异变次数会累加', () => {
    let c = hatch('a', 0, makeRng(3))
    for (let i = 0; i < 5; i++) c = mutate(c, i + 1, makeRng(i))
    expect(c.mutations).toBe(5)
  })
  it('异变不会改变性格，性格孵化时就定型了', () => {
    let c = hatch('a', 0, makeRng(3))
    const personality = c.personality
    for (let i = 0; i < 5; i++) c = mutate(c, i + 1, makeRng(i))
    expect(c.personality).toBe(personality)
  })
})

describe('retire：存进历史', () => {
  it('带上退休时间，其余字段原样保留', () => {
    const c = hatch('a', 10, makeRng(1))
    const r = retire(c, 999)
    expect(r.retiredAt).toBe(999)
    expect(r.traits).toEqual(c.traits)
    expect(r.id).toBe(c.id)
  })
})

describe('像素猫外观存进 creature：孵化定型、异变推进、老数据补齐', () => {
  it('孵化时带上合法的 cat 与规则版本', () => {
    const c = hatch('a', 1000, makeRng(1))
    expect(isCatSpec(c.cat)).toBe(true)
    expect(c.catRules).toBe(PIXEL_CAT_RULES)
    const mutationCount = MUTATION_SLOTS.filter((s) => c.cat[s] !== 'none').length
    expect(mutationCount).toBeLessThanOrEqual(1)
  })
  it('每次异变 cat 恰好推进一步，只进不退，花纹不变', () => {
    let c = hatch('a', 0, makeRng(5))
    for (let i = 0; i < 60; i++) {
      const next = mutate(c, i + 1, makeRng(100 + i))
      const changed = MUTABLE_SLOTS.filter((s) => c.cat[s] !== next.cat[s])
      expect(changed).toHaveLength(1)
      expect(next.cat.coat).toBe(c.cat.coat)
      for (const slot of MUTATION_SLOTS) {
        expect(tierRank(next.cat[slot])).toBeGreaterThanOrEqual(tierRank(c.cat[slot]))
        if (c.cat[slot] !== 'none') expect(next.cat[slot]).not.toBe('none')
      }
      c = next
    }
  })
  it('异变从存档里的 cat 出发，不重放历史：改了存档里的 cat，下一步就从改后的值继续', () => {
    const c = hatch('a', 0, makeRng(5))
    const edited: Creature = { ...c, cat: { ...c.cat, coat: 'tuxedo', crown: 'halo' } }
    const next = mutate(edited, 1, makeRng(9))
    expect(next.cat.coat).toBe('tuxedo')
    expect(next.cat.crown).toBe('halo') // 光环已是额顶最高，不会被降级
  })
  it('ensureCat：老数据没有 cat 时按 id + 异变次数推导，结果与 catForCreature 一致；已有合法 cat 时原样返回', () => {
    const c = hatch('old-1', 0, makeRng(2))
    const legacy = { ...c, mutations: 4 } as Creature
    delete (legacy as Partial<Creature>).cat
    delete (legacy as Partial<Creature>).catRules
    const fixed = ensureCat(legacy)
    expect(catKey(fixed.cat)).toBe(catKey(catForCreature({ id: 'old-1', mutations: 4 })))
    expect(fixed.catRules).toBe(PIXEL_CAT_RULES)
    expect(ensureCat(fixed)).toBe(fixed)
  })
  it('ensureCat：存档里的 cat 含未知值时视为非法，重新推导', () => {
    const c = hatch('bad', 0, makeRng(3))
    const broken = { ...c, cat: { ...c.cat, back: 'jet-engine' } } as unknown as Creature
    expect(isCatSpec(broken.cat)).toBe(false)
    expect(isCatSpec(ensureCat(broken).cat)).toBe(true)
  })
  it('回炉后历史里的 cat 原样保留', () => {
    const c = hatch('a', 10, makeRng(1))
    expect(retire(c, 999).cat).toEqual(c.cat)
  })
})

describe('接入像素包后的形象迁移', () => {
  const legacy = (over: Record<string, unknown> = {}) => {
    const c = hatch('legacy-1', 0, makeRng(4))
    // 模拟接包前的存档：没有 body／eyes／catArt，表情可能是已下线的 tongue-tip
    const cat = { ...c.cat, ...over } as Record<string, unknown>
    delete cat.body
    delete cat.eyes
    const out = { ...c, cat } as unknown as Creature
    delete (out as Partial<Creature>).catArt
    return out
  }

  it('就地补齐 body／eyes，保留花纹与已长出的部件，不重新推导', () => {
    const before = legacy({ crown: 'halo', tailTip: 'flame-tail' })
    const after = ensureCat(before)
    expect(after.cat.body).toBe('standard')
    expect(after.cat.eyes).toBe('round')
    expect(after.cat.coat).toBe(before.cat.coat) // 花纹保住了
    expect(after.cat.crown).toBe('halo')
    expect(after.cat.tailTip).toBe('flame-tail')
    expect(isCatSpec(after.cat)).toBe(true)
    expect(artPlanForCat(after.cat)).not.toBeNull() // 画得出来
  })

  it('已下线的 tongue-tip 表情迁移成 small-fangs', () => {
    const after = ensureCat(legacy({ expression: 'tongue-tip' }))
    expect(after.cat.expression).toBe('small-fangs')
    expect(artPlanForCat(after.cat)).not.toBeNull()
  })

  it('补齐后的猫一定落在像素包覆盖内（6 毛色 × 标准体型 × 圆眼 × 两表情）', () => {
    for (let i = 0; i < 60; i++) {
      const c = hatch(`legacy-${i}`, 0, makeRng(i))
      const cat = { ...c.cat } as Record<string, unknown>
      delete cat.body
      delete cat.eyes
      const after = ensureCat({ ...c, cat } as unknown as Creature)
      expect(artPlanForCat(after.cat), JSON.stringify(after.cat)).not.toBeNull()
    }
  })

  it('存了不认识的部件就重新推导，而不是给一只画不出来的猫', () => {
    const broken = legacy({ back: 'jet-engine' })
    const after = ensureCat(broken)
    expect(isCatSpec(after.cat)).toBe(true)
    expect(artPlanForCat(after.cat)).not.toBeNull()
  })

  it('孵化与异变都带上美术包身份；已经合法的猫不被改动', () => {
    const c = hatch('art-1', 0, makeRng(1))
    expect(c.catArt).toEqual(ART_IDENTITY)
    expect(ensureCat(c)).toBe(c) // 原样返回，不产生新对象
    expect(mutate(c, 1, makeRng(2)).catArt).toEqual(ART_IDENTITY)
  })
})
