/**
 * 成长阵容与资源包必须对得上，两个方向都要。
 *
 * 起因是 1.6.1 那次：像素包发了五件新部件，但 Nutri 的成长阵容写在 `pixelcat.ts` 里，
 * 不动它的话包里有图也没有一只猫长得出来——安静地什么都不发生，测不出来也报不出来。
 * 反过来更糟：阵容里写了包里没有的部件，猫一长出来就画不出，`ensureCat` 会把整只猫重推，
 * 用户的猫直接变样。
 *
 * 所以这里同时守两边：**阵容 ⊆ 包**（长得出来的都画得出来）、**包 ⊆ 阵容**（画得出来的都长得到）。
 * 猫的五个槽位对像素包，背景这一槽对场景包。
 */
import { describe, expect, it } from 'vitest'
import { artPartsBySlot } from '../src/core/catArt'
import { SCENE, SCENE_BACKDROPS, SCENE_GEOMETRY, SCENE_META, backdropLayer, backdropRarity } from '../src/core/catScene'
import { CAT_SLOT_OPTIONS, CAT_TIER, MUTATION_SLOTS, maxGrowthSteps, slotLadder } from '../src/core/pixelcat'
import { composeScene } from '../src/core/pixelscene'

const PART_SLOTS = MUTATION_SLOTS.filter((s) => s !== 'backdrop')

describe('成长阵容 ↔ 像素包', () => {
  const inPack = artPartsBySlot()

  for (const slot of PART_SLOTS) {
    it(`${slot}：阵容里的每件部件，包里都有图`, () => {
      const roster = (CAT_SLOT_OPTIONS[slot] as readonly string[]).filter((v) => v !== 'none')
      expect(roster.length).toBeGreaterThan(0)
      for (const part of roster) expect(inPack[slot] ?? [], `${slot}/${part} 阵容里有、包里没有`).toContain(part)
    })

    it(`${slot}：包里的每件部件，阵容里都长得到`, () => {
      const roster = (CAT_SLOT_OPTIONS[slot] as readonly string[]).filter((v) => v !== 'none')
      for (const part of inPack[slot] ?? []) {
        expect(roster, `${slot}/${part} 包里有图，但没有一只猫长得出来`).toContain(part)
      }
    })
  }
})

describe('成长阵容 ↔ 场景包', () => {
  it('背景这一槽的取值就是场景包声明的那几张，顺序也一致', () => {
    const roster = (CAT_SLOT_OPTIONS.backdrop as readonly string[]).filter((v) => v !== 'none')
    expect(roster).toEqual(SCENE_BACKDROPS)
  })

  it('每档背景都解析得到图层，品质与场景包一致', () => {
    for (const b of SCENE_BACKDROPS) {
      expect(backdropLayer(b), `${b} 解析不到图层`).toBeTruthy()
      expect(SCENE.resources[backdropLayer(b)!], `${b} 的图层不在 resources 里`).toBeTruthy()
      expect(CAT_TIER[b as keyof typeof CAT_TIER], `${b} 的品质档与场景包不一致`).toBe(backdropRarity(b))
    }
  })

  it('none 不是背景，也不该有图层', () => {
    expect(backdropLayer('none')).toBeNull()
    expect(backdropRarity('none')).toBeNull()
  })
})

describe('场景几何与成长深度', () => {
  it('画布 96×64，猫 64×64 锚在 (16,0)', () => {
    expect(SCENE_GEOMETRY.canvas).toEqual({ width: 96, height: 64 })
    expect(SCENE_GEOMETRY.subject).toEqual({ width: 64, height: 64, anchor: { x: 16, y: 0 } })
  })

  it('装着的场景包声明依赖的猫包，就是本地装着的那版', () => {
    expect(SCENE_META.subjectArtVersion).toBe('1.6.1')
    expect(SCENE_META.rendererVersion).toBe('pixel-scene-rgba-v1')
  })

  it('六个槽位各三阶，合计 18 阶', () => {
    for (const slot of MUTATION_SLOTS) expect(slotLadder(slot).length, slot).toBe(3)
    expect(MUTATION_SLOTS).toHaveLength(6)
    expect(maxGrowthSteps()).toBe(18)
  })
})

describe('composeScene', () => {
  const geo = SCENE_GEOMETRY
  const W = geo.canvas.width
  const H = geo.canvas.height
  const solidCat = () => {
    const a = new Uint8ClampedArray(64 * 64 * 4)
    for (let i = 0; i < a.length; i += 4) { a[i] = 200; a[i + 1] = 100; a[i + 2] = 50; a[i + 3] = 255 }
    return a
  }

  it('没有背景时仍然是 96×64，猫落在锚点上', () => {
    const out = composeScene(null, solidCat(), geo)
    expect(out.length).toBe(W * H * 4)
    // 锚点左边一格该是空的，锚点上该是猫
    expect(out[(0 * W + 15) * 4 + 3]).toBe(0)
    expect(out[(0 * W + 16) * 4 + 3]).toBe(255)
    expect(out[(0 * W + 79) * 4 + 3]).toBe(255)
    expect(out[(0 * W + 80) * 4 + 3]).toBe(0)
  })

  it('猫的透明处让背景透出来', () => {
    const cat = new Uint8ClampedArray(64 * 64 * 4) // 全透明
    const bd = new Uint8ClampedArray(W * H * 4)
    for (let i = 0; i < bd.length; i += 4) { bd[i] = 10; bd[i + 1] = 200; bd[i + 2] = 10; bd[i + 3] = 255 }
    const out = composeScene(bd, cat, geo)
    const i = (10 * W + 40) * 4
    expect([out[i], out[i + 1], out[i + 2]]).toEqual([10, 200, 10])
  })

  it('尺寸不对就抛错，不静默画歪', () => {
    expect(() => composeScene(null, new Uint8ClampedArray(4), geo)).toThrow(/猫的尺寸/)
    expect(() => composeScene(new Uint8ClampedArray(4), solidCat(), geo)).toThrow(/背景尺寸/)
  })
})
