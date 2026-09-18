/**
 * 像素精灵的纯函数工具：二值 alpha 叠图、多边形抠除、选择性描边、整张合成。
 * 不依赖 canvas，运行时（浏览器）与离线预览脚本（Node）跑的是同一份代码，所见即所得。
 * 像素画的几个约定都在这里落实：无抗锯齿（alpha 只有 0/255）、1px 描边、按像素中心判定多边形。
 */

export type Rgba = Uint8ClampedArray

export function blankRgba(n: number): Rgba {
  return new Uint8ClampedArray(n * n * 4)
}

/** alpha 二值化：低于阈值全透明（颜色也清零），其余全不透明 */
export function hardenAlpha(data: Rgba, cutoff = 128): Rgba {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < cutoff) { data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0 }
    else data[i + 3] = 255
  }
  return data
}

/** src 盖到 dst 上：src 不透明的像素直接覆盖（二值 alpha 不做混合） */
export function overRgba(dst: Rgba, src: Rgba): Rgba {
  for (let i = 0; i < dst.length; i += 4) {
    if (src[i + 3] === 0) continue
    dst[i] = src[i]; dst[i + 1] = src[i + 1]; dst[i + 2] = src[i + 2]; dst[i + 3] = 255
  }
  return dst
}

export function insidePolygon(x: number, y: number, poly: readonly (readonly number[])[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** 把多边形（像素中心落在内部）区域抠成透明 */
export function clearPolygon(data: Rgba, n: number, poly: readonly (readonly number[])[]): Rgba {
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!insidePolygon(x + 0.5, y + 0.5, poly)) continue
      const i = (y * n + x) * 4
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0
    }
  }
  return data
}

/**
 * 选择性描边：给不透明区域外面描一圈 1px，颜色取相邻不透明像素的平均色再压暗（比纯黑柔和，且随部件色相走）。
 * 只看四邻，边角处自然留空，是像素画常见的圆角描边手感。
 */
export function outlineRgba(src: Rgba, n: number, darken = 0.36): Rgba {
  const out = new Uint8ClampedArray(src)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4
      if (src[i + 3] !== 0) continue
      let r = 0, g = 0, b = 0, c = 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue
        const j = (ny * n + nx) * 4
        if (src[j + 3] === 0) continue
        r += src[j]; g += src[j + 1]; b += src[j + 2]; c++
      }
      if (c === 0) continue
      out[i] = Math.round((r / c) * darken); out[i + 1] = Math.round((g / c) * darken); out[i + 2] = Math.round((b / c) * darken); out[i + 3] = 255
    }
  }
  return out
}

/** 通用合成计划：与 QMonster pixel-rgba-v1 的操作一一对应 */
export type PixelOp =
  | { kind: 'clear'; polygons: readonly (readonly (readonly number[])[])[] }
  | { kind: 'draw'; layer: string; target: 'frame' | 'subject'; occlusion: readonly (readonly (readonly number[])[])[] }

/**
 * 按计划合成（pixel-rgba-v1 语义，与 QMonster composePixelArt 逐字节一致）：
 * clear 从已累计的 subject 上擦多边形；draw 先复制部件、要求二值 alpha、透明像素清零、擦掉自身 occlusion，
 * 画到 frame 的部件单独描边再叠，画到 subject 的直接叠；最后 subject 整体描边盖到 frame 上。
 */
export function composePlan(ops: readonly PixelOp[], layer: (id: string) => Rgba, n: number): Rgba {
  const frame = blankRgba(n)
  const subject = blankRgba(n)
  for (const op of ops) {
    if (op.kind === 'clear') {
      for (const poly of op.polygons) clearPolygon(subject, n, poly)
      continue
    }
    const src = layer(op.layer)
    if (src.length !== n * n * 4) throw new Error(`图层尺寸不对: ${op.layer}`)
    const px = new Uint8ClampedArray(src)
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] !== 0 && px[i + 3] !== 255) throw new Error(`图层 alpha 不是二值: ${op.layer}`)
      if (px[i + 3] === 0) { px[i] = 0; px[i + 1] = 0; px[i + 2] = 0 }
    }
    for (const poly of op.occlusion) clearPolygon(px, n, poly)
    if (op.target === 'frame') overRgba(frame, outlineRgba(px, n))
    else overRgba(subject, px)
  }
  overRgba(frame, outlineRgba(subject, n))
  return frame
}

/**
 * 纯色背景抠图：背景色默认取四角的中位色（生成图通常是纯色底，四角最可靠），
 * 与背景色 RGB 距离小于阈值的像素变透明，其余不透明；再向内腐蚀 erode 像素抹掉边缘的背景色溢出。
 * 用于把 AI 出的「实色底」平涂源图变成带真实 alpha 的图层。
 */
export function keyBackgroundRgba(
  data: Rgba, w: number, h: number,
  opts: { threshold?: number; background?: [number, number, number]; erode?: number } = {},
): Rgba {
  const threshold = opts.threshold ?? 90
  const bg = opts.background ?? cornerColor(data, w, h)
  const out = new Uint8ClampedArray(data)
  for (let i = 0; i < out.length; i += 4) {
    const dr = out[i] - bg[0], dg = out[i + 1] - bg[1], db = out[i + 2] - bg[2]
    const far = Math.sqrt(dr * dr + dg * dg + db * db) >= threshold
    if (!far) { out[i] = 0; out[i + 1] = 0; out[i + 2] = 0 }
    out[i + 3] = far ? 255 : 0
  }
  for (let k = 0; k < (opts.erode ?? 2); k++) erodeAlpha(out, w, h)
  return out
}

/** 四角各取 5×5 的平均色，再取四者的逐通道中位数 */
export function cornerColor(data: Rgba, w: number, h: number): [number, number, number] {
  const corners: [number, number][] = [[0, 0], [w - 5, 0], [0, h - 5], [w - 5, h - 5]]
  const samples = corners.map(([cx, cy]) => {
    const sum = [0, 0, 0]
    for (let y = cy; y < cy + 5; y++) for (let x = cx; x < cx + 5; x++) { const i = (y * w + x) * 4; sum[0] += data[i]; sum[1] += data[i + 1]; sum[2] += data[i + 2] }
    return sum.map((v) => v / 25)
  })
  const mid = (c: number) => { const v = samples.map((s) => s[c]).sort((a, b) => a - b); return Math.round((v[1] + v[2]) / 2) }
  return [mid(0), mid(1), mid(2)]
}

/** alpha 向内腐蚀 1px：四邻有透明的不透明像素变透明（原地修改） */
export function erodeAlpha(data: Rgba, w: number, h: number): Rgba {
  const src = new Uint8ClampedArray(data)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (src[i + 3] === 0) continue
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1
        || src[i - 4 + 3] === 0 || src[i + 4 + 3] === 0 || src[i - w * 4 + 3] === 0 || src[i + w * 4 + 3] === 0
      if (edge) { data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0 }
    }
  }
  return data
}

/**
 * 去斑：某像素的 8 邻域里若有 ≥minMajority 个像素同为另一种颜色，且该颜色与本像素相近（低对比），就并过去。
 * 目的是抹掉毛发纹理残留的低对比碎点，同时保住眼睛高光、鼻头这种高对比的小细节。透明像素不参与。
 */
export function despeckleRgba(src: Rgba, n: number, opts: { threshold?: number; minMajority?: number } = {}): Rgba {
  const threshold = opts.threshold ?? 64
  const minMajority = opts.minMajority ?? 5
  const out = new Uint8ClampedArray(src)
  const key = (i: number) => (src[i] << 16) | (src[i + 1] << 8) | src[i + 2]
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4
      if (src[i + 3] === 0) continue
      const counts = new Map<number, number>()
      let best = -1, bestCount = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue
          const j = (ny * n + nx) * 4
          if (src[j + 3] === 0) continue
          const k = key(j)
          const c = (counts.get(k) ?? 0) + 1
          counts.set(k, c)
          if (c > bestCount) { bestCount = c; best = k }
        }
      }
      if (best < 0 || best === key(i) || bestCount < minMajority) continue
      const dr = ((best >> 16) & 255) - src[i], dg = ((best >> 8) & 255) - src[i + 1], db = (best & 255) - src[i + 2]
      if (Math.sqrt(dr * dr + dg * dg + db * db) > threshold) continue
      out[i] = (best >> 16) & 255; out[i + 1] = (best >> 8) & 255; out[i + 2] = best & 255
    }
  }
  return out
}

/** 统计不透明像素的不同颜色数（测试与预览用） */
export function countOpaqueColors(data: Rgba): number {
  const seen = new Set<number>()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])
  }
  return seen.size
}
