// 真机验证自然语言录餐：
//   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/tryParse.ts "中午吃了一碗兰州拉面加个卤蛋"
//   LLM_PROVIDER=deepseek DEEPSEEK_API_KEY=sk-... npx tsx scripts/tryParse.ts "早上豆浆油条一杯拿铁"
import { DISHES, DISH_MAP } from '../src/data/dishes/index'
import { parseMealText } from '../src/llm/mealParser'
import type { LlmConfig } from '../src/llm/mealParser'

const provider = process.env.LLM_PROVIDER === 'deepseek' ? 'deepseek' : 'anthropic'
const cfg: LlmConfig = { provider, apiKey: (provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.ANTHROPIC_API_KEY) || '' }
const texts = process.argv.slice(2).length ? process.argv.slice(2) : ['中午吃了一碗兰州拉面加个卤蛋']
for (const text of texts) {
  const t0 = Date.now()
  const r = await parseMealText(cfg, text, DISHES, DISH_MAP, { date: '2026-09-04', now: '12:40' })
  console.log(`\n「${text}」 → slot=${r.slot ?? '-'} time=${r.time ?? '-'}  ${Date.now() - t0} ms  ${r.model}`)
  for (const it of r.items) {
    console.log(`  ${it.matched ? '库内' : '估算'}  ${it.name} × ${it.portion}  ${Math.round(it.perServing.kcal * it.portion)} kcal${it.dishId ? `  [${it.dishId}]` : ''}${it.note ? `  (${it.note})` : ''}`)
  }
  console.log(`  tokens: in ${r.usage.input} + cacheRead ${r.usage.cacheRead} + cacheWrite ${r.usage.cacheWrite}, out ${r.usage.output}  ≈ $${r.usage.usd.toFixed(4)}`)
}
