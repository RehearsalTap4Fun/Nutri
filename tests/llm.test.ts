import { describe, expect, it } from 'vitest'
import { DISHES, DISH_MAP } from '../src/data/dishes/index'
import { buildCatalog, buildSystemPrompt, estimateUsd, normalizeParsed, parseLooseJson, ParsedMealSchema } from '../src/llm/mealParser'
import { dishNutrients } from '../src/core/nutrition'

const usage = { input: 100, output: 50, cacheRead: 4000, cacheWrite: 0, usd: 0 }

describe('llm meal parser (offline parts)', () => {
  it('目录包含全部菜品 id 与名称，每行一个', () => {
    const cat = buildCatalog(DISHES)
    const lines = cat.split('\n')
    expect(lines.length).toBe(DISHES.length)
    for (const d of DISHES) expect(cat).toContain(`${d.id}|${d.name}|`)
    expect(buildSystemPrompt(cat)).toContain('dish_id')
  })
  it('schema 接受模型输出形状', () => {
    const ok = ParsedMealSchema.safeParse({ slot: 'lunch', time: null, items: [{ dish_id: 'st_rice', name: '米饭', portion: 0.5, note: null, estimate: null }] })
    expect(ok.success).toBe(true)
    const bad = ParsedMealSchema.safeParse({ slot: 'brunch', time: null, items: [] })
    expect(bad.success).toBe(false)
  })
  it('已知 id 用库值，未知 id 落为估算项，份量夹取', () => {
    const r = normalizeParsed({
      slot: 'dinner', time: '19:05',
      items: [
        { dish_id: 'st_rice', name: '米饭', portion: 0.5, note: null, estimate: null },
        { dish_id: 'not_a_dish', name: '妈妈做的红烧鱼', portion: 12, note: '一大块', estimate: { kcal: 300, protein: 25, fat: 15, carbs: 8, fiber: 0, sodium: 700 } },
        { dish_id: null, name: '不知道', portion: -1, note: null, estimate: null },
      ],
    }, DISH_MAP, usage, 'claude-opus-5')
    expect(r.slot).toBe('dinner')
    expect(r.time).toBe('19:05')
    expect(r.items[0].matched).toBe(true)
    expect(r.items[0].perServing.kcal).toBeCloseTo(dishNutrients(DISH_MAP.get('st_rice')!).kcal, 5)
    expect(r.items[1].matched).toBe(false)
    expect(r.items[1].portion).toBe(6)
    expect(r.items[1].perServing.kcal).toBe(300)
    expect(r.items[2].portion).toBe(1)
    expect(r.items[2].note).toContain('无法估算')
  })
  it('非法时间被忽略', () => {
    const r = normalizeParsed({ slot: null, time: '下午', items: [] }, DISH_MAP, usage, 'm')
    expect(r.time).toBeUndefined()
    expect(r.slot).toBeUndefined()
  })
  it('费用按 Opus 5 价格估算', () => {
    // 4000 缓存读 × $0.5/M + 100 输入 × $5/M + 50 输出 × $25/M
    expect(estimateUsd('anthropic', { input: 100, output: 50, cacheRead: 4000, cacheWrite: 0 })).toBeCloseTo(0.002 + 0.0005 + 0.00125, 6)
    expect(estimateUsd('deepseek', { input: 4000, output: 100, cacheRead: 0, cacheWrite: 0 })).toBeCloseTo(4000 * 0.44 / 1e6 + 100 * 1.32 / 1e6, 8)
  })
  it('DeepSeek JSON 模式的宽松解析：围栏、数字字符串、非法 slot', () => {
    const txt = '```json\n{"slot":"brunch","time":"12:10","items":[{"dish_id":"st_rice","name":"米饭","portion":"0.5","note":null,"estimate":null},{"dish_id":"","name":"红烧鱼","portion":1,"estimate":{"kcal":"250","protein":22,"fat":14,"carbs":6,"fiber":0,"sodium":600}}]}\n```'
    const p = parseLooseJson(txt)
    expect(p.slot).toBeNull()
    expect(p.time).toBe('12:10')
    expect(p.items[0].portion).toBe(0.5)
    expect(p.items[1].dish_id).toBeNull()
    expect(p.items[1].estimate?.kcal).toBe(250)
    expect(() => parseLooseJson('抱歉，我不理解')).toThrow()
  })
})
