// QMonster 狗狗合成器（canineRuntime.mjs，原样复制、由 npm run caninepack 校验摘要）的类型声明。
// 只声明 nutri 用到的部分；实现一行都不改，改实现等于另写一套合成顺序。
export const rendererVersion: 'canine-rgba-v1'
export const slots: readonly ['back', 'tailTip', 'ears', 'neck', 'crown']

export interface CanineSelection {
  bodyId: string
  back?: string
  tailTip?: string
  ears?: string
  neck?: string
  crown?: string
}

export interface CaninePlan {
  size: number
  body: string
  clearMasks: string[]
  behind: string[]
  front: string[]
  neck?: string
  headMask?: string
}

export function resolveCanine(catalog: unknown, selection: CanineSelection, opts?: { allowCandidate?: boolean }): CaninePlan
export function composeCanine(plan: CaninePlan, resources: Record<string, Uint8Array | Uint8ClampedArray>): Uint8ClampedArray
export function canonicalJson(value: unknown): string
