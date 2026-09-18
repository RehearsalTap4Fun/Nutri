import { describe, expect, it } from 'vitest'
import { canonicalJson, catalogRevisionInput, findCoverage, generatablePhenotypes, isPhenotypeV2, openPack, phenotypeKey, phenotypeKeyV2, phenotypeOf, phenotypeV2Of, pixelArtKey, pixelArtKeyV2, planPixelArt, compactOf, coverageEquivalent, hatchableIslands, isCoveredCompact, islandsFromProfiles, packIslands, planFromCompact, planPixelArtV2, planPixelArtV3, type Phenotype, type PhenotypeV2, type PixelCatalog, type PixelCatalogV2, type PixelCatalogV3, type PixelProfileV3 } from '../src/core/pixelpack'
import { blankRgba, composePlan, type Rgba } from '../src/core/pixelize'
import type { CatSpec } from '../src/core/pixelcat'

const N = 8
const px = (d: Rgba, x: number, y: number) => Array.from(d.slice((y * N + x) * 4, (y * N + x) * 4 + 4))
function rect(x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number]): Rgba {
  const d = blankRgba(N)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = (y * N + x) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255 }
  return d
}
const base: Phenotype = { schemaVersion: 'feline-phenotype-v1', body: 'standard', coat: 'orange-white', expression: 'small-fangs', crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none' }
const catalog: PixelCatalog = {
  schemaVersion: 'pixel-art-catalog-v1', styleId: 'pixel-flat', artVersion: '1.1.0', revision: 'r', rendererVersion: 'pixel-rgba-v1', size: 64,
  resources: { body: { path: 'assets/body.png', sha256: 'a', width: 64, height: 64 }, mane: { path: 'assets/mane.png', sha256: 'b', width: 64, height: 64 }, horns: { path: 'assets/horns.png', sha256: 'c', width: 64, height: 64 } },
  profiles: [{
    id: 'std', body: 'standard', coat: 'orange-white', expression: 'small-fangs',
    steps: [
      { slot: 'back', target: 'frame', resources: {}, clear: [], occlusion: [] },
      { slot: 'crown', target: 'frame', resources: { 'dragon-horns': 'horns' }, clear: [], occlusion: [] },
      { slot: 'body', target: 'subject', resources: { 'small-fangs': 'body' }, clear: [], occlusion: [] },
      { slot: 'ears', target: 'subject', resources: {}, clear: [[[0, 0], [8, 0], [8, 2], [0, 2]]], occlusion: [] },
      { slot: 'tailTip', target: 'frame', resources: {}, clear: [[[6, 0], [8, 0], [8, 8], [6, 8]]], occlusion: [] },
      { slot: 'neck', target: 'subject', resources: { 'small-lion-mane': 'mane' }, clear: [], occlusion: [[[0, 0], [8, 0], [8, 4], [0, 4]]] },
    ],
  }],
  coverage: [
    { id: 'base', label: '基础', phenotype: base, profileId: 'std', review: 'approved', rgbaSha256: 'x' },
    { id: 'mane', label: '鬃', phenotype: { ...base, neck: 'small-lion-mane' }, profileId: 'std', review: 'approved', rgbaSha256: 'y' },
    { id: 'horns', label: '角', phenotype: { ...base, crown: 'dragon-horns' }, profileId: 'std', review: 'pending', rgbaSha256: 'z' },
    { id: 'ears', label: '耳', phenotype: { ...base, ears: 'fin-ears' }, profileId: 'std', review: 'approved', rgbaSha256: 'w' },
  ],
  generatable: ['base', 'mane'],
  evidence: {},
}

describe('pixelpack：与 QMonster 契约逐条对应', () => {
  it('phenotypeKey 是 8 个性状按固定顺序的 JSON 数组；phenotypeOf 默认标准体型', () => {
    const cat: CatSpec = { coat: 'calico', body: 'standard', eyes: 'round', expression: 'small-fangs', crown: 'halo', ears: 'none', neck: 'none', back: 'none', tailTip: 'flame-tail' }
    expect(phenotypeKey(phenotypeOf(cat))).toBe('["standard","calico","small-fangs","halo","none","none","none","flame-tail"]')
    expect(phenotypeOf(cat, 'shortleg-round').body).toBe('shortleg-round')
  })
  it('canonicalJson 键排序、数组保序、标量按 JSON', () => {
    expect(canonicalJson({ b: [3, { z: 1, a: null }], a: 'x' })).toBe('{"a":"x","b":[3,{"a":null,"z":1}]}')
    expect(catalogRevisionInput(catalog)).not.toContain('"revision"')
  })
  it('pixelArtKey 带风格、版本、revision 与表现型键', () => {
    expect(pixelArtKey(base, catalog)).toBe(JSON.stringify(['pixel-flat', '1.1.0', 'r', phenotypeKey(base)]))
  })
  it('findCoverage 只认整份表现型；部件都有也不算覆盖', () => {
    expect(findCoverage(catalog, base)?.id).toBe('base')
    expect(findCoverage(catalog, { ...base, crown: 'dragon-horns', neck: 'small-lion-mane' })).toBeNull()
    expect(findCoverage(catalog, { ...base, body: 'shortleg-round' })).toBeNull()
  })
  it('planPixelArt：none 整步跳过含 clear；有 clear 先 clear 再 draw；body 用 expression 查资源', () => {
    const plan = planPixelArt(catalog, { ...base, neck: 'small-lion-mane' })!
    expect(plan.coverage.id).toBe('mane')
    expect(plan.ops).toEqual([
      { kind: 'draw', layer: 'body', target: 'subject', occlusion: [] },
      { kind: 'draw', layer: 'mane', target: 'subject', occlusion: [[[0, 0], [8, 0], [8, 4], [0, 4]]] },
    ])
  })
  it('planPixelArt：资源缺失（覆盖登记了但 profile 没映射）返回 null，不拼凑', () => {
    expect(planPixelArt(catalog, { ...base, ears: 'fin-ears' })).toBeNull()
    expect(planPixelArt(catalog, { ...base, back: 'dragon-wings' })).toBeNull()
  })
  it('generatablePhenotypes 只给白名单', () => {
    expect(generatablePhenotypes(catalog).map((p) => p.neck)).toEqual(['none', 'small-lion-mane'])
  })
})

describe('composePlan：pixel-rgba-v1 语义', () => {
  const layers: Record<string, Rgba> = { body: rect(2, 2, 5, 5, [200, 200, 200]), mane: rect(1, 1, 6, 6, [50, 50, 250]), horns: rect(3, 0, 4, 1, [240, 220, 180]) }
  const layer = (id: string) => layers[id]
  it('occlusion 只擦当前部件副本，不擦 subject；subject 部件不单独描边', () => {
    const out = composePlan([
      { kind: 'draw', layer: 'body', target: 'subject', occlusion: [] },
      { kind: 'draw', layer: 'mane', target: 'subject', occlusion: [[[0, 0], [8, 0], [8, 4], [0, 4]]] },
    ], layer, N)
    expect(px(out, 3, 3)).toEqual([200, 200, 200, 255]) // 鬃在 y<4 被擦掉，露出身体
    expect(px(out, 3, 5)).toEqual([50, 50, 250, 255]) // y≥4 鬃盖住身体
    expect(px(out, 1, 5)).toEqual([50, 50, 250, 255]) // 鬃自身不描边，直接叠到 subject
    expect(px(out, 0, 5)).toEqual([18, 18, 90, 255]) // 整体 subject 描边落在鬃外
  })
  it('clear 擦已累计的 subject；frame 部件单独描边后叠到后层，再被 subject 盖住', () => {
    const out = composePlan([
      { kind: 'draw', layer: 'horns', target: 'frame', occlusion: [] },
      { kind: 'draw', layer: 'body', target: 'subject', occlusion: [] },
      { kind: 'clear', polygons: [[[5, 2], [8, 2], [8, 8], [5, 8]]] },
    ], layer, N)
    expect(px(out, 5, 3)[3]).toBe(255) // 被擦掉的身体右列变成描边（相邻有身体）
    expect(px(out, 5, 3)).toEqual([72, 72, 72, 255])
    expect(px(out, 6, 3)[3]).toBe(0)
    expect(px(out, 3, 0)).toEqual([240, 220, 180, 255]) // 角在身体上方露出
    expect(px(out, 2, 0)).toEqual([86, 79, 65, 255]) // 角自己的描边
  })
  it('图层 alpha 非二值时拒绝；透明像素颜色被清零后不影响描边取色', () => {
    const bad = rect(2, 2, 5, 5, [1, 2, 3]); bad[(2 * N + 2) * 4 + 3] = 128
    expect(() => composePlan([{ kind: 'draw', layer: 'bad', target: 'subject', occlusion: [] }], () => bad, N)).toThrow()
    const dirty = rect(2, 2, 5, 5, [100, 100, 100]); dirty[0] = 255; dirty[1] = 255; dirty[2] = 255 // 透明像素带颜色
    const out = composePlan([{ kind: 'draw', layer: 'dirty', target: 'subject', occlusion: [] }], () => dirty, N)
    expect(px(out, 0, 0)[3]).toBe(0)
  })
})

describe('pixelpack v2：严格区分 v1/v2', () => {
  const p2: PhenotypeV2 = { schemaVersion: 'feline-phenotype-v2', body: 'standard', coat: 'orange-white', eyes: 'sleepy-almond', expression: 'small-fangs', crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none' }
  const catalog2: PixelCatalogV2 = {
    ...catalog, schemaVersion: 'pixel-art-catalog-v2', artVersion: '1.2.0',
    profiles: [{ ...catalog.profiles[0], id: 'std2', eyes: 'sleepy-almond' }],
    coverage: [{ id: 'base2', label: '半眯基础', phenotype: p2, profileId: 'std2', review: 'approved', rgbaSha256: 'x' }],
    generatable: ['base2'],
  }
  it('isPhenotypeV2 要求 schemaVersion 与 eyes；v1 数据不算 v2', () => {
    expect(isPhenotypeV2(p2)).toBe(true)
    expect(isPhenotypeV2(base)).toBe(false)
    expect(isPhenotypeV2({ ...p2, eyes: undefined })).toBe(false)
    expect(isPhenotypeV2({ ...p2, schemaVersion: 'feline-phenotype-v1' })).toBe(false)
  })
  it('phenotypeKeyV2 是九字段固定顺序，eyes 排在 coat 之后', () => {
    expect(phenotypeKeyV2(p2)).toBe('["standard","orange-white","sleepy-almond","small-fangs","none","none","none","none","none"]')
    expect(() => phenotypeKeyV2(base as unknown as PhenotypeV2)).toThrow()
  })
  it('phenotypeV2Of 必须显式给 body 与 eyes，不隐式补默认值', () => {
    const cat: CatSpec = { coat: 'calico', body: 'standard', eyes: 'round', expression: 'small-fangs', crown: 'halo', ears: 'none', neck: 'none', back: 'none', tailTip: 'none' }
    expect(phenotypeV2Of(cat, 'slender-tall', 'round').eyes).toBe('round')
    expect(phenotypeV2Of(cat, 'slender-tall', 'round').body).toBe('slender-tall')
  })
  it('openPack 按 schemaVersion 分派，未知版本报错', () => {
    expect(openPack(catalog).version).toBe(1)
    expect(openPack(catalog2).version).toBe(2)
    expect(openPack(catalog2).extraTraits).toEqual(['eyes'])
    expect(() => openPack({ ...catalog, schemaVersion: 'pixel-art-catalog-v9' })).toThrow()
  })
  it('planPixelArtV2 的 profile 选择子四项必须全等，错配返回 null', () => {
    expect(planPixelArtV2(catalog2, p2)).not.toBeNull()
    const wrongEyes: PixelCatalogV2 = { ...catalog2, profiles: [{ ...catalog2.profiles[0], eyes: 'round' }] }
    expect(planPixelArtV2(wrongEyes, p2)).toBeNull()
  })
  it('pixelArtKeyV2 带版本与 revision，且与 v1 的键不同', () => {
    expect(pixelArtKeyV2(p2, catalog2)).toContain('1.2.0')
    expect(pixelArtKeyV2(p2, catalog2)).not.toBe(pixelArtKey(base, catalog))
  })
})

describe('pixelpack v3：按性状覆盖渲染层级', () => {
  const p2: PhenotypeV2 = { schemaVersion: 'feline-phenotype-v2', body: 'standard', coat: 'orange-white', eyes: 'round', expression: 'small-fangs', crown: 'none', ears: 'none', neck: 'small-lion-mane', back: 'none', tailTip: 'none' }
  const frillSpec: PhenotypeV2 = { ...p2, neck: 'frill-neck' }
  const poly = [[[0, 0], [8, 0], [8, 4], [0, 4]]]
  const catalog3: PixelCatalogV3 = {
    ...catalog, schemaVersion: 'pixel-art-catalog-v3', artVersion: '1.3.0',
    resources: { ...catalog.resources, frill: { path: 'assets/frill.png', sha256: 'd', width: 64, height: 64 } },
    profiles: [{
      id: 'std3', body: 'standard', coat: 'orange-white', eyes: 'round', expression: 'small-fangs',
      steps: [
        { slot: 'back', target: 'frame', resources: {}, clear: [], occlusion: [] },
        { slot: 'crown', target: 'frame', resources: {}, clear: [], occlusion: [] },
        { slot: 'body', target: 'subject', resources: { 'small-fangs': 'body' }, clear: [], occlusion: [] },
        { slot: 'ears', target: 'subject', resources: {}, clear: [], occlusion: [] },
        { slot: 'tailTip', target: 'frame', resources: {}, clear: [], occlusion: [] },
        // 默认画在主体前（subject）；颈膜用 variants 改到主体后（frame）
        { slot: 'neck', target: 'subject', resources: { 'small-lion-mane': 'mane', 'frill-neck': 'frill' }, clear: [], occlusion: poly, variants: { 'frill-neck': { target: 'frame', clear: [], occlusion: [] } } },
      ],
    }],
    coverage: [
      { id: 'mane3', label: '鬃', phenotype: p2, profileId: 'std3', review: 'approved', rgbaSha256: 'x' },
      { id: 'frill3', label: '膜', phenotype: frillSpec, profileId: 'std3', review: 'pending', rgbaSha256: 'y' },
    ],
    generatable: ['mane3'],
  }
  it('openPack 认得 v3 并优先于 v2 分派', () => {
    expect(openPack(catalog3).version).toBe(3)
    expect(openPack(catalog3).traits).toContain('eyes')
  })
  it('没有 variants 的性状沿用该步默认层级与遮罩', () => {
    const plan = planPixelArtV3(catalog3, p2)!
    expect(plan.ops).toEqual([
      { kind: 'draw', layer: 'body', target: 'subject', occlusion: [] },
      { kind: 'draw', layer: 'mane', target: 'subject', occlusion: poly },
    ])
  })
  it('有 variants 的性状用它自己的层级与遮罩，同一槽位不同部件可以一前一后', () => {
    const plan = planPixelArtV3(catalog3, frillSpec)!
    expect(plan.ops).toEqual([
      { kind: 'draw', layer: 'body', target: 'subject', occlusion: [] },
      { kind: 'draw', layer: 'frill', target: 'frame', occlusion: [] },
    ])
    expect(plan.coverage.review).toBe('pending')
  })
  it('未覆盖的组合返回 null；generatable 只给已验收的', () => {
    expect(planPixelArtV3(catalog3, { ...p2, crown: 'halo' })).toBeNull()
    expect(openPack(catalog3).generatable()).toHaveLength(1)
  })
})

describe('岛：按身份性状切分，岛内横向性状必须闭合', () => {
  const mk = (body: string, eyes: string, expression: string, coat = 'orange-white'): PhenotypeV2 =>
    ({ schemaVersion: 'feline-phenotype-v2', body, coat, eyes, expression, crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none' })
  const build = (phenos: PhenotypeV2[]): PixelCatalogV3 => ({
    ...catalog, schemaVersion: 'pixel-art-catalog-v3', artVersion: 'x',
    profiles: phenos.map((p, i) => ({ id: `p${i}`, body: p.body, coat: p.coat, eyes: p.eyes, expression: p.expression, steps: catalog.profiles[0].steps })),
    coverage: phenos.map((p, i) => ({ id: `c${i}`, label: `c${i}`, phenotype: p, profileId: `p${i}`, review: 'approved' as const, rgbaSha256: 'x' })),
    generatable: phenos.map((_, i) => `c${i}`),
  })
  it('单一横向取值的岛天然闭合（没得换就掉不出去），但不完整', () => {
    const pack = openPack(build([mk('standard', 'round', 'small-fangs'), mk('standard', 'round', 'parted-mouth', 'calico')]))
    const islands = packIslands(pack)
    expect(islands).toHaveLength(2)
    for (const i of islands) { expect(i.closed).toBe(true); expect(i.full).toBe(false) }
  })
  it('岛内横向取值不成矩阵就不闭合，并报出缺失落点', () => {
    // standard 有两种表情，但 sleepy 只有一种 → 换表情会掉出去
    const pack = openPack(build([
      mk('standard', 'round', 'small-fangs'), mk('standard', 'round', 'parted-mouth'), mk('standard', 'sleepy-almond', 'small-fangs'),
    ]))
    const [island] = packIslands(pack)
    expect(island.closed).toBe(false)
    expect(island.full).toBe(true) // 两种表情、两种眼型都出现过，但不成矩阵
    expect(island.missing.some((m) => m.includes('sleepy-almond') && m.includes('parted-mouth'))).toBe(true)
  })
  it('横向取值成完整矩阵时闭合且完整', () => {
    const pack = openPack(build([
      mk('standard', 'round', 'small-fangs'), mk('standard', 'round', 'parted-mouth'),
      mk('standard', 'sleepy-almond', 'small-fangs'), mk('standard', 'sleepy-almond', 'parted-mouth'),
    ]))
    const [island] = packIslands(pack)
    expect(island.closed).toBe(true)
    expect(island.full).toBe(true)
    expect(island.states).toBe(4)
  })
  it('不同毛色互不影响：一种毛色不闭合不会拖累另一种', () => {
    const pack = openPack(build([
      mk('standard', 'round', 'small-fangs'), mk('standard', 'round', 'parted-mouth'), mk('standard', 'sleepy-almond', 'small-fangs'),
      mk('standard', 'round', 'small-fangs', 'calico'),
    ]))
    const islands = packIslands(pack)
    expect(islands.find((i) => i.coat === 'calico')!.closed).toBe(true)
    expect(islands.find((i) => i.coat === 'orange-white')!.closed).toBe(false)
  })
})

describe('压缩形态：只在格子补满时才允许', () => {
  const ph = (over: Partial<PhenotypeV2> = {}): PhenotypeV2 => ({
    schemaVersion: 'feline-phenotype-v2', body: 'standard', coat: 'orange-white', eyes: 'round',
    expression: 'small-fangs', crown: 'none', ears: 'none', neck: 'none', back: 'none', tailTip: 'none', ...over,
  })
  /** 一个只有 crown 与 neck 有映射的 profile：完整格 = 2 crown × 2 neck = 4 */
  const profile: PixelProfileV3 = {
    id: 'std', body: 'standard', coat: 'orange-white', eyes: 'round', expression: 'small-fangs',
    steps: [
      { slot: 'back' as const, target: 'frame' as const, resources: {}, clear: [], occlusion: [] },
      { slot: 'crown' as const, target: 'frame' as const, resources: { 'dragon-horns': 'horns' }, clear: [], occlusion: [] },
      { slot: 'body' as const, target: 'subject' as const, resources: { 'small-fangs': 'body' }, clear: [], occlusion: [] },
      { slot: 'ears' as const, target: 'subject' as const, resources: {}, clear: [], occlusion: [] },
      { slot: 'tailTip' as const, target: 'frame' as const, resources: {}, clear: [], occlusion: [] },
      { slot: 'neck' as const, target: 'subject' as const, resources: { 'small-lion-mane': 'mane' }, clear: [], occlusion: [] },
    ],
  }
  const full = [ph(), ph({ crown: 'dragon-horns' }), ph({ neck: 'small-lion-mane' }), ph({ crown: 'dragon-horns', neck: 'small-lion-mane' })]
  const build = (phenos: PhenotypeV2[]): PixelCatalogV3 => ({
    ...catalog, schemaVersion: 'pixel-art-catalog-v3', artVersion: 'z', profiles: [profile],
    coverage: phenos.map((p, i) => ({ id: `c${i}`, label: `c${i}`, phenotype: p, profileId: 'std', review: 'approved' as const, rgbaSha256: 'x' })),
    generatable: phenos.map((_, i) => `c${i}`),
  })

  it('格子补满时显式 coverage 与推导集合等价', () => {
    const eq = coverageEquivalent(build(full))
    expect(eq.ok).toBe(true)
    expect(eq.explicit).toBe(4)
    expect(eq.derived).toBe(4)
  })
  it('格子有空洞时不等价，并指出仅推导有的那些（压缩会误判为已覆盖）', () => {
    const eq = coverageEquivalent(build(full.slice(0, 2)))
    expect(eq.ok).toBe(false)
    expect(eq.explicit).toBe(2)
    expect(eq.derived).toBe(4)
    expect(eq.onlyDerived.length).toBeGreaterThan(0)
    expect(eq.onlyExplicit).toEqual([])
  })
  it('compactOf 去掉 coverage/generatable/evidence，保留渲染必需的部分', () => {
    const c = compactOf(build(full))
    expect('coverage' in c).toBe(false)
    expect('generatable' in c).toBe(false)
    expect('evidence' in c).toBe(false)
    expect(c.profiles).toHaveLength(1)
    expect(Object.keys(c.resources).length).toBeGreaterThan(0)
    expect(JSON.stringify(c).length).toBeLessThan(JSON.stringify(build(full)).length)
  })
  it('planFromCompact 与 planPixelArtV3 对已覆盖组合给出相同计划', () => {
    const cat = build(full)
    const c = compactOf(cat)
    for (const p of full) {
      expect(planFromCompact(c, p)).toEqual(planPixelArtV3(cat, p)!.ops)
    }
  })
  it('planFromCompact 对没有映射的部件返回 null（不拼凑）', () => {
    const c = compactOf(build(full))
    expect(planFromCompact(c, ph({ back: 'dragon-wings' }))).toBeNull()
    expect(planFromCompact(c, ph({ eyes: 'sleepy-almond' }))).toBeNull()
    expect(isCoveredCompact(c, ph())).toBe(true)
    expect(isCoveredCompact(c, ph({ crown: 'halo' }))).toBe(false)
  })
  it('islandsFromProfiles / hatchableIslands：闭合看矩阵，可孵化还要横向落点 ≥2', () => {
    const one = compactOf(build(full))
    expect(islandsFromProfiles(one)[0].closed).toBe(true) // 单格矩阵天然闭合
    expect(hatchableIslands(one)).toHaveLength(0) // 1 表情 + 1 眼型 = 2 < 4
    const four = compactOf({
      ...build(full),
      profiles: [
        profile,
        { ...profile, id: 'b', eyes: 'sleepy-almond' },
        { ...profile, id: 'c', expression: 'parted-mouth', steps: profile.steps.map((s) => (s.slot === 'body' ? { ...s, resources: { 'parted-mouth': 'body' } } : s)) },
        { ...profile, id: 'd', eyes: 'sleepy-almond', expression: 'parted-mouth', steps: profile.steps.map((s) => (s.slot === 'body' ? { ...s, resources: { 'parted-mouth': 'body' } } : s)) },
      ],
    })
    expect(islandsFromProfiles(four)[0].closed).toBe(true)
    expect(hatchableIslands(four)).toHaveLength(1)
  })
  it('矩阵缺角时不闭合，且报出缺的格子', () => {
    const three = compactOf({
      ...build(full),
      profiles: [profile, { ...profile, id: 'b', eyes: 'sleepy-almond' }, { ...profile, id: 'c', expression: 'parted-mouth' }],
    })
    const [island] = islandsFromProfiles(three)
    expect(island.closed).toBe(false)
    expect(island.missing).toContain('orange-white/standard/sleepy-almond/parted-mouth')
  })
})
