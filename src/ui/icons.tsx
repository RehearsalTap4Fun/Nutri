// 底部导航与常用图标：手绘感的 1.75px 线条，继承 currentColor
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export function IconBowl() {
  return (
    <svg {...base} aria-hidden>
      <path d="M3.5 11.5h17c0 4.5-3.2 8-8.5 8s-8.5-3.5-8.5-8Z" />
      <path d="M8 19.5v1.5M16 19.5v1.5M9 8.5c0-1.6 1-2 1-3.5M13 8.5c0-1.6 1-2 1-3.5" />
    </svg>
  )
}
export function IconLeaf() {
  return (
    <svg {...base} aria-hidden>
      <path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14Z" />
      <path d="M5 19c3-4 6-7 10-10" />
    </svg>
  )
}
export function IconChart() {
  return (
    <svg {...base} aria-hidden>
      <path d="M4 19.5h16" />
      <path d="M6.5 16.5v-5M11 16.5V7.5M15.5 16.5v-3M20 16.5V10" />
    </svg>
  )
}
export function IconPerson() {
  return (
    <svg {...base} aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  )
}
export function IconPlus({ size = 26 }: { size?: number } = {}) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.2} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
export function IconSparkle() {
  return (
    <svg {...base} width={16} height={16} aria-hidden>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z" />
    </svg>
  )
}

/** 以下小图标给列表与徽记用，默认 14px，继承 currentColor */
export function IconStar({ filled = false, size = 16 }: { filled?: boolean; size?: number }) {
  return (
    <svg {...base} width={size} height={size} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.9} aria-hidden>
      <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.6Z" />
    </svg>
  )
}
export function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.4} aria-hidden>
      <path d="M5 12.5l4.3 4.3L19 7.5" />
    </svg>
  )
}
export function IconAlert({ size = 14 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.6} aria-hidden>
      <path d="M12 5v9M12 18.4v.4" />
    </svg>
  )
}
export function IconInfo({ size = 14 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.6} aria-hidden>
      <path d="M12 11v7M12 6.2v.4" />
    </svg>
  )
}
export function IconClose({ size = 14 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.2} aria-hidden>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  )
}

export function IconChevron({ size = 14 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.2} aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
export function IconLock({ size = 14 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={1.9} aria-hidden>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  )
}
export function IconCoin({ size = 14 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={1.9} aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 9.5h4.2a1.8 1.8 0 0 1 0 3.6H9.8M9.5 13.1h4.4a1.7 1.7 0 0 1 0 3.4H9.5M12 7.5v1.5M12 16.5V18" />
    </svg>
  )
}

export function IconScan({ size = 16 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2} aria-hidden>
      <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2" />
      <path d="M8 8v8M11 8v8M14 8v8M16.5 8v8" />
    </svg>
  )
}
