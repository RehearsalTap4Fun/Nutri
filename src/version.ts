// 构建信息由 vite.config.ts 的 define 注入；dev 下也有值
declare const __APP_VERSION__: string
declare const __BUILD_ID__: string
declare const __GIT_HASH__: string

export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : ''
export const GIT_HASH: string = typeof __GIT_HASH__ === 'string' ? __GIT_HASH__ : ''

/** 20260907135100 → 2026-09-07 13:51 */
export function formatBuildId(id: string): string {
  if (!/^\d{12}/.test(id)) return id || '开发中'
  return `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)} ${id.slice(8, 10)}:${id.slice(10, 12)}`
}

export const VERSION_LABEL = `v${APP_VERSION} · 构建 ${formatBuildId(BUILD_ID)}${GIT_HASH ? ' · ' + GIT_HASH : ''}`

/** 读取服务器上的 version.json（构建时同步生成），与当前页面比对 */
export async function checkRemoteVersion(): Promise<{ remote: string; same: boolean } | null> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const j = (await res.json()) as { version?: string }
    const remote = String(j.version || '')
    return { remote, same: remote.slice(0, 12) === BUILD_ID.slice(0, 12) }
  } catch {
    return null
  }
}
