// 自然语言录餐：一句话 → 结构化的菜品 + 份量。
// 模型只负责「对应到目录里的哪道菜、几份」，营养数字仍由本地库推导；目录里没有的才让模型给估算并标注。
// 支持两家服务商：Anthropic（Claude Opus 5，结构化输出）与 DeepSeek（OpenAI 兼容接口，JSON 模式）。都在浏览器直连，key 只存本机。
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { Dish, MealSlot, Nutrients } from '../core/types'
import { dishNutrients } from '../core/nutrition'

export type Provider = 'anthropic' | 'deepseek'

export interface LlmConfig {
  provider: Provider
  apiKey: string
}

export const MODELS: Record<Provider, string> = {
  anthropic: 'claude-opus-5',
  deepseek: 'deepseek-v4-flash',
}

export const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: 'Claude Opus 5',
  deepseek: 'DeepSeek V4 Flash',
}

// 每百万 token 价格（美元），用于界面上显示单次花费。DeepSeek 取高峰价，实际可能减半
const PRICE: Record<Provider, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  anthropic: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  deepseek: { input: 0.44, output: 1.32, cacheRead: 0.014, cacheWrite: 0.44 },
}

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

export const ParsedMealSchema = z.object({
  slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).nullable(),
  time: z.string().nullable(),
  items: z.array(
    z.object({
      dish_id: z.string().nullable(),
      name: z.string(),
      portion: z.number(),
      note: z.string().nullable(),
      estimate: z
        .object({ kcal: z.number(), protein: z.number(), fat: z.number(), carbs: z.number(), fiber: z.number(), sodium: z.number(), veg_g: z.number(), fruit_g: z.number() })
        .nullable(),
    }),
  ),
})
export type ParsedMeal = z.infer<typeof ParsedMealSchema>

export interface ParsedItem {
  dishId?: string
  name: string
  portion: number
  /** 一份的营养（匹配到目录取库值，否则取模型估算） */
  perServing: Nutrients
  /** 未匹配条目：模型估的一份蔬菜 / 水果克数 */
  vegG?: number
  fruitG?: number
  matched: boolean
  note?: string
}

export interface ParseUsage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  usd: number
}

export interface ParseResult {
  slot?: MealSlot
  time?: string
  items: ParsedItem[]
  usage: ParseUsage
  model: string
}

/**
 * 「说一句话录餐」的后台任务：解析可能耗时几秒到十几秒，让用户能关掉弹窗去别的页面，
 * 回来时（或从任意页面的提示条）还能看到结果并记为已吃。任一时刻最多一个任务。
 * date 是发起解析时正在看的那一天，跟后来切换到别的日期无关——保存时按这天记。
 */
export type SpeakJob =
  | { status: 'running'; text: string; slot: MealSlot; time: string; date: string }
  | { status: 'done'; text: string; slot: MealSlot; time: string; date: string; result: ParseResult }
  | { status: 'error'; text: string; slot: MealSlot; time: string; date: string; error: string }

export function buildCatalog(dishes: Dish[]): string {
  return dishes
    .map((d) => `${d.id}|${d.name}|${d.serving}${d.aliases?.length ? '|' + d.aliases.join('/') : ''}`)
    .join('\n')
}

const JSON_SHAPE = `输出必须是一个 JSON 对象（json），不要输出任何解释文字。形如：
{"slot":"lunch","time":null,"items":[{"dish_id":"st_rice","name":"白米饭","portion":0.5,"note":null,"estimate":null},{"dish_id":null,"name":"四季豆炒肉","portion":1,"note":"按四季豆150g加瘦肉60g估","estimate":{"kcal":260,"protein":16,"fat":15,"carbs":12,"fiber":4,"sodium":600,"veg_g":150,"fruit_g":0}}]}
字段：slot 取 breakfast/lunch/dinner/snack 或 null；time 为 "HH:mm" 或 null；items 每项含 dish_id(字符串或 null)、name、portion(数字)、note(字符串或 null)、estimate(对象或 null，含 veg_g 蔬菜克数与 fruit_g 水果克数)。`

export function buildSystemPrompt(catalog: string): string {
  return `你是一个饮食记录助手。用户会用一句中文口语描述自己吃了什么，你要把它解析成结构化记录。

下面是本地菜品目录，每行格式为「id|名称|一份的份量|别名」：
${catalog}

规则：
1. 只记录用户明确说吃了或喝了的东西，不要补全没提到的食物。
2. 能对应到目录里同一种食物时填 dish_id。portion 是相对目录中「一份」的倍数：目录一份是「1碗」时，「一碗」=1，「半碗」=0.5，「一小碗」=0.7，「大碗」=1.5；目录一份是「1个」时，「两个」=2。用户没说数量默认 1。
3. 品牌或店名用别名匹配，如「麦当劳」「肯德基」「沙县」。
4. 组合描述拆成多条：目录里没有「番茄炒蛋盖饭」，就拆成 番茄炒蛋 1 份 + 白米饭 1.25 份。
5. 目录里找不到合适条目时 dish_id 填 null，name 写食物名，并在 estimate 里给出「一份」的常见营养估算：kcal 千卡、protein 蛋白 g、fat 脂肪 g、carbs 碳水 g、fiber 纤维 g、sodium 钠 mg，以及 veg_g（蔬菜菌菇克数，不含葱姜蒜和腌菜）和 fruit_g（水果克数），没有就填 0；在 note 里写一句份量假设。匹配到目录时 estimate 填 null。
6. slot 根据「早上/中午/下午/晚上/夜宵」等推断，没提到就 null。time 只在用户明确说了时间时填「HH:mm」，否则 null。
7. portion 精确到 0.25。name 用中文。

${JSON_SHAPE}`
}

function round4(x: number): number {
  return Math.round(x * 4) / 4
}

/** 校验并整理模型输出：未知 id 转为估算项，份量夹到 0.25~6 */
export function normalizeParsed(parsed: ParsedMeal, dishMap: Map<string, Dish>, usage: ParseUsage, model: string): ParseResult {
  const items: ParsedItem[] = []
  for (const it of parsed.items.slice(0, 10)) {
    const portion = Math.max(0.25, Math.min(6, round4(Number.isFinite(it.portion) && it.portion > 0 ? it.portion : 1)))
    const dish = it.dish_id ? dishMap.get(it.dish_id) : undefined
    if (dish) {
      items.push({ dishId: dish.id, name: dish.name, portion, perServing: dishNutrients(dish), matched: true, note: it.note || undefined })
    } else {
      const e = it.estimate
      const perServing: Nutrients = e
        ? { kcal: Math.max(0, e.kcal), protein: Math.max(0, e.protein), fat: Math.max(0, e.fat), carbs: Math.max(0, e.carbs), fiber: Math.max(0, e.fiber), sodium: Math.max(0, e.sodium) }
        : { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 }
      items.push({ name: it.name.trim() || '未命名食物', portion, perServing, matched: false, vegG: e ? Math.max(0, e.veg_g || 0) : undefined, fruitG: e ? Math.max(0, e.fruit_g || 0) : undefined, note: it.note || (e ? '模型估算' : '无法估算，请手动填写') })
    }
  }
  const time = parsed.time && /^\d{2}:\d{2}$/.test(parsed.time) ? parsed.time : undefined
  return { slot: parsed.slot || undefined, time, items, usage, model }
}

export function estimateUsd(provider: Provider, u: { input: number; output: number; cacheRead: number; cacheWrite: number }): number {
  const p = PRICE[provider]
  return (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) / 1e6
}

export class MealParseError extends Error {
  constructor(message: string, public readonly kind: 'auth' | 'rate' | 'network' | 'refusal' | 'bad_request' | 'empty' | 'other') {
    super(message)
  }
}

/**
 * 宽松解析 JSON 模式的文本：去掉代码围栏、把数字字符串转成数字，再过 schema。
 */
export function parseLooseJson(text: string): ParsedMeal {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start < 0 || end < 0) throw new MealParseError('模型没有返回 JSON', 'empty')
  let raw: unknown
  try {
    raw = JSON.parse(t.slice(start, end + 1))
  } catch {
    throw new MealParseError('模型返回的 JSON 无法解析', 'empty')
  }
  const obj = (typeof raw === 'object' && raw) ? (raw as Record<string, unknown>) : {}
  const num = (v: unknown, d = 0) => { const n = typeof v === 'string' ? parseFloat(v) : Number(v); return Number.isFinite(n) ? n : d }
  const itemsRaw = Array.isArray(obj.items) ? obj.items : []
  const items = itemsRaw.map((x) => {
    const it = (typeof x === 'object' && x) ? (x as Record<string, unknown>) : {}
    const est = (typeof it.estimate === 'object' && it.estimate) ? (it.estimate as Record<string, unknown>) : null
    return {
      dish_id: typeof it.dish_id === 'string' && it.dish_id ? it.dish_id : null,
      name: typeof it.name === 'string' ? it.name : '',
      portion: num(it.portion, 1),
      note: typeof it.note === 'string' ? it.note : null,
      estimate: est ? { kcal: num(est.kcal), protein: num(est.protein), fat: num(est.fat), carbs: num(est.carbs), fiber: num(est.fiber), sodium: num(est.sodium), veg_g: num(est.veg_g), fruit_g: num(est.fruit_g) } : null,
    }
  })
  const slotRaw = typeof obj.slot === 'string' ? obj.slot : null
  const candidate = {
    slot: slotRaw && ['breakfast', 'lunch', 'dinner', 'snack'].includes(slotRaw) ? slotRaw : null,
    time: typeof obj.time === 'string' ? obj.time : null,
    items,
  }
  const r = ParsedMealSchema.safeParse(candidate)
  if (!r.success) throw new MealParseError('模型返回的结构不符合预期', 'empty')
  return r.data
}

export async function parseMealText(
  cfg: LlmConfig,
  text: string,
  dishes: Dish[],
  dishMap: Map<string, Dish>,
  ctx: { date: string; now: string },
): Promise<ParseResult> {
  const system = buildSystemPrompt(buildCatalog(dishes))
  const user = `日期 ${ctx.date}，当前时间 ${ctx.now}。用户说：${text.trim()}`
  return cfg.provider === 'deepseek' ? viaDeepSeek(cfg.apiKey, system, user, dishMap) : viaAnthropic(cfg.apiKey, system, user, dishMap)
}

/**
 * Anthropic：浏览器直连（SDK 的 dangerouslyAllowBrowser），结构化输出按 schema 强约束。
 * 默认开启服务端 fallbacks：模型因安全策略拒答时由 Anthropic 自动改用备用模型完成同一请求。
 * Node 环境（脚本/测试）不传 key 时由 SDK 从环境变量解析。
 */
async function viaAnthropic(apiKey: string | undefined, system: string, user: string, dishMap: Map<string, Dish>): Promise<ParseResult> {
  const client = new Anthropic({ apiKey: apiKey || undefined, dangerouslyAllowBrowser: true, maxRetries: 1 })
  let response
  try {
    response = await client.beta.messages.parse({
      model: MODELS.anthropic,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
      output_config: { effort: 'low', format: betaZodOutputFormat(ParsedMealSchema) },
    })
  } catch (e) {
    throw toAnthropicError(e)
  }
  if (response.stop_reason === 'refusal') {
    throw new MealParseError('模型拒绝了这次请求' + (response.stop_details?.explanation ? `：${response.stop_details.explanation}` : ''), 'refusal')
  }
  const parsed = response.parsed_output
  if (!parsed) throw new MealParseError('模型返回的内容无法解析，请换个说法再试', 'empty')
  const u = response.usage
  const raw = { input: u.input_tokens, output: u.output_tokens, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 }
  return normalizeParsed(parsed, dishMap, { ...raw, usd: estimateUsd('anthropic', raw) }, response.model)
}

/**
 * DeepSeek：OpenAI 兼容的 chat/completions，JSON 模式（response_format json_object）。
 * 模型内部可能先想一段（算进 max_tokens），额度不够时会在想完之前被截断，content 为空但 finish_reason 是 length；
 * 这种情况加大额度重试一次，而不是直接报错让用户手动重试同样大概率再截断一次。
 */
async function viaDeepSeek(apiKey: string, system: string, user: string, dishMap: Map<string, Dish>): Promise<ParseResult> {
  if (!apiKey) throw new MealParseError('没有 DeepSeek API key', 'auth')
  const call = async (maxTokens: number): Promise<Response> => {
    try {
      return await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MODELS.deepseek,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: maxTokens,
          stream: false,
        }),
      })
    } catch (e) {
      throw new MealParseError('连不上 DeepSeek 接口。可能是网络问题，也可能是浏览器跨域被拦（此时需要一个转发代理）：' + (e instanceof Error ? e.message : String(e)), 'network')
    }
  }
  const checkOk = async (res: Response) => {
    if (res.ok) return
    let detail = ''
    try { const j = await res.json(); detail = j?.error?.message || JSON.stringify(j).slice(0, 200) } catch { detail = await res.text().catch(() => '') }
    if (res.status === 401 || res.status === 403) throw new MealParseError('DeepSeek API key 无效或无权限，请到「我的」里重新填写', 'auth')
    if (res.status === 402) throw new MealParseError('DeepSeek 账户余额不足', 'rate')
    if (res.status === 429) throw new MealParseError('DeepSeek 请求太频繁，稍后再试', 'rate')
    if (res.status === 400 || res.status === 422) throw new MealParseError('DeepSeek 拒绝了请求参数：' + detail, 'bad_request')
    throw new MealParseError(`DeepSeek 接口错误 ${res.status}：${detail}`, 'other')
  }

  let res = await call(4000)
  await checkOk(res)
  let data = await res.json()
  let content: string | undefined = data?.choices?.[0]?.message?.content
  const truncated = !content?.trim() && data?.choices?.[0]?.finish_reason === 'length'
  if (truncated) {
    res = await call(8000)
    await checkOk(res)
    data = await res.json()
    content = data?.choices?.[0]?.message?.content
  }
  if (!content || !content.trim()) throw new MealParseError('DeepSeek 返回了空内容，请再试一次', 'empty')
  const parsed = parseLooseJson(content)
  const u = data?.usage || {}
  const hit = Number(u.prompt_cache_hit_tokens) || 0
  const miss = Number(u.prompt_cache_miss_tokens) || Math.max(0, (Number(u.prompt_tokens) || 0) - hit)
  const raw = { input: miss, output: Number(u.completion_tokens) || 0, cacheRead: hit, cacheWrite: 0 }
  return normalizeParsed(parsed, dishMap, { ...raw, usd: estimateUsd('deepseek', raw) }, String(data?.model || MODELS.deepseek))
}

function toAnthropicError(e: unknown): MealParseError {
  if (e instanceof Anthropic.AuthenticationError) return new MealParseError('Anthropic API key 无效或已失效，请到「我的」里重新填写', 'auth')
  if (e instanceof Anthropic.PermissionDeniedError) return new MealParseError('这个 key 没有权限调用该模型', 'auth')
  if (e instanceof Anthropic.RateLimitError) return new MealParseError('请求太频繁或额度用完，稍后再试', 'rate')
  if (e instanceof Anthropic.BadRequestError) return new MealParseError('请求参数被拒绝：' + e.message, 'bad_request')
  if (e instanceof Anthropic.APIConnectionError) return new MealParseError('连不上 Anthropic 接口，检查网络或代理', 'network')
  if (e instanceof Anthropic.APIError) return new MealParseError(`接口错误 ${e.status ?? ''}：${e.message}`, 'other')
  return new MealParseError(e instanceof Error ? e.message : String(e), 'other')
}
