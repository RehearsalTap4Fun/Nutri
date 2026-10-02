/**
 * 狗狗小管家：阵容闭合、规则复用、物种边界。
 *
 * 渲染的逐字节回放在 scripts/caninePackReplay.ts（要解码 PNG，依赖 RandomPet 的 sharp）；
 * 这里守的是不解码也能查的部分——合成器没被改过、目录和猫的规则对得上、狗不会被悄悄变成猫。
 */
import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { CANINE, CANINE_META, DOG_BREEDS, DOG_IDENTITY_PAIRS, dogBodyId, dogLayersFor, dogPlanFor } from '../src/core/dogArt'
import { CAT_BODIES, CAT_SLOT_OPTIONS, MUTATION_SLOTS, catKey, describeCat, growthSteps, isCatSpec, isFullyGrown, maxGrowthSteps, mutateCat, speciesOf, type CatSpec } from '../src/core/pixelcat'
import { canDraw, ensureCat, hatch, mutate } from '../src/core/creature'
import { recordSpec, emptyDex } from '../src/core/catDex'
import { makeRng, hashString } from '../src/core/rng'
import { graduateCreature } from '../src/store/actions'
import { defaultState, exportJson, importJson } from '../src/store/storage'

const rng = (s: string) => makeRng(hashString(s))

describe('狗狗包', () => {
  it('合成器是原样复制的：摘要等于目录的 runtimeSha256', () => {
    const bytes = readFileSync(new URL('../src/core/vendor/canineRuntime.mjs', import.meta.url))
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(CANINE.runtimeSha256)
    expect(CANINE_META.runtimeSha256).toBe(CANINE.runtimeSha256)
  })
  it('六犬种 × 三体型全部可孵化，每一对都有 2 眼型 × 2 表情', () => {
    expect(DOG_IDENTITY_PAIRS).toHaveLength(DOG_BREEDS.length * CAT_BODIES.length)
    for (const b of DOG_BREEDS) for (const body of CAT_BODIES) expect(DOG_IDENTITY_PAIRS).toContainEqual({ coat: b, body })
  })
  it('目录里的每个主体都能从外观找回来；每件部件都是猫阵容里的', () => {
    for (const [id, b] of Object.entries(CANINE.bodies)) expect(dogBodyId({ coat: b.breed, body: b.body, eyes: b.eyes, expression: b.expression })).toBe(id)
    for (const p of Object.values(CANINE.profiles)) {
      for (const slot of ['crown', 'ears', 'neck', 'back', 'tailTip'] as const) {
        expect(Object.keys(p.slots[slot]).sort()).toEqual((CAT_SLOT_OPTIONS[slot] as readonly string[]).filter((v) => v !== 'none').sort())
      }
    }
  })
  it('计划引用的图层全在包里', () => {
    const spec = hatchDog('x')
    const plan = dogPlanFor({ ...spec, crown: 'halo', ears: 'celestial-ears', neck: 'sunburst-ruff', back: 'dragon-wings', tailTip: 'phoenix-tail' })!
    expect(plan.headMask).toBeTruthy()
    for (const id of dogLayersFor(plan)) expect(CANINE.resourceIds).toContain(id)
  })
})

const hatchDog = (seed: string): CatSpec => hatch(seed, 1, rng(seed), 'dog').cat

describe('狗沿用猫的成长规则', () => {
  it('孵化：标着 dog、犬种落在 coat、画得出来', () => {
    for (let i = 0; i < 60; i++) {
      const c = hatch(`d${i}`, 1, rng(`d${i}`), 'dog')
      expect(speciesOf(c.cat)).toBe('dog')
      expect(DOG_BREEDS as readonly string[]).toContain(c.cat.coat)
      expect(isCatSpec(c.cat)).toBe(true)
      expect(canDraw(c.cat)).toBe(true)
      expect(c.catArt.styleId).toBe('canine-pixel')
    }
  })
  it('一路异变到长满：始终是狗、每一步都画得出来，阶数与猫相同', () => {
    let c = hatch('grow', 1, rng('grow'), 'dog')
    const r = rng('grow-steps')
    for (let i = 0; i < 400 && !isFullyGrown(c.cat); i++) {
      c = mutate(c, i, r)
      expect(speciesOf(c.cat)).toBe('dog')
      expect(canDraw(c.cat)).toBe(true)
    }
    expect(isFullyGrown(c.cat)).toBe(true)
    expect(growthSteps(c.cat)).toBe(maxGrowthSteps())
    expect(c.cat.backdrop).not.toBe('none')
  })
  it('猫不受影响：外观里没有 species，缓存键没有前缀', () => {
    const c = hatch('cat', 1, rng('cat'))
    expect('species' in c.cat).toBe(false)
    expect(catKey(c.cat).startsWith('dog|')).toBe(false)
    expect(catKey(hatchDog('k')).startsWith('dog|')).toBe(true)
  })
  it('名字用犬种', () => {
    expect(describeCat({ ...hatchDog('n'), coat: 'shiba' })).toMatch(/^柴犬/)
  })
  it('图鉴和称号照常记（部件 id 与猫共用）', () => {
    const spec = { ...hatchDog('dex'), crown: 'halo', back: 'feathered-wings' } as CatSpec
    const dex = recordSpec(emptyDex(), null, spec)
    expect(dex.parts.halo).toBe(1)
    expect(dex.titles.angel).toBe(1)
  })
})

describe('物种边界', () => {
  it('犬种配猫、毛色配狗，都不是合法外观', () => {
    const dog = hatchDog('b')
    expect(isCatSpec({ ...dog, species: undefined })).toBe(false)
    expect(isCatSpec({ ...dog, coat: 'calico' })).toBe(false)
    expect(isCatSpec({ ...dog, species: 'cow' })).toBe(false)
  })
  it('迁移老存档：缺背景的狗补齐后还是狗；存了坏部件的狗重新推导，也还是狗', () => {
    const c = hatch('m', 1, rng('m'), 'dog')
    const { backdrop: _b, ...noBackdrop } = c.cat
    const patched = ensureCat({ ...c, cat: noBackdrop as CatSpec })
    expect(patched.cat).toEqual({ ...c.cat, backdrop: 'none' })
    const broken = ensureCat({ ...c, cat: { ...c.cat, crown: 'banana' } as unknown as CatSpec, catArt: undefined as unknown as typeof c.catArt })
    expect(speciesOf(broken.cat)).toBe('dog')
    expect(canDraw(broken.cat)).toBe(true)
    expect(broken.catArt.styleId).toBe('canine-pixel')
  })
  it('毕业时选狗：下一颗蛋记成狗；导出再导入，狗和蛋的选择都还在', () => {
    const s = { ...defaultState(), creature: hatch('g', 1, rng('g')) }
    const g = graduateCreature(s, 'dog', 100)
    expect(g.creature).toBeNull()
    expect(g.creatureHistory).toHaveLength(1)
    expect(g.eggSpecies).toBe('dog')
    const withDog = { ...g, creature: hatch('g2', 2, rng('g2'), g.eggSpecies) }
    const back = importJson(exportJson(withDog))
    expect(back.eggSpecies).toBe('dog')
    expect(speciesOf(back.creature!.cat)).toBe('dog')
    expect(back.creature!.cat).toEqual(withDog.creature.cat)
  })
  it('五个部件槽 + 背景都参与狗的成长', () => {
    let spec = hatchDog('slots')
    const r = rng('slots-r')
    const seen = new Set<string>()
    for (let i = 0; i < 400; i++) { spec = mutateCat(spec, r); for (const s of MUTATION_SLOTS) if (spec[s] !== 'none') seen.add(s) }
    expect([...seen].sort()).toEqual([...MUTATION_SLOTS].sort())
  })
})
