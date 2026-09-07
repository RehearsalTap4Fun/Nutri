// 各项每日目标的计算规则与权威出处。界面上的「这些目标怎么来的」「关于 · 参考文献」都从这里取，
// 改算法时同步改这里，保证说明与代码一致。
import type { Condition, Profile, Targets } from './types'
import { ACTIVITY_FACTOR, GOAL_FACTOR } from './energy'

export interface SourceRef {
  id: string
  org: string
  title: string
  year: string
  /** 本应用具体引用了它的哪条数字 */
  used: string
}

export const SOURCES: SourceRef[] = [
  { id: 'dg2022', org: '中国营养学会', title: '中国居民膳食指南（2022）', year: '2022', used: '蔬菜 300~500 g、水果 200~350 g、奶类 300 g 以上、盐 <5 g（钠 2000 mg）、饮水男 1700 / 女 1500 ml、三餐能量 3:4:3；孕期、哺乳期、备孕、老年人分册' },
  { id: 'dris2023', org: '中国营养学会', title: '中国居民膳食营养素参考摄入量（2023 版）', year: '2023', used: '蛋白 RNI 0.98 g/kg；脂肪 20~30%E、碳水 50~65%E；膳食纤维 25~30 g；孕中期 +250 千卡 / +15 g 蛋白、孕晚期 +400 / +30；乳母 +400 千卡 / +25 g；水：孕妇 1700、乳母 2100 ml' },
  { id: 'mifflin1990', org: 'Mifflin MD 等', title: 'A new predictive equation for resting energy expenditure in healthy individuals', year: 'Am J Clin Nutr, 1990', used: '基础代谢 Mifflin-St Jeor 公式（没有体脂率时）' },
  { id: 'katch', org: 'McArdle WD, Katch FI, Katch VL', title: 'Exercise Physiology: Nutrition, Energy, and Human Performance', year: '教材，多版', used: '基础代谢 Katch-McArdle 公式 370 + 21.6 × 瘦体重（有体脂率时）' },
  { id: 'fao2001', org: 'FAO / WHO / UNU', title: 'Human Energy Requirements（专家咨询报告）', year: '2001，2004 出版', used: '体力活动水平系数 1.2~1.9' },
  { id: 'issn2017', org: 'International Society of Sports Nutrition', title: 'Position Stand: Protein and Exercise（Jäger R 等）', year: 'JISSN, 2017', used: '运动人群蛋白 1.4~2.0 g/kg；能量缺口下更高以保肌' },
  { id: 'morton2018', org: 'Morton RW 等', title: 'Systematic review and meta-analysis of protein supplementation and resistance training', year: 'Br J Sports Med, 2018', used: '蛋白摄入超过约 1.6 g/kg 后增肌收益趋平' },
  { id: 'dga2020', org: '美国农业部 / 卫生与公众服务部', title: 'Dietary Guidelines for Americans 2020–2025', year: '2020', used: '膳食纤维 14 g / 1000 千卡' },
  { id: 'dash', org: '美国国立卫生研究院 NHLBI', title: 'DASH Eating Plan', year: '持续更新', used: '高血压饮食：多蔬果与低脂奶，钠 1500~2300 mg' },
  { id: 'aha', org: 'American Heart Association', title: 'Sodium recommendations', year: '持续更新', used: '理想钠上限 1500 mg/日，尤其高血压人群' },
  { id: 'htn2018', org: '中国高血压防治指南修订委员会', title: '中国高血压防治指南（2018 年修订版）', year: '2019', used: '限盐、限酒、控体重、DASH 类膳食' },
  { id: 'dm2020', org: '中华医学会糖尿病学分会', title: '中国 2 型糖尿病防治指南（2020 年版）', year: '2021', used: '医学营养治疗：碳水 45~60%E、蛋白 15~20%E、脂肪 20~35%E、纤维 ≥14 g/1000 千卡、限添加糖、碳水均匀分配' },
  { id: 'gout2019', org: '中华医学会内分泌学分会', title: '中国高尿酸血症与痛风诊疗指南（2019）', year: '2020', used: '限高嘌啉食物、戒酒、限果糖、饮水 >2000 ml、鼓励低脂奶' },
  { id: 'nafld2018', org: '中华医学会肝病学分会', title: '非酒精性脂肪性肝病防治指南（2018 年更新版）', year: '2018', used: '减重 7~10% 是核心干预，限果糖与酒精，控制总能量' },
  { id: 'gerd2020', org: '中华医学会消化病学分会', title: '2020 年中国胃食管反流病专家共识', year: '2020', used: '避免高脂、辛辣、咖啡、酒精，睡前 3 小时不进食，少量多餐' },
  { id: 'pcos2023', org: 'Teede HJ 等（国际 PCOS 指南）', title: 'International Evidence-based Guideline for the Assessment and Management of PCOS', year: '2018 / 2023', used: '低升糖膳食、减重 5~10% 改善排卵' },
  { id: 'wishnofsky1958', org: 'Wishnofsky M', title: 'Caloric equivalents of gained or lost weight', year: 'Am J Clin Nutr, 1958', used: '1 kg 体脂 ≈ 7700 千卡，用于按体重变化反推实际消耗（近似）' },
  { id: 'cfct6', org: '中国疾病预防控制中心营养与健康所', title: '中国食物成分表 标准版（第 6 版）', year: '2018 / 2019', used: '食材营养数据主来源' },
  { id: 'usda', org: 'U.S. Department of Agriculture', title: 'FoodData Central', year: '持续更新', used: '西式食材营养数据补充来源' },
]

export const SOURCE_MAP: Map<string, SourceRef> = new Map(SOURCES.map((s) => [s.id, s]))

export const CONDITION_SOURCES: Record<Condition, string[]> = {
  pregnancy: ['dg2022', 'dris2023'],
  lactation: ['dg2022', 'dris2023'],
  preconception: ['dg2022', 'pcos2023'],
  hypertension: ['htn2018', 'dash', 'aha'],
  diabetes: ['dm2020'],
  fatty_liver: ['nafld2018'],
  gout: ['gout2019'],
  gerd: ['gerd2020'],
  elderly: ['dg2022', 'dris2023'],
  training: ['issn2017', 'morton2018'],
}

export interface BasisRow {
  metric: string
  value: string
  rule: string
  sources: string[]
}

const ACT: Record<Profile['activity'], string> = { sedentary: '久坐', light: '轻度', moderate: '中度', active: '活跃', very_active: '非常活跃' }

/** 按当前档案与目标，逐项说明数字怎么来、出自哪里 */
export function targetBasis(p: Profile, t: Targets, opts: { adaptive?: boolean; trainingDay?: boolean } = {}): BasisRow[] {
  const c = p.conditions || []
  const rows: BasisRow[] = []
  const maternal = c.includes('pregnancy') || c.includes('lactation')
  const goal = maternal && p.goal === 'lose' ? 'maintain' : p.goal

  rows.push(t.method === 'katch'
    ? { metric: '基础代谢', value: `${t.bmr} 千卡`, rule: `Katch-McArdle：370 + 21.6 × 瘦体重；瘦体重 = 体重 × (1 − 体脂率 ${p.bodyFatPct}%)`, sources: ['katch'] }
    : { metric: '基础代谢', value: `${t.bmr} 千卡`, rule: 'Mifflin-St Jeor：10 × 体重 + 6.25 × 身高 − 5 × 年龄，男 +5 / 女 −161', sources: ['mifflin1990'] })
  rows.push(opts.adaptive
    ? { metric: '每日消耗', value: `${t.tdee} 千卡`, rule: '按近 4 周实际摄入与体重变化反推：消耗 ≈ 日均摄入 − 体重日变化 × 7700', sources: ['wishnofsky1958'] }
    : { metric: '每日消耗', value: `${t.tdee} 千卡`, rule: `基础代谢 × 活动系数 ${ACTIVITY_FACTOR[p.activity]}（${ACT[p.activity]}）`, sources: ['fao2001'] })

  const goalRule = goal === 'lose'
    ? `消耗 × ${GOAL_FACTOR.lose}（约 18% 缺口，按 1 kg 体脂 ≈ 7700 千卡折算约每周减 0.4~0.5 kg，属温和节奏），不低于基础代谢，男不低于 1500、女不低于 1200 千卡${c.includes('elderly') || c.includes('gout') ? '；老年人/痛风缺口放缓到 10%' : ''}`
    : goal === 'gain' ? `消耗 × ${GOAL_FACTOR.gain}（10% 小幅盈余，增肌常用做法）` : '等于每日消耗'
  const adds: string[] = []
  if (c.includes('pregnancy')) adds.push(`孕${(p.pregnancyTrimester || 2) === 1 ? '早期不加' : (p.pregnancyTrimester || 2) === 2 ? '中期 +250 千卡' : '晚期 +400 千卡'}`)
  if (c.includes('lactation')) adds.push('哺乳期 +400 千卡')
  if (opts.trainingDay) adds.push('训练日 +300 千卡')
  rows.push({ metric: '目标热量', value: `${t.kcal} 千卡`, rule: goalRule + (adds.length ? '；' + adds.join('，') : ''), sources: maternal ? ['dris2023'] : goal === 'lose' ? ['wishnofsky1958', 'fao2001'] : goal === 'gain' ? ['issn2017', 'fao2001'] : ['fao2001'] })

  const protRule = p.bodyFatPct
    ? `每公斤瘦体重 ${goal === 'lose' ? 2.2 : goal === 'gain' ? 2.0 : 1.8} g`
    : `每公斤体重 ${goal === 'lose' ? 1.6 : goal === 'gain' ? 1.6 : 1.2} g`
  const protExtra: string[] = []
  if (p.dietStyle === 'high_protein') protExtra.push('高蛋白风格 ×1.15')
  if (p.dietStyle === 'vegan') protExtra.push('纯素 ×1.1')
  if (c.includes('pregnancy')) protExtra.push('孕中期 +15 / 孕晚期 +30 g')
  if (c.includes('lactation')) protExtra.push('哺乳期 +25 g')
  if (c.includes('elderly')) protExtra.push('老年人不低于 1.2 g/kg')
  if (c.includes('training')) protExtra.push('增肌不低于 2.0 g/kg')
  if (c.includes('diabetes')) protExtra.push('糖尿病不低于 18% 热量')
  if (c.includes('fatty_liver') || c.includes('preconception')) protExtra.push('不低于 20% 热量')
  rows.push({ metric: '蛋白质', value: `${t.protein} g`, rule: `${protRule}${protExtra.length ? '；' + protExtra.join('，') : ''}。高于膳食参考摄入量的 0.98 g/kg，取的是运动营养界减脂保肌与增肌的常用区间`, sources: ['issn2017', 'morton2018', 'dris2023'] })

  if (c.includes('diabetes')) rows.push({ metric: '碳水 / 脂肪', value: `${t.carbs} g / ${t.fat} g`, rule: '碳水固定 50% 热量并按餐均分，脂肪补齐（约 30%）', sources: ['dm2020'] })
  else if (c.includes('fatty_liver')) rows.push({ metric: '碳水 / 脂肪', value: `${t.carbs} g / ${t.fat} g`, rule: '碳水 48%、蛋白 ≥20%，脂肪补齐', sources: ['nafld2018', 'dris2023'] })
  else if (c.includes('preconception')) rows.push({ metric: '碳水 / 脂肪', value: `${t.carbs} g / ${t.fat} g`, rule: '低升糖：碳水 45%、蛋白 ≥20%，脂肪补齐', sources: ['pcos2023', 'dris2023'] })
  else if (p.dietStyle === 'low_carb') rows.push({ metric: '碳水 / 脂肪', value: `${t.carbs} g / ${t.fat} g`, rule: '低碳风格：碳水固定 25% 热量，脂肪补齐。这是饮食风格选择，低于膳食参考摄入量 50~65% 的一般建议', sources: ['dris2023'] })
  else rows.push({ metric: '脂肪 / 碳水', value: `${t.fat} g / ${t.carbs} g`, rule: `脂肪 ${c.includes('gerd') ? '25%（反流模式）' : '28%'} 热量（参考范围 20~30%），碳水用剩余热量补齐`, sources: ['dris2023'] })

  rows.push({ metric: '膳食纤维', value: `${t.fiber} g`, rule: `每 1000 千卡 14 g，且不低于 ${t.fiber >= 30 ? '30' : '25'} g`, sources: ['dris2023', 'dga2020'].concat(c.includes('diabetes') ? ['dm2020'] : []) })
  rows.push(t.sodiumMax <= 1500
    ? { metric: '钠上限', value: `${t.sodiumMax} mg`, rule: '高血压模式：1500 mg（约 3.8 g 盐）', sources: ['aha', 'dash', 'htn2018'] }
    : { metric: '钠上限', value: `${t.sodiumMax} mg`, rule: '盐 <5 g，即钠 2000 mg', sources: ['dg2022'] })
  rows.push({ metric: '蔬菜', value: `${t.vegServings} 份（每份 100 g）`, rule: `指南 300~500 g/日${t.vegServings >= 5 ? '，特殊模式取上限 500 g' : '，取 400 g'}`, sources: ['dg2022'] })
  rows.push({ metric: '水果', value: `${t.fruitG} g`, rule: t.fruitG >= 300 ? '指南 200~350 g/日，孕产期或高血压取 300 g' : t.fruitG <= 200 && (c.includes('diabetes') || c.includes('gout') || c.includes('fatty_liver') || c.includes('preconception')) ? '限果糖：控制在 200 g 并分两次吃' : '指南 200~350 g/日，取 200 g', sources: ['dg2022'].concat(c.includes('diabetes') ? ['dm2020'] : c.includes('gout') ? ['gout2019'] : c.includes('fatty_liver') ? ['nafld2018'] : []) })
  rows.push(t.dairyG === 0
    ? { metric: '奶类', value: '不设', rule: '纯素：钙靠豆制品与深绿叶菜，维生素 B12 需额外补充', sources: ['dg2022'] }
    : { metric: '奶类', value: `${t.dairyG} g`, rule: t.dairyG >= 500 ? '孕中晚期与哺乳期 500 g' : t.dairyG >= 400 ? '老年人或痛风 400 g（低脂奶有助尿酸排泄）' : '指南 300 g 以上', sources: ['dg2022'].concat(c.includes('gout') ? ['gout2019'] : []) })
  rows.push({ metric: '饮水', value: `${t.waterMl} ml`, rule: `成年男 1700 / 女 1500 ml，不含食物水分${c.includes('lactation') ? '；哺乳期 2100' : c.includes('pregnancy') ? '；孕中晚期 1700' : ''}${c.includes('gout') ? '；痛风不低于 2000' : ''}${opts.trainingDay ? '；训练日 +500' : ''}`, sources: ['dg2022', 'dris2023'].concat(c.includes('gout') ? ['gout2019'] : []) })
  rows.push({ metric: '三餐占比', value: p.dietStyle === 'if168' ? '午 55% / 晚 45%' : p.mealsPerDay === 4 ? '早 25 / 午 35 / 晚 30 / 加餐 10' : '早 30 / 午 40 / 晚 30', rule: p.dietStyle === 'if168' ? '16:8 轻断食为饮食风格选择，不吃早餐' : '指南建议早餐 25~30%、午餐 30~40%、晚餐 30~35%', sources: ['dg2022'] })
  return rows
}

export function shortCite(ids: string[]): string {
  return ids.map((id) => SOURCE_MAP.get(id)?.title || id).join('；')
}
