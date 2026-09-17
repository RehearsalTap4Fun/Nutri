/**
 * 像素包覆盖连通性分析：回答「一只猫沿 nutri 的成长规则走，哪几条边会离开覆盖范围」。
 * Codex 用它安排补洞批次（2026-09-16 交流文件里的请求），nutri 用它判断运行时开关能否打开。
 *
 *   npx tsx scripts/pixelPackCoverage.ts [--pack ../RandomPet-master/dist/pixel-art/approved]
 *
 * 口径：以目录里每个已覆盖表现型为起点，枚举 nutri `mutateCat` 允许的全部下一步（只进不退、
 * 表情横向可换），看落点是否仍在覆盖内。不模拟概率，只看图的连通性。
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CAT_SLOT_OPTIONS, MUTABLE_SLOTS, MUTATION_SLOTS, upgradesFor, type CatSlot } from '../src/core/pixelcat'
import { PHENOTYPE_TRAITS, isPixelCatalog, phenotypeKey, type Phenotype, type PixelCatalog } from '../src/core/pixelpack'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RP = resolve(process.env.RANDOMPET_DIR ?? join(ROOT, '..', 'RandomPet-master'))
const args = process.argv.slice(2)
const argOf = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
const PACK = resolve(argOf('--pack') ?? join(RP, 'dist', 'pixel-art', 'approved'))

const raw: unknown = JSON.parse(readFileSync(join(PACK, 'catalog.json'), 'utf8'))
if (!isPixelCatalog(raw)) throw new Error('不是 pixel-art-catalog-v1')
const catalog: PixelCatalog = raw
const covered = new Map(catalog.coverage.map((c) => [phenotypeKey(c.phenotype), c]))
const show = (p: Phenotype) => `${p.body}/${p.coat}/${p.expression}` + MUTATION_SLOTS.map((s) => (p[s] === 'none' ? '' : `+${p[s]}`)).join('')

/** nutri 的一步成长：可变槽位里，表情横向换、异变位只进不退 */
function nextStates(p: Phenotype): Array<{ slot: CatSlot; to: string; next: Phenotype }> {
  const out: Array<{ slot: CatSlot; to: string; next: Phenotype }> = []
  for (const slot of MUTABLE_SLOTS) {
    const options = slot === 'expression'
      ? CAT_SLOT_OPTIONS.expression.filter((v) => v !== p.expression)
      : upgradesFor(slot, p[slot])
    for (const to of options) out.push({ slot, to, next: { ...p, [slot]: to } })
  }
  return out
}

const coats = new Set(catalog.coverage.map((c) => c.phenotype.coat))
const bodies = new Set(catalog.coverage.map((c) => c.phenotype.body))
const expressions = new Set(catalog.coverage.map((c) => c.phenotype.expression))
console.log(`目录 ${catalog.artVersion}：覆盖 ${catalog.coverage.length} 个组合`)
console.log(`  毛色 ${[...coats].join(', ')}（nutri 有 6 种）· 体型 ${[...bodies].join(', ')} · 表情 ${[...expressions].join(', ')}（nutri 有 ${CAT_SLOT_OPTIONS.expression.length} 种）`)

let stay = 0, leave = 0
const misses = new Map<string, { p: Phenotype; hits: number; from: string[] }>()
const deadEnds: string[] = []
for (const c of catalog.coverage) {
  const steps = nextStates(c.phenotype)
  let localStay = 0
  for (const { slot, to, next } of steps) {
    if (covered.has(phenotypeKey(next))) { stay++; localStay++; continue }
    leave++
    const k = phenotypeKey(next)
    const m = misses.get(k) ?? { p: next, hits: 0, from: [] }
    m.hits++
    m.from.push(`${c.id} --${slot}=${to}-->`)
    misses.set(k, m)
  }
  if (steps.length > 0 && localStay === 0) deadEnds.push(`${c.id}（${show(c.phenotype)}）`)
}
const total = stay + leave
console.log(`\n成长边：共 ${total} 条，留在覆盖内 ${stay} 条（${((stay / total) * 100).toFixed(1)}%），离开 ${leave} 条`)
if (deadEnds.length) {
  console.log(`\n死胡同（任何一步成长都会离开覆盖）${deadEnds.length} 个：`)
  for (const d of deadEnds) console.log(`  - ${d}`)
}
const ranked = [...misses.values()].sort((a, b) => b.hits - a.hits)
console.log(`\n缺失的落点表现型 ${ranked.length} 个，按被指向次数排序（前 20）：`)
for (const m of ranked.slice(0, 20)) console.log(`  ${String(m.hits).padStart(2)} 条边 → ${show(m.p)}`)

// 只差一个表情映射就能补上的洞：落点的异变组合已在别的表情下覆盖
const byMutations = new Map<string, Set<string>>()
for (const c of catalog.coverage) {
  const k = JSON.stringify([c.phenotype.body, ...MUTATION_SLOTS.map((s) => c.phenotype[s])])
  if (!byMutations.has(k)) byMutations.set(k, new Set())
  byMutations.get(k)!.add(c.phenotype.expression)
}
const expressionHoles = ranked.filter((m) => {
  const k = JSON.stringify([m.p.body, ...MUTATION_SLOTS.map((s) => m.p[s])])
  return byMutations.has(k) && !byMutations.get(k)!.has(m.p.expression)
})
if (expressionHoles.length) {
  console.log(`\n其中 ${expressionHoles.length} 个只是「同一套异变换个表情」的洞（异变组合已在别的表情下覆盖，补 profile 映射即可）：`)
  for (const m of expressionHoles.slice(0, 12)) console.log(`  ${String(m.hits).padStart(2)} 条边 → ${show(m.p)}`)
}
console.log(`\n注：nutri 的毛色 ${[...coats].length}/6 被覆盖，未覆盖毛色的猫一条边都进不了覆盖，这是与成长边无关的独立缺口。`)
console.log(`PHENOTYPE_TRAITS = ${PHENOTYPE_TRAITS.join(', ')}`)
