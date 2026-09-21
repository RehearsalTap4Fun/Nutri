/**
 * 比对一个候选像素包和当前正式包：**候选有没有动过老东西。**
 *
 *   npx tsx scripts/pixelPackDiff.ts --pack <候选目录> [--catalog catalog.candidate.json]
 *                                    [--base ../RandomPet-master/dist/pixel-art/v3-approved-1.5.0]
 *
 * 回放（`pixelPackReplay.ts`）回答的是「候选自己算得对不对」，它对着候选自己的摘要核对，
 * 所以候选把某只老猫改了、同时把摘要也改了，回放照样全绿。这里回答另一个问题：
 * 老 coverage 的 rgbaSha256 有没有变、老性状的 target／clear／occlusion／variants／图层有没有被动过。
 *
 * 新增性状本来就该有变化，所以按名单排除；名单从「候选有而正式包没有」自动推出来，不用手写。
 * 任一项不一致退出码 1。
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const argOf = (name: string): string | undefined => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const RP = resolve(process.env.RANDOMPET_DIR ?? join(resolve('.'), '..', 'RandomPet-master'))
const PACK = resolve(argOf('--pack') ?? '')
const BASE = resolve(argOf('--base') ?? join(RP, 'dist', 'pixel-art', 'v3-approved-1.5.0'))
if (!PACK) throw new Error('要 --pack <候选目录>')

/* eslint-disable @typescript-eslint/no-explicit-any */
const read = (dir: string, file: string): any => JSON.parse(readFileSync(join(dir, file), 'utf8'))
const base = read(BASE, 'catalog.json')
const cand = read(PACK, argOf('--catalog') ?? 'catalog.json')
const profilesOf = (c: any): Map<string, any> =>
  new Map((Array.isArray(c.profiles) ? c.profiles : Object.values(c.profiles)).map((p: any) => [p.id, p]))
const B = profilesOf(base)
const C = profilesOf(cand)
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

console.log(`正式 ${base.artVersion}（${B.size} profile）→ 候选 ${cand.artVersion}（${C.size} profile）`)

// 新增性状：候选的 resources 映射里有、正式包里没有的那些
const traitsOf = (M: Map<string, any>) => {
  const out = new Set<string>()
  for (const p of M.values()) for (const s of p.steps) for (const t of Object.keys(s.resources)) out.add(`${s.slot}/${t}`)
  return out
}
const baseTraits = traitsOf(B)
const added = [...traitsOf(C)].filter((t) => !baseTraits.has(t)).sort()
console.log(`新增性状 ${added.length} 项：${added.join('、') || '（无）'}`)

const bad: string[] = []

// 1. 老 profile 里，老性状的渲染方式与图层
for (const [id, c] of C) {
  const b = B.get(id)
  if (!b) { bad.push(`${id}：正式包里没有这个 profile`); continue }
  for (const cs of c.steps) {
    const bs = b.steps.find((x: any) => x.slot === cs.slot)
    if (!bs) { bad.push(`${id}/${cs.slot}：新增步骤`); continue }
    if (!same(bs.target, cs.target)) bad.push(`${id}/${cs.slot}：默认 target ${bs.target} → ${cs.target}`)
    if (!same(bs.clear, cs.clear)) bad.push(`${id}/${cs.slot}：默认 clear 变了`)
    if (!same(bs.occlusion, cs.occlusion)) bad.push(`${id}/${cs.slot}：默认 occlusion 变了`)
    for (const [t, layer] of Object.entries(bs.resources)) {
      if (cs.resources[t] !== layer) bad.push(`${id}/${cs.slot}：老性状 ${t} 换了图层`)
    }
    const bv = bs.variants ?? {}
    const cv = cs.variants ?? {}
    for (const t of new Set([...Object.keys(bv), ...Object.keys(cv)])) {
      if (added.includes(`${cs.slot}/${t}`)) continue
      if (!same(bv[t], cv[t])) bad.push(`${id}/${cs.slot}：老性状 ${t} 的 variant 变了`)
    }
  }
}
for (const id of B.keys()) if (!C.has(id)) bad.push(`${id}：候选里不见了`)

// 2. 老 coverage 的摘要
const bc = new Map<string, string>(base.coverage.map((x: any) => [x.id, x.rgbaSha256]))
const cc = new Map<string, string>(cand.coverage.map((x: any) => [x.id, x.rgbaSha256]))
let kept = 0
for (const [id, sha] of bc) {
  const now = cc.get(id)
  if (now === undefined) bad.push(`coverage ${id}：候选里不见了`)
  else if (now !== sha) bad.push(`coverage ${id}：rgbaSha256 变了`)
  else kept++
}
console.log(`老 coverage ${bc.size} 条：${kept} 条摘要不变；候选共 ${cc.size} 条（新增 ${cc.size - kept}）`)

// 3. 老图层的字节
let layersKept = 0
for (const [id, res] of Object.entries<any>(base.resources)) {
  const c = cand.resources[id]
  if (!c) { bad.push(`图层 ${id}：候选里不见了`); continue }
  if (c.sha256 !== res.sha256) bad.push(`图层 ${id}：sha256 变了`)
  else layersKept++
}
console.log(`老图层 ${Object.keys(base.resources).length} 张：${layersKept} 张摘要不变；候选共 ${Object.keys(cand.resources).length} 张`)

if (bad.length) {
  console.error(`\n✗ 候选动了不该动的地方，共 ${bad.length} 处：`)
  for (const x of bad.slice(0, 30)) console.error(`  ${x}`)
  if (bad.length > 30) console.error(`  …还有 ${bad.length - 30} 处`)
  process.exit(1)
}
console.log('\n✓ 候选只做了加法：老 profile 的渲染方式、老性状的图层、老 coverage 的摘要都没动')
