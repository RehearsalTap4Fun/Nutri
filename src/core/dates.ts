export function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

/** 本地日期 YYYY-MM-DD */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function todayStr(now = new Date()): string {
  return toDateStr(now)
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

/** 从 end 往前 n 天（含 end），升序 */
export function lastNDays(end: string, n: number): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i))
  return out
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
}

export function nowTimeStr(now = new Date()): string {
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`
}

export function weekdayLabel(s: string): string {
  return ['日', '一', '二', '三', '四', '五', '六'][parseDate(s).getDay()]
}

export function isWeekend(s: string): boolean {
  const d = parseDate(s).getDay()
  return d === 0 || d === 6
}

export function shortDate(s: string): string {
  const [, m, d] = s.split('-')
  return `${Number(m)}/${Number(d)}`
}
