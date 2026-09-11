import { useId } from 'react'
import type { Creature, CreatureTraits } from '../core/creature'

const BODY_PATH: Record<CreatureTraits['body'], string> = {
  round: 'M50 15 C 72 15 85 32 85 55 C 85 76 70 90 50 90 C 30 90 15 76 15 55 C 15 32 28 15 50 15 Z',
  egg: 'M50 6 C 66 6 78 30 78 58 C 78 82 66 94 50 94 C 34 94 22 82 22 58 C 22 30 34 6 50 6 Z',
  blob: 'M46 8 C 66 4 90 20 88 44 C 96 64 78 92 52 90 C 26 96 6 74 10 50 C 4 26 26 12 46 8 Z',
  droplet: 'M50 8 C 60 26 80 46 80 64 C 80 81 67 93 50 93 C 33 93 20 81 20 64 C 20 46 40 26 50 8 Z',
}

const BODY_COLOR: Record<CreatureTraits['color'], string> = {
  coral: '#E8795F',
  sage: '#84A46E',
  periwinkle: '#7C8FDD',
  amber: '#DDA23E',
  lilac: '#A886C7',
  seafoam: '#5FAD93',
  blush: '#DD90A8',
  slate: '#54727F',
}

function Pattern({ pattern, uid }: { pattern: CreatureTraits['pattern']; uid: string }) {
  if (pattern === 'none') return null
  const clip = `url(#creature-clip-${uid})`
  if (pattern === 'spots') {
    return (
      <g clipPath={clip} fill="rgba(255,255,255,.4)">
        <circle cx={34} cy={40} r={6} /><circle cx={62} cy={34} r={4.5} /><circle cx={68} cy={58} r={5.5} /><circle cx={38} cy={70} r={4} />
      </g>
    )
  }
  if (pattern === 'stripes') {
    return (
      <g clipPath={clip} fill="none" stroke="rgba(255,255,255,.4)" strokeWidth={7} strokeLinecap="round">
        <path d="M10 40 Q50 46 90 40" /><path d="M8 58 Q50 64 92 58" /><path d="M14 76 Q50 81 86 76" />
      </g>
    )
  }
  if (pattern === 'stars') {
    return (
      <g clipPath={clip} fill="rgba(255,255,255,.55)">
        <path d="M32 30 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1z" />
        <path d="M66 46 l1.6 4 4 .8 -3.2 2.4 .8 4 -3.2 -2.4 -3.2 2.4 .8 -4 -3.2 -2.4 4 -.8z" />
        <path d="M46 66 l1.6 4 4 .8 -3.2 2.4 .8 4 -3.2 -2.4 -3.2 2.4 .8 -4 -3.2 -2.4 4 -.8z" />
      </g>
    )
  }
  // patch
  return (
    <g clipPath={clip} fill="rgba(255,255,255,.35)">
      <path d="M60 20 C 78 22 84 40 78 54 C 72 66 54 64 50 50 C 46 36 46 18 60 20 Z" />
    </g>
  )
}

function Eyes({ eyes }: { eyes: CreatureTraits['eyes'] }) {
  const ink = '#2c2e2a'
  if (eyes === 'dot') return <g fill={ink}><circle cx={36} cy={48} r={4.2} /><circle cx={64} cy={48} r={4.2} /></g>
  if (eyes === 'sleepy') return <g fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round"><path d="M29 48 Q36 54 43 48" /><path d="M57 48 Q64 54 71 48" /></g>
  if (eyes === 'round') return (
    <g>
      <circle cx={36} cy={47} r={7.5} fill="#fff" /><circle cx={64} cy={47} r={7.5} fill="#fff" />
      <circle cx={36} cy={48.5} r={4.2} fill={ink} /><circle cx={64} cy={48.5} r={4.2} fill={ink} />
      <circle cx={33.5} cy={45.5} r={1.4} fill="#fff" /><circle cx={61.5} cy={45.5} r={1.4} fill="#fff" />
    </g>
  )
  if (eyes === 'wink') return (
    <g>
      <circle cx={36} cy={48} r={4.2} fill={ink} />
      <path d="M57 48 Q64 54 71 48" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
    </g>
  )
  // star
  const star = (cx: number, cy: number) => `M${cx} ${cy - 6} l1.8 4.4 4.6 .9 -3.5 2.7 .9 4.4 -3.8 -2.6 -3.8 2.6 .9 -4.4 -3.5 -2.7 4.6 -.9z`
  return <g fill={ink}><path d={star(36, 48)} /><path d={star(64, 48)} /></g>
}

function Mouth({ mouth }: { mouth: CreatureTraits['mouth'] }) {
  const ink = '#2c2e2a'
  if (mouth === 'smile') return <path d="M40 65 Q50 74 60 65" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
  if (mouth === 'o') return <circle cx={50} cy={68} r={4.6} fill={ink} />
  if (mouth === 'cat') return <path d="M41 64 Q46 70 50 64 Q54 70 59 64" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  if (mouth === 'flat') return <line x1={42} y1={68} x2={58} y2={68} stroke={ink} strokeWidth={3} strokeLinecap="round" />
  // fang
  return (
    <g>
      <path d="M40 65 Q50 74 60 65" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
      <path d="M47 70 L53 70 L50 78 Z" fill="#fff" />
    </g>
  )
}

function Extra({ extra }: { extra: CreatureTraits['extra'] }) {
  const ink = '#2c2e2a'
  if (extra === 'none') return null
  if (extra === 'antenna') return <g fill="none" stroke={ink} strokeWidth={2.5} strokeLinecap="round"><path d="M46 14 Q40 2 34 -2" /><circle cx={34} cy={-2} r={3.4} fill={ink} /></g>
  if (extra === 'horn') return <path d="M44 12 L56 12 L50 -4 Z" fill="#E8C25A" stroke={ink} strokeWidth={1.2} />
  if (extra === 'ears') return (
    <g stroke={ink} strokeWidth={1.2}>
      <ellipse cx={26} cy={16} rx={6} ry={10} transform="rotate(-20 26 16)" />
      <ellipse cx={74} cy={16} rx={6} ry={10} transform="rotate(20 74 16)" />
    </g>
  )
  if (extra === 'tail') return <path d="M78 76 Q95 80 90 64 Q86 74 78 76 Z" stroke={ink} strokeWidth={1.2} />
  // bow
  return (
    <g stroke={ink} strokeWidth={1}>
      <path d="M50 10 L38 3 L38 17 Z" fill="#E8607C" />
      <path d="M50 10 L62 3 L62 17 Z" fill="#E8607C" />
      <circle cx={50} cy={10} r={3} fill="#C94564" />
    </g>
  )
}

/** 一只健康小管家：body 决定轮廓与主色，其余特征叠在上面。size 传数字（px），默认铺满容器。 */
export function CreatureView({ traits, size = 96, className }: { traits: CreatureTraits; size?: number; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const color = BODY_COLOR[traits.color] ?? BODY_COLOR.sage
  const body = BODY_PATH[traits.body] ?? BODY_PATH.round
  return (
    <svg viewBox="-10 -14 120 120" width={size} height={size} className={className} role="img" aria-label="健康小管家">
      <defs>
        <clipPath id={`creature-clip-${uid}`}><path d={body} /></clipPath>
      </defs>
      <g fill={color}>
        <path d={body} stroke="rgba(0,0,0,.12)" strokeWidth={1.5} />
        <Pattern pattern={traits.pattern} uid={uid} />
        <Extra extra={traits.extra} />
        <Eyes eyes={traits.eyes} />
        <Mouth mouth={traits.mouth} />
      </g>
    </svg>
  )
}

/** 蛋：还没孵化出来时占位，几道纹理营造质感 */
export function EggView({ size = 96, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="-10 -14 120 120" width={size} height={size} className={className} role="img" aria-label="还没孵化的蛋">
      <path d="M50 6 C 66 6 78 30 78 58 C 78 82 66 94 50 94 C 34 94 22 82 22 58 C 22 30 34 6 50 6 Z" fill="#EDE6D6" stroke="rgba(0,0,0,.12)" strokeWidth={1.5} />
      <g fill="none" stroke="rgba(0,0,0,.1)" strokeWidth={2} strokeLinecap="round">
        <path d="M34 26 Q30 40 36 50" />
        <path d="M64 34 Q70 46 62 58" />
        <path d="M40 62 Q46 72 40 82" />
      </g>
    </svg>
  )
}

export function creatureSummary(c: Creature): string {
  return `${c.traits.color} · ${c.traits.body} · ${c.mutations} 次异变`
}
