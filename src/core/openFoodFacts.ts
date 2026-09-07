import type { Nutrients } from './types'

/** Open Food Facts 产品的最小子集：每 100 g 营养 + 份量 */
export interface OffProduct {
  code: string
  name: string
  brand?: string
  /** 包装量描述，如 "330 ml" */
  quantity?: string
  /** 一份的克（或毫升）数，从 serving_size 解析 */
  servingG?: number
  per100: Nutrients
  source: 'openfoodfacts'
}

const OFF_FIELDS = 'code,product_name,product_name_zh,product_name_en,brands,quantity,serving_size,nutriments,status'

export function offProductUrl(code: string): string {
  return `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=${OFF_FIELDS}`
}

/** 条码只留数字；EAN-8 / EAN-13 / UPC-A（12 位补 0 成 13 位）*/
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 12) return '0' + digits
  if (digits.length === 8 || digits.length === 13 || digits.length === 14) return digits
  return null
}

/** "30 g" / "250 ml" / "1 portion (330 ml)" / "2 pieces (45g)" → 数字；解析不出返回 undefined */
export function parseServingGrams(s?: string | null): number | undefined {
  if (!s) return undefined
  const paren = s.match(/\(([^)]*)\)/)
  const target = paren ? paren[1] : s
  const m = target.match(/(\d+(?:[.,]\d+)?)\s*(g|ml|mL|克|毫升)/)
  if (!m) return undefined
  const v = Number(m[1].replace(',', '.'))
  return v > 0 && v < 5000 ? Math.round(v) : undefined
}

function num(x: unknown): number | undefined {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string' && x.trim() !== '' && Number.isFinite(Number(x))) return Number(x)
  return undefined
}

/** 把 OFF 的 JSON 解析成产品；缺产品或缺营养时返回 null */
export function parseOffProduct(json: unknown): OffProduct | null {
  if (!json || typeof json !== 'object') return null
  const j = json as Record<string, unknown>
  if (j.status === 0 || !j.product || typeof j.product !== 'object') return null
  const p = j.product as Record<string, unknown>
  const n = (p.nutriments && typeof p.nutriments === 'object' ? p.nutriments : {}) as Record<string, unknown>
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) !== undefined ? Math.round(num(n['energy_100g'])! / 4.184) : undefined)
  const protein = num(n['proteins_100g'])
  const fat = num(n['fat_100g'])
  const carbs = num(n['carbohydrates_100g'])
  if (kcal === undefined && protein === undefined && fat === undefined && carbs === undefined) return null
  const sodiumG = num(n['sodium_100g'])
  const saltG = num(n['salt_100g'])
  const sodium = sodiumG !== undefined ? sodiumG * 1000 : saltG !== undefined ? (saltG / 2.5) * 1000 : 0
  const per100: Nutrients = {
    kcal: kcal ?? Math.round((protein ?? 0) * 4 + (fat ?? 0) * 9 + (carbs ?? 0) * 4),
    protein: protein ?? 0,
    fat: fat ?? 0,
    carbs: carbs ?? 0,
    fiber: num(n['fiber_100g']) ?? 0,
    sodium: Math.round(sodium),
  }
  const str = (k: string) => (typeof p[k] === 'string' && (p[k] as string).trim() ? (p[k] as string).trim() : undefined)
  const name = str('product_name_zh') || str('product_name') || str('product_name_en') || `条码 ${String(p.code || j.code || '')}`
  return {
    code: String(p.code || j.code || ''),
    name,
    brand: str('brands')?.split(',')[0]?.trim(),
    quantity: str('quantity'),
    servingG: parseServingGrams(str('serving_size')),
    per100,
    source: 'openfoodfacts',
  }
}

/** 查询一个条码：查不到返回 null；网络错误抛出 */
export async function lookupBarcode(code: string, fetchImpl: typeof fetch = fetch): Promise<OffProduct | null> {
  const res = await fetchImpl(offProductUrl(code), { headers: { Accept: 'application/json' } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Open Food Facts 返回 ${res.status}`)
  return parseOffProduct(await res.json())
}
