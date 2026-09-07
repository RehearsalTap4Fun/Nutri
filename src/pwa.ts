/** PWA：注册 service worker，发现新版本时回调；file:// 打开时跳过 */
export function registerSW(onUpdate: (reload: () => void) => void): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  if (location.protocol === 'file:') return
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js')
      const watch = (worker: ServiceWorker | null) => {
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) onUpdate(() => location.reload())
        })
      }
      watch(reg.installing)
      reg.addEventListener('updatefound', () => watch(reg.installing))
      // 每次回到前台检查一次更新
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}) })
    } catch {
      // 注册失败不影响使用
    }
  })
}

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** 捕获 Android/桌面 Chrome 的安装提示事件，供「装到主屏幕」按钮使用 */
export function captureInstallPrompt(onReady: (e: InstallPromptEvent | null) => void): void {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); onReady(e as InstallPromptEvent) })
  window.addEventListener('appinstalled', () => onReady(null))
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
}

export function isIOS(): boolean {
  return typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/** 微信内置浏览器：不能安装到主屏幕，也可能限制存储，需要引导去系统浏览器 */
export function isWeChat(): boolean {
  return typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)
}
