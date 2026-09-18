import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import manifest from '../src/assets/pixelcat/manifest.json'
import { CAT_COATS, CAT_SLOT_OPTIONS, CAT_TIER, GROWTH_DECAY, LATERAL_SLOTS, MUTABLE_SLOTS, MUTATION_SLOTS, catDiff, catForCreature, catKey, describeCat, growthSteps, hatchCat, isCatSpec, isFullyGrown, lineOf, maxGrowthSteps, mutateCat, slotLadder, slotStep, tierRank, upgradeChance, upgradesFor, type CatSpec } from '../src/core/pixelcat'
import { layersFor, renderOps } from '../src/core/pixelcatPlush'
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

  it('养到满级后所有异变位都是该位置的最高品质，之后只有横向性状在换', () => {
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
      expect(changed).toHaveLength(1)
      expect(LATERAL_SLOTS as readonly string[]).toContain(changed[0])
    }
  })

  it('upgradesFor：只列「高于当前的最低那一阶」，同阶不互换、不跳级', () => {
    // 额顶缺 R，所以阶梯是 N → L，从空槽先给 N 级的两件
    expect(upgradesFor('crown', 'none').sort()).toEqual(['antlers', 'dragon-horns'])
    expect(upgradesFor('crown', 'dragon-horns')).toEqual(['halo'])
    expect(upgradesFor('crown', 'antlers')).toEqual(['halo']) // 缺阶自动跳过
    expect(upgradesFor('crown', 'halo')).toEqual([])
    expect(upgradesFor('back', 'none')).toEqual(['small-wings'])
    expect(upgradesFor('back', 'small-wings')).toEqual(['feathered-wings']) // 不跳级到龙翼
    expect(upgradesFor('back', 'feathered-wings')).toEqual(['dragon-wings'])
    expect(upgradesFor('ears', 'fin-ears')).toEqual([])
    expect(upgradesFor('neck', 'small-lion-mane')).toEqual(['frill-neck'])
  })

  it('阶梯与步数：缺阶的槽位按阶梯位置算步数，不按品质档位', () => {
    expect(slotLadder('crown')).toEqual([1, 3]) // N 与 L，缺 R
    expect(slotLadder('back')).toEqual([1, 2, 3])
    expect(slotStep('crown', 'none')).toBe(0)
    expect(slotStep('crown', 'dragon-horns')).toBe(1)
    expect(slotStep('crown', 'halo')).toBe(2) // 不是 3
    expect(maxGrowthSteps()).toBe(10) // 2+1+2+3+2
  })

  it('顶阶只能升不能生：孵化自带的那件一定是入口阶，不会直接给 L', () => {
    for (let i = 0; i < 200; i++) {
      const c = catForCreature({ id: `hatch-L-${i}`, mutations: 0 })
      for (const slot of MUTATION_SLOTS) if (c[slot] !== 'none') expect(slotStep(slot, c[slot]), `${slot}=${c[slot]}`).toBe(1)
    }
  })

  it('同链优先：背部沿翼链逐阶升，颈部沿鬃链升', () => {
    expect(lineOf('back', 'feathered-wings')).toBe('wing')
    expect(lineOf('crown', 'halo')).toBe('light')
    let spec = { coat: 'calico', body: 'standard', eyes: 'round', expression: 'parted-mouth', crown: 'none', ears: 'none', neck: 'none', back: 'small-wings', tailTip: 'none' } as CatSpec
    const seen: string[] = []
    const rnd = makeRng(11)
    for (let i = 0; i < 80 && upgradesFor('back', spec.back).length; i++) {
      const next = mutateCat(spec, rnd)
      if (next.back !== spec.back) seen.push(next.back)
      spec = next
    }
    expect(seen).toEqual(['feathered-wings', 'dragon-wings'])
  })

  it('从空位首次长出的一定是入口阶（N），传说不会凭空出现', () => {
    const count: Record<string, number> = { N: 0, R: 0, L: 0 }
    for (let i = 0; i < 2000; i++) {
      const rnd = makeRng(1000 + i)
      const base: CatSpec = { coat: 'calico', body: 'standard', eyes: 'round', expression: 'parted-mouth', crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none' }
      const next = mutateCat(base, rnd)
      for (const slot of MUTATION_SLOTS) if (next[slot] !== 'none') count[CAT_TIER[next[slot]]]++
    }
    expect(count.N).toBeGreaterThan(0)
    expect(count.R).toBe(0)
    expect(count.L).toBe(0)
  })

  it('成长节奏：首笔必升级，之后升级概率随已升阶数递减', () => {
    const empty: CatSpec = { coat: 'calico', body: 'standard', eyes: 'round', expression: 'parted-mouth', crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none' }
    expect(upgradeChance(empty)).toBe(1)
    const grown: CatSpec = { ...empty, crown: 'halo', back: 'dragon-wings', neck: 'frill-neck' }
    expect(growthSteps(grown)).toBe(2 + 3 + 2)
    expect(upgradeChance(grown)).toBeCloseTo(1 / (1 + 7 / GROWTH_DECAY), 6)
  })

  it('满级后每笔仍有可见变化（换眼型或表情），且不再动异变位与身份性状', () => {
    const maxed: CatSpec = { coat: 'calico', body: 'standard', eyes: 'round', expression: 'parted-mouth', crown: 'halo', ears: 'fin-ears', neck: 'frill-neck', back: 'dragon-wings', tailTip: 'flame-tail' }
    expect(isFullyGrown(maxed)).toBe(true)
    const rnd = makeRng(5)
    let spec = maxed
    const changedSlots = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const next = mutateCat(spec, rnd)
      const changed = LATERAL_SLOTS.filter((s) => next[s] !== spec[s])
      expect(changed).toHaveLength(1) // 每笔恰好换一个横向性状
      changedSlots.add(changed[0])
      for (const slot of MUTATION_SLOTS) expect(next[slot]).toBe(maxed[slot])
      expect(next.coat).toBe(maxed.coat)
      expect(next.body).toBe(maxed.body)
      spec = next
    }
    // 两个横向性状都应该被用到，不是只在表情里来回切
    expect([...changedSlots].sort()).toEqual(['expression', 'eyes'])
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
          const spec: CatSpec = { coat, body: 'standard', eyes: 'round', expression, crown, ears: 'fin-ears', neck: 'frill-neck', back, tailTip: 'flame-tail' }
          for (const id of layersFor(spec)) expect(layers.has(id), id).toBe(true)
        }
        const spec: CatSpec = { coat, body: 'standard', eyes: 'round', expression, crown: 'none', ears: 'none', neck: 'small-lion-mane', back: 'none', tailTip: 'forked-tail-tip' }
        for (const id of layersFor(spec)) expect(layers.has(id), id).toBe(true)
      }
    }
  })

  it('层序与 RandomPet 渲染器一致：背、额顶在身体后；抠耳再画耳到身体层；抠尾再画尾到后层；颈部最后', () => {
    const ops = renderOps({ coat: 'calico', body: 'standard', eyes: 'round', expression: 'parted-mouth', crown: 'antlers', ears: 'fin-ears', neck: 'small-lion-mane', back: 'small-wings', tailTip: 'forked-tail-tip' })
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
    const ops = renderOps({ coat: 'tuxedo', body: 'standard', eyes: 'round', expression: 'small-fangs', crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none' })
    expect(ops).toEqual([{ kind: 'draw', layer: 'tuxedo-small-fangs', target: 'subject' }])
  })
})

describe('像素猫：文案', () => {
  const base: CatSpec = { coat: 'rosetted', body: 'standard', eyes: 'round', expression: 'small-fangs', crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none' }
  it('describeCat 列出花纹与在身的异变', () => {
    expect(describeCat(base)).toBe('金豹点 · 标准 · 圆眼')
    expect(describeCat({ ...base, crown: 'halo', tailTip: 'flame-tail' })).toBe('金豹点 · 标准 · 圆眼 · 光环 · 焰尾')
  })
  it('catDiff 说清这次变了什么：长出 / 同级横换 / 升级进化，稀有传说带品质', () => {
    expect(catDiff(base, base)).toBeNull()
    expect(catDiff(base, { ...base, crown: 'dragon-horns' })).toBe('长出了小龙角')
    expect(catDiff(base, { ...base, neck: 'frill-neck' })).toBe('长出了颈膜（稀有）')
    expect(catDiff({ ...base, crown: 'dragon-horns' }, { ...base, crown: 'antlers' })).toBe('小龙角换成了鹿角')
    expect(catDiff({ ...base, back: 'small-wings' }, { ...base, back: 'dragon-wings' })).toBe('小翅膀进化成了龙翼（传说）')
    expect(catDiff(base, { ...base, expression: 'parted-mouth' })).toBe('表情变成微张嘴')
    expect(catDiff(base, { ...base, eyes: 'sleepy-almond' })).toBe('眼型变成半眯眼')
  })
})

describe('像素猫：hatchCat 与 isCatSpec', () => {
  it('hatchCat 由随机流决定、最多自带一件异变；catForCreature 的第 0 步就是它', () => {
    for (let i = 0; i < 40; i++) {
      const a = hatchCat(makeRng(i))
      const b = hatchCat(makeRng(i))
      expect(catKey(a)).toBe(catKey(b))
      expect(MUTATION_SLOTS.filter((s) => a[s] !== 'none').length).toBeLessThanOrEqual(1)
    }
  })
  it('isCatSpec 只认当前选项池里的值', () => {
    const ok: CatSpec = { coat: 'calico', body: 'standard', eyes: 'round', expression: 'small-fangs', crown: 'halo', ears: 'fin-ears', neck: 'none', back: 'dragon-wings', tailTip: 'flame-tail' }
    expect(isCatSpec(ok)).toBe(true)
    expect(isCatSpec({ ...ok, coat: 'sphynx' })).toBe(false)
    expect(isCatSpec({ ...ok, back: undefined })).toBe(false)
    expect(isCatSpec(null)).toBe(false)
    expect(isCatSpec('calico')).toBe(false)
  })
})
