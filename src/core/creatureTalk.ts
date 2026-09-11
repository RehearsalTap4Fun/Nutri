// 健康小管家的气泡台词：根据今天的实际数据，用聊天口气提一句最要紧的事。
// 复用现成的信号（budgetFocus 的缺口/超额、water.ts 的喝水节奏、餐次是否已记），
// 只是换一副对话的口吻讲出来，不重新发明判断逻辑。
// 说什么由数据决定（优先级链），怎么说由性格决定（TONE 表）——两者互不干扰。
import type { LogEntry, Nutrients, Targets } from './types'
import type { BudgetFocus } from './budget'
import type { Finding } from './analysis'
import type { Personality } from './creature'
import { CUP_ML, cupCount, cupsDueAt } from './water'
import { hashString } from './rng'

const SLOT_DUE_TIME: Record<'breakfast' | 'lunch' | 'dinner', string> = { breakfast: '09:30', lunch: '13:30', dinner: '20:00' }
/** 下午这个点还没吃水果才提，太早提没意义 */
const FRUIT_DUE_HOUR = 15

interface Tone {
  hatched: string
  water: (should: number, behind: number) => string
  slot: Record<'breakfast' | 'lunch' | 'dinner', string>
  fruit: string
  sodium: (v: number, max: number) => string
  habit: (f: Finding) => string
  over: (label: string) => string
  gap: (label: string) => string
  idle: string[]
}

// 四种性格，孵化时随机定型、终生不变：内容（该说哪句）都一样，只是嘴上的语气不同。
const TONE: Record<Personality, Tone> = {
  gentle: {
    hatched: '嗨，我孵出来啦！以后每次你吃饭喝水，我都会跟着变化，多来看看我呀。',
    water: (should, behind) => `现在该喝到第 ${should} 杯水了，你还差 ${behind} 杯，喝一口呗。`,
    slot: {
      breakfast: '早餐还没记呀，是忘记吃了还是忘记告诉我？',
      lunch: '都下午了，午饭吃了什么呀，快告诉我。',
      dinner: '晚饭还没安排上吗，我都饿了。',
    },
    fruit: '今天好像还没吃水果，找点应季的加一份呗。',
    sodium: (v, max) => `你今天钠已经到 ${v} mg 了，超过 ${max} 上限啦，接下来清淡点。`,
    habit: (f) => `${f.title}：${f.detail}`,
    over: (label) => `我看了一下，你${label}，接下来吃清淡点吧。`,
    gap: (label) => `${label}，要不要加一点，别亏待自己。`,
    idle: ['今天看起来挺均衡的，继续保持呀。', '状态不错，我在这儿看着呢。', '目前一切正常，你很棒。', '暂时没什么要提醒的，好好吃饭。'],
  },
  energetic: {
    hatched: '哇！我破壳啦！以后你每次吃饭喝水，我都会跟着一起变身，来看我呀！',
    water: (should, behind) => `冲鸭！现在该喝到第 ${should} 杯水了，你还差 ${behind} 杯，快喝一口！`,
    slot: {
      breakfast: '早餐还没记呢！是忘记吃了还是忘记告诉我，快补上！',
      lunch: '都下午啦，午饭吃了什么，赶紧告诉我！',
      dinner: '晚饭还没安排？我都饿扁了，走起！',
    },
    fruit: '今天水果还没安排上吧，来一份应季的，冲！',
    sodium: (v, max) => `钠已经冲到 ${v} mg 啦，超过 ${max} 的线了，接下来清淡一点，加油稳住！`,
    habit: (f) => `${f.title}！${f.detail} 一起改善一下吧！`,
    over: (label) => `我看了一下，你${label}，接下来吃清淡点，冲鸭稳住！`,
    gap: (label) => `${label}，加一点呀，别亏待自己，冲！`,
    idle: ['今天状态很均衡，继续保持，冲鸭！', '状态不错，我在这儿给你加油呢！', '一切正常，你真的很棒！', '暂时没什么要提醒的，好好吃饭，加油！'],
  },
  bossy: {
    hatched: '哼，总算孵出来了。以后你吃饭喝水我都会盯着的，别想偷懒。',
    water: (should, behind) => `都第 ${should} 杯了，你才喝这么点？还差 ${behind} 杯呢，别磨蹭。`,
    slot: {
      breakfast: '早餐都没记，是不是又没吃？说清楚。',
      lunch: '都下午了还没记午饭，到底吃没吃？',
      dinner: '晚饭还没影呢，别告诉我又忘了。',
    },
    fruit: '一整天了水果都没吃，是不是又懒得削皮？加一份。',
    sodium: (v, max) => `钠都吃到 ${v} mg 了，超过 ${max} 的线，接下来给我清淡点。`,
    habit: (f) => `${f.title}。${f.detail} 说了多少次了。`,
    over: (label) => `你${label}，听见没，接下来给我吃清淡点。`,
    gap: (label) => `${label}，还不快加一点，亏待自己算怎么回事。`,
    idle: ['今天还算均衡，算你识相。', '状态还行，我盯着呢，别翘尾巴。', '一切正常，哼，算你合格。', '没什么好念叨的，自己保持住。'],
  },
  cool: {
    hatched: '孵化完成。以后你的饮食喝水，我都会记录变化。',
    water: (should, behind) => `该喝第 ${should} 杯水了，差 ${behind} 杯。`,
    slot: {
      breakfast: '早餐未记录。',
      lunch: '已下午，午餐未记录。',
      dinner: '晚餐未记录。',
    },
    fruit: '今日未摄入水果，建议补充一份。',
    sodium: (v, max) => `钠 ${v} mg，超出上限 ${max}。建议清淡饮食。`,
    habit: (f) => `${f.title}：${f.detail}`,
    over: (label) => `你${label}。建议接下来清淡饮食。`,
    gap: (label) => `${label}。建议适量补充。`,
    idle: ['状态均衡。', '一切正常。', '数据良好。', '暂无提醒。'],
  },
}

export interface CreatureTalkInput {
  /** 只有看「今天」才会念叨进度和到点没到点；看别的日期只给一句轻松话 */
  isToday: boolean
  /** 当前时刻 HH:mm，只在 isToday 时用得上 */
  now: string
  date: string
  entries: LogEntry[]
  n: Nutrients
  targets: Targets
  /** 今天喝水总量 ml（不含餐食里的饮品） */
  waterMl: number
  /** 只有高血压模式才提钠 */
  showSodium: boolean
  /** Today 页已经算好的缺口/超额信号，直接拿来讲 */
  focus: BudgetFocus[]
  /** 蛋刚孵化出来（异变次数为 0），打个招呼，优先级最高，只说这一句 */
  justHatched?: boolean
  /** 今天吃了多少克水果，来自 dayStat 的 fruitG */
  fruitG?: number
  /** 近 7 天分析里归为「饮食习惯」类的提醒，取第一条来讲 */
  habitFinding?: Finding
  /** 小管家的性格，决定同一句话怎么说；缺省按温柔处理 */
  personality?: Personality
}

function pickIdle(date: string, tone: Tone): string {
  return tone.idle[hashString(date) % tone.idle.length]
}

export function creatureLine(input: CreatureTalkInput): string {
  const { isToday, now, date, entries, n, targets, waterMl, showSodium, focus, justHatched, fruitG, habitFinding, personality } = input
  const tone = TONE[personality ?? 'gentle']
  if (!isToday) return pickIdle(date, tone)

  // 0. 蛋刚孵化出来，先打个招呼（直到下次记录触发异变，mutations 才会变成 1）
  if (justHatched) return tone.hatched

  // 1. 喝水明显落后（差 2 杯以上才提，免得天天念叨）
  const nowHour = Number(now.slice(0, 2)) + Number(now.slice(3, 5)) / 60
  const cupsN = cupCount(targets.waterMl)
  const shouldHave = cupsDueAt(nowHour, cupsN)
  const lit = Math.floor(waterMl / CUP_ML)
  const behindCups = shouldHave - lit
  if (behindCups >= 2) return tone.water(shouldHave, behindCups)

  // 2. 到点了但这一餐还没记（按早中晚顺序，第一个中招的说）
  for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
    if (now >= SLOT_DUE_TIME[slot] && !entries.some((e) => e.slot === slot)) return tone.slot[slot]
  }

  // 3. 下午了还没吃水果
  if (nowHour >= FRUIT_DUE_HOUR && (fruitG ?? 0) <= 0) return tone.fruit

  // 4. 钠超标（只有高血压模式看得到这个指标）
  if (showSodium && n.sodium > targets.sodiumMax) return tone.sodium(Math.round(n.sodium), targets.sodiumMax)

  // 5. 近期饮食习惯类提醒（分析页里归不进宏量指标的那些）
  if (habitFinding) return tone.habit(habitFinding)

  // 6. 今天已经超额的（budgetFocus 按重要性排过序，取最靠前的）
  const over = focus.find((f) => f.kind === 'over')
  if (over) return tone.over(over.label)

  // 7. 明显还差得多的
  const gap = focus.find((f) => f.kind === 'gap')
  if (gap) return tone.gap(gap.label)

  return pickIdle(date, tone)
}
