// 健康小管家的气泡台词：根据今天的实际数据，用聊天口气提一句最要紧的事。
// 复用现成的信号（budgetFocus 的缺口/超额、water.ts 的喝水节奏、餐次是否已记），
// 只是换一副对话的口吻讲出来，不重新发明判断逻辑。
import type { LogEntry, Nutrients, Targets } from './types'
import type { BudgetFocus } from './budget'
import { CUP_ML, cupCount, cupsDueAt } from './water'
import { hashString } from './rng'

const SLOT_DUE_TIME: Record<'breakfast' | 'lunch' | 'dinner', string> = { breakfast: '09:30', lunch: '13:30', dinner: '20:00' }
const SLOT_LINE: Record<'breakfast' | 'lunch' | 'dinner', string> = {
  breakfast: '早餐还没记呀，是忘记吃了还是忘记告诉我？',
  lunch: '都下午了，午饭吃了什么呀，快告诉我。',
  dinner: '晚饭还没安排上吗，我都饿了。',
}
const IDLE_LINES = ['今天看起来挺均衡的，继续保持呀。', '状态不错，我在这儿看着呢。', '目前一切正常，你很棒。', '暂时没什么要提醒的，好好吃饭。']

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
}

function pickIdle(date: string): string {
  return IDLE_LINES[hashString(date) % IDLE_LINES.length]
}

export function creatureLine(input: CreatureTalkInput): string {
  const { isToday, now, date, entries, n, targets, waterMl, showSodium, focus } = input
  if (!isToday) return pickIdle(date)

  // 1. 喝水明显落后（差 2 杯以上才提，免得天天念叨）
  const nowHour = Number(now.slice(0, 2)) + Number(now.slice(3, 5)) / 60
  const cupsN = cupCount(targets.waterMl)
  const shouldHave = cupsDueAt(nowHour, cupsN)
  const lit = Math.floor(waterMl / CUP_ML)
  const behindCups = shouldHave - lit
  if (behindCups >= 2) return `现在该喝到第 ${shouldHave} 杯水了，你还差 ${behindCups} 杯，喝一口呗。`

  // 2. 到点了但这一餐还没记（按早中晚顺序，第一个中招的说）
  for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
    if (now >= SLOT_DUE_TIME[slot] && !entries.some((e) => e.slot === slot)) return SLOT_LINE[slot]
  }

  // 3. 钠超标（只有高血压模式看得到这个指标）
  if (showSodium && n.sodium > targets.sodiumMax) return `你今天钠已经到 ${Math.round(n.sodium)} mg 了，超过 ${targets.sodiumMax} 上限啦，接下来清淡点。`

  // 4. 今天已经超额的（budgetFocus 按重要性排过序，取最靠前的）
  const over = focus.find((f) => f.kind === 'over')
  if (over) return `我看了一下，你${over.label}，接下来吃清淡点吧。`

  // 5. 明显还差得多的
  const gap = focus.find((f) => f.kind === 'gap')
  if (gap) return `${gap.label}，要不要加一点，别亏待自己。`

  return pickIdle(date)
}
