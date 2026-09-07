/** mulberry32 种子随机，保证同一天同一 seed 推荐可复现 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 按权重抽样，返回下标；weights 全为 0 时返回 -1 */
export function weightedPick(weights: number[], rnd: () => number): number {
  let total = 0
  for (const w of weights) total += Math.max(0, w)
  if (total <= 0) return -1
  let r = rnd() * total
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i])
    if (r <= 0) return i
  }
  return weights.length - 1
}
