// 档案的取值范围。网页版与小程序共用这一份，避免一端存得下、另一端救不回来。
import type { Profile } from './types'

export const PROFILE_LIMITS = {
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 250 },
  /** 年龄下限 10 岁；上限按 1920 年出生 */
  birthYear: { min: 1920, maxAgeOffset: 10 },
  bodyFatPct: { min: 4, max: 60 },
} as const

export interface ProfileProblem {
  field: 'heightCm' | 'weightKg' | 'birthYear' | 'bodyFatPct'
  message: string
}

/** 返回空数组表示可以保存 */
export function profileProblems(p: Profile, now = new Date()): ProfileProblem[] {
  const out: ProfileProblem[] = []
  const h = PROFILE_LIMITS.heightCm
  const w = PROFILE_LIMITS.weightKg
  const maxYear = now.getFullYear() - PROFILE_LIMITS.birthYear.maxAgeOffset

  if (!Number.isFinite(p.heightCm) || p.heightCm < h.min || p.heightCm > h.max) {
    out.push({ field: 'heightCm', message: `身高要在 ${h.min}~${h.max} 厘米之间` })
  }
  if (!Number.isFinite(p.weightKg) || p.weightKg < w.min || p.weightKg > w.max) {
    out.push({ field: 'weightKg', message: `体重要在 ${w.min}~${w.max} 公斤之间` })
  }
  if (
    !Number.isFinite(p.birthYear) ||
    p.birthYear < PROFILE_LIMITS.birthYear.min ||
    p.birthYear > maxYear
  ) {
    out.push({
      field: 'birthYear',
      message: `出生年份要在 ${PROFILE_LIMITS.birthYear.min}~${maxYear} 之间`,
    })
  }
  if (p.bodyFatPct !== undefined) {
    const b = PROFILE_LIMITS.bodyFatPct
    if (!Number.isFinite(p.bodyFatPct) || p.bodyFatPct < b.min || p.bodyFatPct > b.max) {
      out.push({ field: 'bodyFatPct', message: `体脂率要在 ${b.min}~${b.max}% 之间，或者留空` })
    }
  }
  return out
}

export function isProfileValid(p: Profile, now = new Date()): boolean {
  return profileProblems(p, now).length === 0
}
