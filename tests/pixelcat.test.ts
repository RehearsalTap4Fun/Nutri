import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import manifest from '../src/assets/pixelcat/manifest.json'
import { CAT_COATS, CAT_SLOT_OPTIONS, CAT_TIER, MUTABLE_SLOTS, MUTATION_SLOTS, catDiff, catForCreature, catKey, describeCat, layersFor, mutateCat, renderOps, tierRank, upgradesFor, type CatSpec } from '../src/core/pixelcat'
import { makeRng } from '../src/core/rng'

const ASSETS = join(__dirname, '..', 'src', 'assets', 'pixelcat')

function assertValid(spec: CatSpec) {
  expect(CAT_COATS).toContain(spec.coat)
  for (const slot of MUTABLE_SLOTS) expect(CAT_SLOT_OPTIONS[slot] as readonly string[]).toContain(spec[slot])
}

describe('像素猫：由小管家推导外观', () => {
  it('同一只小管家、同样的异变次数，永远得到同一只猫', () => {
    const a = catForCreature({ id: 'c-1', mutations: 5 })
    const b = catForCreature({ id: 'c-1', mutations: 5 })
    expect(catKey(a)).toBe(catKey(b))
    assertValid(a)
  })

  it('不同 id 的猫大多不同（花纹/表情组合空间够大）', () => {
    const keys = new Set(Array.from({ length: 40 }, (_, i) => catKey(catForCreature({ id: `c-${i}`, mutations: 0 }))))
    expect(keys.size).toBeGreaterThan(20)
  })

  it('刚孵化最多带一件异变；花纹终生不变', () => {
    for (let i = 0; i < 60; i++) {
      const id = `hatch-${i}`
      const born = catForCreature({ id, mutations: 0 })
      const mutationCount = (['crown', 'ears', 'neck', 'back', 'tailTip'] as const).filter((s) => born[s] !== 'none').length
      expect(mutationCount).toBeLessThanOrEqual(1)
      for (let k = 1; k <= 30; k++) expect(catForCreature({ id, mutations: k }).coat).toBe(born.coat)
    }
  })

  it('每多记一笔，恰好一个槽位变成不同的值', () => {
    for (let i = 0; i < 30; i++) {
      const id = `step-${i}`
      let prev = catForCreature({ id, mutations: 0 })
      for (let k = 1; k <= 25; k++) {
        const next = catForCreature({ id, mutations: k })
        const changed = MUTABLE_SLOTS.filter((s) => prev[s] !== next[s])
        expect(changed).toHaveLength(1)
        expect(next.coat).toBe(prev.coat)
        assertValid(next)
        prev = next
      }
    }
  })

  it('mutateCat 不会原地不动', () => {
    const rnd = makeRng(7)
    let spec = catForCreature({ id: 'm', mutations: 0 })
    for (let i = 0; i < 200; i++) {
      const next = mutateCat(spec, rnd)
      expect(catKey(next)).not.toBe(catKey(spec))
      spec = next
    }
  })
})

describe('像素猫：异变只进不退', () => {
  it('异变位永远不会变回没有，品质也不会降级', () => {
    for (let i = 0; i < 60; i++) {
      const id = `grow-${i}`
      let prev = catForCreature({ id, mutations: 0 })
      for (let k = 1; k <= 120; k++) {
        const next = catForCreature({ id, mutations: k })
        for (const slot of MUTATION_SLOTS) {
          if (prev[slot] !== 'none') expect(next[slot], `${id}#${k} ${slot}`).not.toBe('none')
          expect(tierRank(next[slot]), `${id}#${k} ${slot}`).toBeGreaterThanOrEqual(tierRank(prev[slot]))
        }
        prev = next
      }
    }
  })

  it('养到满级后所有异变位都是该位置的最高品质，之后只有表情在换', () => {
    const id = 'maxed'
    const late = catForCreature({ id, mutations: 400 })
    for (const slot of MUTATION_SLOTS) {
      const best = Math.max(...(CAT_SLOT_OPTIONS[slot] as readonly string[]).map(tierRank))
      expect(tierRank(late[slot]), slot).toBe(best)
      expect(upgradesFor(slot, late[slot])).toEqual([])
    }
    for (let k = 401; k <= 410; k++) {
      const a = catForCreature({ id, mutations: k - 1 })
      const b = catForCreature({ id, mutations: k })
      const changed = MUTABLE_SLOTS.filter((s) => a[s] !== b[s])
      expect(changed).toEqual(['expression'])
    }
  })

  it('upgradesFor：只列非空、不同于当前、品质不低于当前的部件', () => {
    expect(upgradesFor('crown', 'none').sort()).toEqual(['antlers', 'dragon-horns', 'halo'])
    expect(upgradesFor('crown', 'dragon-horns').sort()).toEqual(['antlers', 'halo'])
    expect(upgradesFor('crown', 'halo')).toEqual([])
    expect(upgradesFor('back', 'feathered-wings')).toEqual(['dragon-wings'])
    expect(upgradesFor('ears', 'fin-ears')).toEqual([])
    expect(upgradesFor('neck', 'small-lion-mane')).toEqual(['frill-neck'])
  })

  it('高品质更难抽到：从空位首次长出的部件里 N 远多于 R，R 多于 L', () => {
    const count: Record<string, number> = { N: 0, R: 0, L: 0 }
    for (let i = 0; i < 2000; i++) {
      const rnd = makeRng(1000 + i)
      const base: CatSpec = { coat: 'calico', expression: 'parted-mouth', crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none' }
      const next = mutateCat(base, rnd)
      for (const slot of MUTATION_SLOTS) if (next[slot] !== 'none') count[CAT_TIER[next[slot]]]++
    }
    expect(count.N).toBeGreaterThan(count.R * 2)
    expect(count.R).toBeGreaterThan(count.L * 2)
    expect(count.L).toBeGreaterThan(0)
  })
})

describe('像素猫：渲染计划与素材', () => {
  it('清单里每张图层文件都在磁盘上', () => {
    const files = Object.values(manifest.layers as Record<string, string>)
    expect(files.length).toBe(44)
    for (const f of files) expect(existsSync(join(ASSETS, f))).toBe(true)
  })

  it('任何合法组合引用的图层都存在于清单', () => {
    const layers = new Set(Object.keys(manifest.layers))
    for (const coat of CAT_COATS) {
      for (const expression of CAT_SLOT_OPTIONS.expression) {
        for (const crown of CAT_SLOT_OPTIONS.crown) for (const back of CAT_SLOT_OPTIONS.back) {
          const spec: CatSpec = { coat, expression, crown, ears: 'fin-ears', neck: 'frill-neck', back, tailTip: 'flame-tail' }
          for (const id of layersFor(spec)) expect(layers.has(id), id).toBe(true)
        }
        const spec: CatSpec = { coat, expression, crown: 'none', ears: 'none', neck: 'small-lion-mane', back: 'none', tailTip: 'forked-tail-tip' }
        for (const id of layersFor(spec)) expect(layers.has(id), id).toBe(true)
      }
    }
  })

  it('层序与 RandomPet 渲染器一致：背、额顶在身体后；抠耳再画耳到身体层；抠尾再画尾到后层；颈部最后', () => {
    const ops = renderOps({ coat: 'calico', expression: 'parted-mouth', crown: 'antlers', ears: 'fin-ears', neck: 'small-lion-mane', back: 'small-wings', tailTip: 'forked-tail-tip' })
    expect(ops.map((o) => (o.kind === 'draw' ? `draw:${o.target}:${o.layer}` : `clear:${o.region}`))).toEqual([
      'draw:frame:small-wings',
      'draw:frame:antlers',
      'draw:subject:calico-parted-mouth',
      'clear:ears',
      'draw:subject:calico-fin-ears',
      'clear:tailTip',
      'draw:frame:calico-forked-tail-tip',
      'draw:frame:calico-small-lion-mane',
    ])
  })

  it('普通小猫只有一张主体图层，没有清除操作', () => {
    const ops = renderOps({ coat: 'tuxedo', expression: 'small-fangs', crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none' })
    expect(ops).toEqual([{ kind: 'draw', layer: 'tuxedo-small-fangs', target: 'subject' }])
  })
})

describe('像素猫：文案', () => {
  const base: CatSpec = { coat: 'rosetted', expression: 'tongue-tip', crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none' }
  it('describeCat 列出花纹与在身的异变', () => {
    expect(describeCat(base)).toBe('金豹点')
    expect(describeCat({ ...base, crown: 'halo', tailTip: 'flame-tail' })).toBe('金豹点 · 光环 · 焰尾')
  })
  it('catDiff 说清这次变了什么：长出 / 同级横换 / 升级进化，稀有传说带品质', () => {
    expect(catDiff(base, base)).toBeNull()
    expect(catDiff(base, { ...base, crown: 'dragon-horns' })).toBe('长出了小龙角')
    expect(catDiff(base, { ...base, neck: 'frill-neck' })).toBe('长出了颈膜（稀有）')
    expect(catDiff({ ...base, crown: 'dragon-horns' }, { ...base, crown: 'antlers' })).toBe('小龙角换成了鹿角')
    expect(catDiff({ ...base, back: 'small-wings' }, { ...base, back: 'dragon-wings' })).toBe('小翅膀进化成了龙翼（传说）')
    expect(catDiff(base, { ...base, expression: 'small-fangs' })).toBe('表情变成小牙')
  })
})
