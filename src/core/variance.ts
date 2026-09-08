/** 「日均 vs 目标」偏差图的计算：所有指标共用 −60% … +60% 的刻度，目标线在正中 */
export type VarianceMode = 'near' | 'atLeast' | 'atMost'
export const VAR_LIMIT = 0.6

export interface Variance {
  /** 实际偏差 (value − target) / target，可能超出刻度 */
  dev: number
  /** 画在刻度上的值，夹在 ±VAR_LIMIT */
  shown: number
  capped: boolean
  /** 是否落在合适区间里 */
  within: boolean
  /** 合适区间 [lo, hi]，以偏差表示，画成浅陆地色的带 */
  band: [number, number]
}

/** 容忍度：一个数表示上下对称；[低于多少, 高于多少] 表示不对称（都写正数） */
export type Tol = number | [number, number]

/** near：越接近目标越好（热量）；atLeast：至少要到（蛋白、纤维、蔬果、饮水）；atMost：不要超（脂肪、碳水、钠） */
export function bandFor(mode: VarianceMode, tol: Tol): [number, number] {
  const [lo, hi] = typeof tol === 'number' ? [tol, tol] : tol
  if (mode === 'near') return [-Math.min(lo, VAR_LIMIT), Math.min(hi, VAR_LIMIT)]
  if (mode === 'atLeast') return [-Math.min(lo, VAR_LIMIT), VAR_LIMIT]
  return [-VAR_LIMIT, Math.min(hi, VAR_LIMIT)]
}

export function varianceOf(value: number, target: number, mode: VarianceMode, tol: Tol = 0.1): Variance {
  const dev = target > 0 ? (value - target) / target : 0
  const shown = Math.max(-VAR_LIMIT, Math.min(VAR_LIMIT, dev))
  const band = bandFor(mode, tol)
  return { dev, shown, capped: Math.abs(dev) > VAR_LIMIT, within: dev >= band[0] - 1e-9 && dev <= band[1] + 1e-9, band }
}

export function devLabel(dev: number): string {
  const pct = Math.round(Math.abs(dev) * 100)
  if (pct === 0) return '±0%'
  return `${dev > 0 ? '+' : '−'}${pct}%`
}

/** 刻度上的位置（0–100%） */
export function varX(d: number): number {
  return ((d + VAR_LIMIT) / (2 * VAR_LIMIT)) * 100
}
