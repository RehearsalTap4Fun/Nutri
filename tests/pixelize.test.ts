import { describe, expect, it } from 'vitest'
import { blankRgba, clearPolygon, cornerColor, countOpaqueColors, despeckleRgba, erodeAlpha, hardenAlpha, keyBackgroundRgba, outlineRgba, overRgba, type Rgba } from '../src/core/pixelize'
import { composeSprite, type RenderOp } from '../src/core/pixelcatPlush'

const N = 8
const px = (data: Rgba, x: number, y: number) => Array.from(data.slice((y * N + x) * 4, (y * N + x) * 4 + 4))
/** 画一个实心矩形图层 */
function rect(x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number], alpha = 255): Rgba {
  const d = blankRgba(N)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = (y * N + x) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = alpha }
  return d
}

describe('hardenAlpha / overRgba', () => {
  it('alpha 二值化：低于阈值清成全透明，其余全不透明', () => {
    const d = new Uint8ClampedArray([10, 20, 30, 40, 50, 60, 70, 200])
    hardenAlpha(d)
    expect(Array.from(d)).toEqual([0, 0, 0, 0, 50, 60, 70, 255])
  })
  it('叠图只覆盖不透明像素，不做混合', () => {
    const dst = rect(0, 0, 7, 7, [1, 2, 3])
    overRgba(dst, rect(2, 2, 3, 3, [9, 9, 9]))
    expect(px(dst, 2, 2)).toEqual([9, 9, 9, 255])
    expect(px(dst, 0, 0)).toEqual([1, 2, 3, 255])
  })
})

describe('clearPolygon', () => {
  it('按像素中心判定，多边形内抠成透明，外面不动', () => {
    const d = rect(0, 0, 7, 7, [5, 5, 5])
    clearPolygon(d, N, [[4, 0], [8, 0], [8, 8], [4, 8]]) // 右半边
    expect(px(d, 3, 4)[3]).toBe(255)
    expect(px(d, 4, 4)[3]).toBe(0)
    expect(px(d, 7, 7)[3]).toBe(0)
  })
})

describe('outlineRgba', () => {
  it('在不透明区域外描一圈 1px，颜色是相邻色压暗，边角留空', () => {
    const d = rect(2, 2, 5, 5, [200, 100, 50])
    const o = outlineRgba(d, N, 0.5)
    expect(px(o, 1, 3)).toEqual([100, 50, 25, 255]) // 左边
    expect(px(o, 3, 6)).toEqual([100, 50, 25, 255]) // 下边
    expect(px(o, 1, 1)[3]).toBe(0) // 对角不描
    expect(px(o, 0, 3)[3]).toBe(0) // 只有 1px
    expect(px(o, 3, 3)).toEqual([200, 100, 50, 255]) // 内部不动
  })
  it('不改动入参', () => {
    const d = rect(2, 2, 5, 5, [200, 100, 50])
    const copy = new Uint8ClampedArray(d)
    outlineRgba(d, N)
    expect(Array.from(d)).toEqual(Array.from(copy))
  })
})

describe('despeckleRgba', () => {
  it('低对比孤点并入周围主色；高对比孤点（如眼睛高光）保留', () => {
    const d = rect(0, 0, 7, 7, [100, 100, 100])
    const set = (x: number, y: number, rgb: number[]) => { const i = (y * N + x) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2] }
    set(3, 3, [120, 110, 100]) // 低对比碎点
    set(5, 5, [255, 255, 255]) // 高光
    const o = despeckleRgba(d, N)
    expect(px(o, 3, 3)).toEqual([100, 100, 100, 255])
    expect(px(o, 5, 5)).toEqual([255, 255, 255, 255])
  })
  it('透明像素不参与也不被改动', () => {
    const d = rect(2, 2, 5, 5, [100, 100, 100])
    const o = despeckleRgba(d, N)
    expect(px(o, 0, 0)[3]).toBe(0)
    expect(countOpaqueColors(o)).toBe(1)
  })
})

describe('composeSprite', () => {
  const layers: Record<string, Rgba> = {
    body: rect(2, 2, 5, 5, [200, 200, 200]),
    wings: rect(0, 3, 7, 4, [50, 50, 250]),
    ears: rect(2, 0, 5, 1, [250, 50, 50]),
  }
  const clear = { ears: [[[2, 2], [6, 2], [6, 3], [2, 3]]], tailTip: [[0, 0], [0, 0], [0, 0]] }
  it('后层部件被身体盖住，身体描边落在部件上，抠除区域露出后层', () => {
    const ops: RenderOp[] = [
      { kind: 'draw', layer: 'wings', target: 'frame' },
      { kind: 'draw', layer: 'body', target: 'subject' },
      { kind: 'clear', region: 'ears' },
      { kind: 'draw', layer: 'ears', target: 'subject' },
    ]
    const out = composeSprite(ops, (id) => layers[id], N, clear)
    expect(px(out, 3, 4)).toEqual([200, 200, 200, 255]) // 身体在翅膀之上
    expect(px(out, 0, 3)).toEqual([50, 50, 250, 255]) // 翅膀露出的部分
    // 身体顶行被抠掉后夹在耳朵(0~1 行)与身体(3~5 行)之间，描边把这一行填成两者平均色压暗：(225,125,125)×0.36
    expect(px(out, 3, 2)).toEqual([81, 45, 45, 255])
    expect(px(out, 3, 1)).toEqual([250, 50, 50, 255]) // 替换耳
    expect(px(out, 1, 4)).toEqual([72, 72, 72, 255]) // 紧贴身体的那一格翅膀被身体描边盖住：部件与身体之间的分隔线
    // 身体左侧描边：x=1 处翅膀不在的行（y=5）应是压暗的身体色
    expect(px(out, 1, 5)).toEqual([72, 72, 72, 255])
    // 翅膀自身也描边：翅膀上方 y=2 在 x=0 处应是压暗的蓝
    expect(px(out, 0, 2)).toEqual([18, 18, 90, 255])
  })
  it('普通小猫：只有身体加一圈描边', () => {
    const out = composeSprite([{ kind: 'draw', layer: 'body', target: 'subject' }], (id) => layers[id], N, clear)
    expect(countOpaqueColors(out)).toBe(2)
    expect(px(out, 2, 1)).toEqual([72, 72, 72, 255])
  })
})

describe('keyBackgroundRgba', () => {
  const W = 16
  /** 洋红底上一个 6×6 的橘色方块，边缘一圈混了底色 */
  function solid(): Rgba {
    const d = new Uint8ClampedArray(W * W * 4)
    for (let i = 0; i < d.length; i += 4) { d[i] = 255; d[i + 1] = 0; d[i + 2] = 255; d[i + 3] = 255 }
    for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) {
      const i = (y * W + x) * 4
      const rim = y === 5 || y === 10 || x === 5 || x === 10
      d[i] = rim ? 240 : 230; d[i + 1] = rim ? 60 : 120; d[i + 2] = rim ? 150 : 40
    }
    return d
  }
  it('四角中位色识别为背景，背景透明、主体保留，默认腐蚀两圈去掉溢色边', () => {
    const d = solid()
    expect(cornerColor(d, W, W)).toEqual([255, 0, 255])
    const o = keyBackgroundRgba(d, W, W)
    const a = (x: number, y: number) => o[(y * W + x) * 4 + 3]
    expect(a(0, 0)).toBe(0)
    expect(a(5, 5)).toBe(0) // 溢色的边被腐蚀掉
    expect(a(6, 6)).toBe(0) // 第二圈
    expect(a(7, 7)).toBe(255)
    expect(Array.from(o.slice((7 * W + 7) * 4, (7 * W + 7) * 4 + 3))).toEqual([230, 120, 40])
  })
  it('erode 为 0 时不腐蚀；可显式指定背景色', () => {
    const o = keyBackgroundRgba(solid(), W, W, { erode: 0, background: [255, 0, 255] })
    expect(o[(5 * W + 5) * 4 + 3]).toBe(255) // 溢色边距洋红仍够远，不腐蚀就保留
  })
  it('erodeAlpha 只剥一圈', () => {
    const d = blankRgba(N)
    for (let y = 1; y < 7; y++) for (let x = 1; x < 7; x++) { const i = (y * N + x) * 4; d[i + 3] = 255 }
    erodeAlpha(d, N, N)
    expect(d[(1 * N + 1) * 4 + 3]).toBe(0)
    expect(d[(2 * N + 2) * 4 + 3]).toBe(255)
  })
})
