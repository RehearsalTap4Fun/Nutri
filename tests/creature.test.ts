import { describe, expect, it } from 'vitest'
import { BODIES, COLORS, EXTRAS, EYES, MOUTHS, PATTERNS, PERSONALITIES, hatch, mutate, retire } from '../src/core/creature'
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
