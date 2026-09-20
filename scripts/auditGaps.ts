// 食材库缺口审计：npm run gaps
//   npm run gaps -- --list       连带打印每个分类的现有条目
//   npm run gaps -- --prio 0,1   只看指定优先级的补录候选
//
// 干三件事：
//   1. 盘分类薄厚、笼统条目、零引用条目
//   2. 交叉检查 core/conditions.ts 里 16 个硬编码食材集合（悬空 id = 真 bug；未归类食材 = 对特殊人群模式隐形）
//   3. 输出按优先级排序的补录清单（来自 scripts/data/gapCandidates.ts，补完即删）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { INGREDIENTS } from '../src/core/../data/ingredients'
import { DISHES } from '../src/data/dishes/index'
import type { IngredientCategory } from '../src/core/types'
import { CANDIDATES } from './data/gapCandidates'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const wantList = argv.includes('--list')
const prioArg = argv.indexOf('--prio')
const prioFilter = prioArg >= 0 ? new Set(argv[prioArg + 1].split(',').map(Number)) : null

const ORDER: IngredientCategory[] = ['grain', 'tuber', 'vegetable', 'mushroom', 'fruit', 'meat', 'poultry', 'seafood', 'egg', 'dairy', 'soy', 'legume', 'nut', 'oil', 'sugar', 'condiment', 'beverage', 'processed']
const CN: Record<string, string> = { grain: '谷类', tuber: '薯类', vegetable: '蔬菜', mushroom: '菌藻', fruit: '水果', meat: '畜肉', poultry: '禽肉', seafood: '鱼虾蟹贝', egg: '蛋类', dairy: '乳类', soy: '豆制品', legume: '干豆', nut: '坚果', oil: '油脂', sugar: '糖类', condiment: '调味品', beverage: '饮料', processed: '加工食品' }
// 《中国食物成分表》第 6 版各分类的大致条目量级，用作「薄厚」的参照系，不是补录目标
const REF: Partial<Record<IngredientCategory, number>> = { grain: 180, tuber: 60, vegetable: 350, mushroom: 60, fruit: 140, meat: 250, poultry: 120, seafood: 300, egg: 30, dairy: 90, soy: 60, legume: 60, nut: 70, oil: 30, sugar: 30, condiment: 130, beverage: 80, processed: 200 }

const byId = new Map(INGREDIENTS.map((i) => [i.id, i]))
const byCat = new Map<string, typeof INGREDIENTS>()
for (const i of INGREDIENTS) { if (!byCat.has(i.cat)) byCat.set(i.cat, []); byCat.get(i.cat)!.push(i) }
const use = new Map<string, number>()
for (const d of DISHES) for (const p of d.parts) use.set(p.ing, (use.get(p.ing) || 0) + 1)

const line = (s = '') => console.log(s)
const h = (s: string) => { line(); line('─'.repeat(64)); line(s); line('─'.repeat(64)) }

// ── 1. 分类薄厚 ───────────────────────────────────────────────
h('1. 分类薄厚（ref = 成分表第6版量级，仅作参照）')
line('分类        现有  ref   覆盖  有来源  零引用  被菜引用')
const thin: Array<[string, number]> = []
for (const c of ORDER) {
  const list = byCat.get(c) || []
  const ref = REF[c] || 0
  const cov = ref ? list.length / ref : 0
  if (ref && cov < 0.12) thin.push([c, cov])
  const bar = '█'.repeat(Math.round(cov * 20)).padEnd(20, '·')
  line(`${(CN[c] || c).padEnd(10, '　')}${String(list.length).padStart(4)}${String(ref).padStart(6)}  ${(cov * 100).toFixed(0).padStart(3)}%  ${String(list.filter((i) => i.source).length).padStart(4)}  ${String(list.filter((i) => !use.has(i.id)).length).padStart(5)}  ${String(list.reduce((s, i) => s + (use.get(i.id) || 0), 0)).padStart(7)}  ${bar}`)
}
line(`\n合计 ${INGREDIENTS.length} 条 / 参照约 ${Object.values(REF).reduce((a, b) => a + b, 0)} 条，整体覆盖约 ${((INGREDIENTS.length / Object.values(REF).reduce((a, b) => a + b, 0)) * 100).toFixed(0)}%`)
if (thin.length) line(`最薄的分类：${thin.sort((a, b) => a[1] - b[1]).map(([c, v]) => `${CN[c] || c}(${(v * 100).toFixed(0)}%)`).join('、')}`)
if (wantList) {
  for (const c of ORDER) {
    const list = byCat.get(c) || []
    line(`\n[${CN[c] || c}] ${list.length}  (带 * 的是没有任何菜用到的)`)
    line('  ' + list.map((i) => `${i.name}${use.has(i.id) ? '' : '*'}`).join('、'))
  }
}

// ── 2. 笼统条目 ───────────────────────────────────────────────
h('2. 笼统条目（一条顶多样，精度损失点）')
const vague = INGREDIENTS.filter((i) => /[\/／]/.test(i.name) || /近似|等$/.test(i.name))
line(`${vague.length} 条。被菜引用越多，含糊的代价越大：`)
for (const i of vague.sort((a, b) => (use.get(b.id) || 0) - (use.get(a.id) || 0)).slice(0, 18)) {
  line(`  ${String(use.get(i.id) || 0).padStart(3)} 次  ${i.name}  (${i.id}, ${CN[i.cat] || i.cat})`)
}

// ── 3. 零引用 ─────────────────────────────────────────────────
h('3. 零引用食材（没有任何菜用到，只能靠自建菜触达）')
const orphans = INGREDIENTS.filter((i) => !use.has(i.id))
line(`${orphans.length} 条：${orphans.map((i) => i.name).join('、')}`)
line('（刚补录的食材必然在此列——它们对搜索、自建菜、LLM 录餐都可用，只是还没有菜谱引用）')

// ── 4. conditions.ts 集合交叉检查 ─────────────────────────────
h('4. core/conditions.ts 食材集合体检')
const src = fs.readFileSync(path.join(HERE, '../src/core/conditions.ts'), 'utf8')
const condSets = new Map<string, string[]>()
for (const m of src.matchAll(/const ([A-Z_]+) = new Set\(\[([^\]]*)\]\)/g)) {
  condSets.set(m[1], [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]))
}
let dangling = 0
const classified = new Set<string>()
line('集合                    条数  悬空id(库里不存在)')
for (const [name, ids] of condSets) {
  const bad = ids.filter((id) => !byId.has(id))
  ids.forEach((id) => byId.has(id) && classified.add(id))
  dangling += bad.length
  line(`  ${name.padEnd(22)}${String(ids.length).padStart(3)}   ${bad.length ? '⚠ ' + bad.join(', ') : '-'}`)
}
line(`\n悬空 id 合计 ${dangling} 个${dangling ? '（这些是真 bug：集合里写了库中不存在的食材，判定永远不触发）' : ''}`)
const unclassified = INGREDIENTS.filter((i) => !classified.has(i.id) && ['meat', 'poultry', 'seafood', 'vegetable', 'soy', 'dairy', 'egg'].includes(i.cat))
line(`\n主蛋白/蔬菜类里一个集合都没进的：${unclassified.length} 条`)
line('（普通蔬菜本就不该进任何集合，这里只是给补录时对照用；但畜肉/禽肉/鱼虾蟹贝出现在下面就是漏登记）')
for (const c of ['meat', 'poultry', 'seafood', 'vegetable', 'soy', 'dairy', 'egg'] as const) {
  const l = unclassified.filter((i) => i.cat === c)
  if (l.length) line(`  [${CN[c]}] ${l.length}：${l.map((i) => i.name).join('、')}`)
}

// ── 4b. 集合归属提示 ─────────────────────────────────────────
h('4b. 疑似漏登记（粗筛规则，需人工判断后再登记）')
line('补录新食材后跑这里。命中不等于该登记——例如天然高钠的紫菜会被腌腊规则抓到，')
line('但高血压模式对腌腊是硬排除，归错会禁掉本该推荐的食物。')
const NUT = (id: string) => byId.get(id)!.per100
const kw = (i: { name: string }, ...k: string[]) => k.some((x) => i.name.includes(x))
const RULES: Array<[string, (i: (typeof INGREDIENTS)[number]) => boolean, string]> = [
  ['PICKLED_OR_CURED', (i) => NUT(i.id).sodium >= 700 && ['vegetable', 'meat', 'poultry', 'seafood', 'egg', 'processed'].includes(i.cat), '钠≥700 的腌腊腌渍（天然高钠海藻不算）'],
  ['FATTY_MEAT', (i) => ['meat', 'poultry'].includes(i.cat) && NUT(i.id).fat >= 20, '脂肪≥20g 的畜禽肉'],
  ['LEAN_PROTEIN', (i) => ['meat', 'poultry', 'seafood', 'egg', 'soy', 'dairy'].includes(i.cat) && NUT(i.id).protein >= 15 && NUT(i.id).fat <= 5, '蛋白≥15g 脂肪≤5g（内脏与高钠加工品不收）'],
  ['DAIRY', (i) => i.cat === 'dairy' && !kw(i, '黄油', '淡奶油', '冰淇淋', '蛋白粉', '植脂末', '炼乳', '奶油奶酪'), '计入奶类摄入的乳制品'],
  ['WHOLE_GRAIN', (i) => ['grain', 'tuber', 'legume'].includes(i.cat) && NUT(i.id).fiber >= 3, '纤维≥3g 的谷薯豆（高糖麦片不算）'],
  // 排除：酱(糊状)、白果板栗(淀粉质，煮熟即软)、芝麻奇亚亚麻(小粒种子，不需咀嚼)
  ['HARD_TO_CHEW', (i) => i.cat === 'nut' && !kw(i, '酱', '白果', '板栗', '芝麻', '奇亚', '亚麻'), '坚果（糊状/淀粉质/小粒种子不算）'],
  ['ACIDIC', (i) => kw(i, '柠檬', '橙', '柚', '番茄', '醋', '山楂', '菠萝'), '反流模式的酸性食物'],
]
let hinted = 0
for (const [name, rule, note] of RULES) {
  const cur = condSets.get(name)
  if (!cur) continue
  const miss = INGREDIENTS.filter((i) => !cur.includes(i.id) && rule(i))
  if (!miss.length) continue
  hinted++
  line(`  【${name}】${note}`)
  line(`      ${miss.map((i) => `${i.name}(${i.id})`).join('、')}`)
}
if (!hinted) line('  无命中')

// ── 5. 补录清单 ───────────────────────────────────────────────
h('5. 补录清单（已存在的自动过滤）')
const nameSet = new Set(INGREDIENTS.map((i) => i.name))
const pending = CANDIDATES.filter((c) => !byId.has(c.id) && !nameSet.has(c.name)).filter((c) => !prioFilter || prioFilter.has(c.prio))
const done = CANDIDATES.length - CANDIDATES.filter((c) => !byId.has(c.id) && !nameSet.has(c.name)).length
const LABEL = ['P0 不补就是算错', 'P1 中餐高频、库里全无', 'P2 让特殊人群模式判得更准', 'P3 长尾']
for (const p of [0, 1, 2, 3] as const) {
  const l = pending.filter((c) => c.prio === p)
  if (!l.length) continue
  line(`\n【${LABEL[p]}】${l.length} 条`)
  for (const c of l) {
    line(`  · ${c.name}  (${c.id} · ${CN[c.cat] || c.cat} · 取值来源 ${c.src})`)
    line(`      ${c.why}`)
    if (c.standin) line(`      现被顶替：${c.standin}`)
    if (c.sets?.length) line(`      补后需登记：${c.sets.join(', ')}`)
  }
}
line(`\n待补 ${pending.length} 条${done ? `，已完成 ${done} 条（已从清单自动过滤）` : ''}`)
const nextPrio = [0, 1, 2, 3].find((n) => pending.some((c) => c.prio === n))
line(nextPrio === undefined
  ? `\n清单已清空。16 个集合于 2026-09-20 系统复核过一轮，结论见 gapCandidates.ts 顶部注释。`
  : `\n下一批：${LABEL[nextPrio]}（${pending.filter((c) => c.prio === nextPrio).length} 条）。补完回头看「4b. 疑似漏登记」确认新食材都归了类。`)
line('提醒：补录只是让食材「可用」，不会自动改写已有菜谱。例如味精/鸡精补进来了，但 569 道菜的 parts 里没有它，')
line('      家常菜的钠仍然偏低——要真正修正，得逐道菜往 parts 里加调味料，那是另一件工程。')
