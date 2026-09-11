import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Creature, CreatureTraits } from '../core/creature'
import { PERSONALITY_LABEL } from '../core/creature'
import type { Mood } from '../core/creatureTalk'
import { hashString } from '../core/rng'

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

/** 待机动画 + 表情用的关键帧；用内联 <style> 而不是 styles.css，SVG 各处随渲染自带，不用改共享样式表 */
const CREATURE_KEYFRAMES = `
@keyframes creature-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
@keyframes creature-blink { 0%, 88%, 100% { transform: scaleY(1); } 93% { transform: scaleY(.15); } }
@keyframes creature-twinkle { 0%, 100% { opacity: .5; transform: scale(.82); } 50% { opacity: 1; transform: scale(1.06); } }
@keyframes egg-wobble { 0%, 100% { transform: rotate(-1.5deg); } 50% { transform: rotate(1.5deg); } }
@keyframes creature-poof {
  0% { opacity: 0; transform: scale(.35); }
  20% { opacity: 1; transform: scale(1.05); }
  45% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(1.75); }
}
@media (prefers-reduced-motion: reduce) {
  .creature-bob, .creature-blink, .creature-mood-accent, .egg-wobble, .creature-poof { animation: none !important; }
}
`

/** 异变时长相在烟雾里"换脸"：多长出现全遮住、多久后散尽，跟 CSS 关键帧的百分比对应上 */
const POOF_TOTAL_MS = 700
const POOF_SWAP_AT_MS = 260

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** 一团遮挡用的烟雾：几个软圆叠出云团感，交给 CSS 关键帧一次性播放（不遮 mood/呼吸，单独盖在最上层） */
function SmokePoof({ onDone }: { onDone: () => void }) {
  return (
    <g
      className="creature-poof"
      style={{ transformOrigin: '50px 52px', animation: `creature-poof ${POOF_TOTAL_MS}ms ease-out 1` }}
      onAnimationEnd={onDone}
    >
      <circle cx={50} cy={54} r={34} fill="rgba(250,247,240,.94)" />
      <circle cx={28} cy={44} r={16} fill="rgba(250,247,240,.82)" />
      <circle cx={73} cy={47} r={14.5} fill="rgba(250,247,240,.82)" />
      <circle cx={50} cy={26} r={13} fill="rgba(250,247,240,.78)" />
    </g>
  )
}

/** 心情用的小星芒（四角圆润的星形），用于开心/兴奋时头顶的闪烁点缀 */
function sparklePath(cx: number, cy: number, r: number): string {
  const k = r * 0.34
  return `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`
}

/** 心情表情：只加小幅点缀，不碰 trait 决定的眼嘴造型，避免和生物固定长相打架 */
function MoodAccent({ mood }: { mood: Mood }) {
  if (mood === 'concerned') {
    return (
      <g className="creature-mood-accent" style={{ transformOrigin: '78px 16px' }} transform="translate(78,10)">
        <path d="M0 0 C 4.5 5.5 4.5 11 0 13 C -4.5 11 -4.5 5.5 0 0 Z" fill="#8FCBEA" stroke="rgba(0,0,0,.15)" strokeWidth={1} />
      </g>
    )
  }
  if (mood === 'happy' || mood === 'excited') {
    const spots: Array<[number, number, number]> = mood === 'excited'
      ? [[80, 6, 5.5], [93, 18, 3.6], [86, 31, 2.8]]
      : [[80, 8, 4.6], [91, 20, 3]]
    return (
      <g className="creature-mood-accent" style={{ transformOrigin: '86px 18px' }} fill="#FFD66B">
        {spots.map(([cx, cy, r], i) => <path key={i} d={sparklePath(cx, cy, r)} />)}
      </g>
    )
  }
  return null
}

/** 一只健康小管家：body 决定轮廓与主色，其余特征叠在上面。size 传数字（px），默认铺满容器。
 *  mood 只加轻量表情点缀（不改变 trait 决定的长相），不传就是中性、只有待机呼吸/眨眼动画。
 *  异变时（traits 变了但组件没卸载重挂载）会先冒一团烟盖住旧长相，散开时已经是新长相——而不是瞬间跳变。 */
export function CreatureView({ traits, size = 96, className, mood = 'neutral' }: { traits: CreatureTraits; size?: number; className?: string; mood?: Mood }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  // 实际画出来的长相：异变时不会立刻跳到新 traits，等烟雾盖住那一刻再换，散尽时刚好露出新样子
  const [displayed, setDisplayed] = useState(traits)
  const [poofKey, setPoofKey] = useState(0)
  const [poofing, setPoofing] = useState(false)
  const prevTraits = useRef(traits)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (JSON.stringify(prevTraits.current) === JSON.stringify(traits)) return
    prevTraits.current = traits
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (prefersReducedMotion()) {
      setDisplayed(traits)
      return
    }
    setPoofing(true)
    setPoofKey((k) => k + 1)
    timers.current.push(setTimeout(() => setDisplayed(traits), POOF_SWAP_AT_MS))
    // 兜底：不指望 onAnimationEnd 一定能触发（浏览器/自动化环境下观察到并不总可靠），到点强制收起烟雾
    timers.current.push(setTimeout(() => setPoofing(false), POOF_TOTAL_MS))
    return () => { timers.current.forEach(clearTimeout) }
  }, [traits])

  const color = BODY_COLOR[displayed.color] ?? BODY_COLOR.sage
  const body = BODY_PATH[displayed.body] ?? BODY_PATH.round
  // 用长相特征算一个稳定的种子，让不同生物的呼吸/眨眼节奏错开，历史图鉴里一排不会齐刷刷同步
  const seed = useMemo(() => hashString(JSON.stringify(displayed)), [displayed])
  const bobDelay = `${-((seed % 320) / 100)}s`
  const blinkDelay = `${-((seed % 470) / 100)}s`
  return (
    <svg viewBox="-10 -14 120 120" width={size} height={size} className={className} role="img" aria-label="健康小管家">
      <defs>
        <clipPath id={`creature-clip-${uid}`}><path d={body} /></clipPath>
      </defs>
      <style>{CREATURE_KEYFRAMES}</style>
      <g
        className="creature-bob"
        fill={color}
        style={{ transformOrigin: '50px 55px', animation: 'creature-bob 3.2s ease-in-out infinite', animationDelay: bobDelay }}
      >
        <path d={body} stroke="rgba(0,0,0,.12)" strokeWidth={1.5} />
        <Pattern pattern={displayed.pattern} uid={uid} />
        <Extra extra={displayed.extra} />
        <g
          className="creature-blink"
          style={{ transformOrigin: '50px 48px', animation: 'creature-blink 4.6s ease-in-out infinite', animationDelay: blinkDelay }}
        >
          <Eyes eyes={displayed.eyes} />
        </g>
        <Mouth mouth={displayed.mouth} />
        <MoodAccent mood={mood} />
      </g>
      {poofing && <SmokePoof key={poofKey} onDone={() => setPoofing(false)} />}
    </svg>
  )
}

/** 蛋：还没孵化出来时占位，几道纹理营造质感，轻轻摇晃暗示里面有东西 */
export function EggView({ size = 96, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="-10 -14 120 120" width={size} height={size} className={className} role="img" aria-label="还没孵化的蛋">
      <style>{CREATURE_KEYFRAMES}</style>
      <g className="egg-wobble" style={{ transformOrigin: '50px 58px', animation: 'egg-wobble 2.8s ease-in-out infinite' }}>
        <path d="M50 6 C 66 6 78 30 78 58 C 78 82 66 94 50 94 C 34 94 22 82 22 58 C 22 30 34 6 50 6 Z" fill="#EDE6D6" stroke="rgba(0,0,0,.12)" strokeWidth={1.5} />
        <g fill="none" stroke="rgba(0,0,0,.1)" strokeWidth={2} strokeLinecap="round">
          <path d="M34 26 Q30 40 36 50" />
          <path d="M64 34 Q70 46 62 58" />
          <path d="M40 62 Q46 72 40 82" />
        </g>
      </g>
    </svg>
  )
}

export function creatureSummary(c: Creature): string {
  return `${c.traits.color} · ${c.traits.body} · ${PERSONALITY_LABEL[c.personality]} · ${c.mutations} 次异变`
}

/** 小管家的对话气泡：左边一个小尖角指向它 */
export function SpeechBubble({ text }: { text: string }) {
  return (
    <div style={{ position: 'relative', background: 'var(--surface)', boxShadow: 'inset 0 0 0 1.5px var(--hair)', borderRadius: 14, padding: '8px 12px', fontSize: 13, lineHeight: 1.45, color: 'var(--ink)' }}>
      <span
        aria-hidden
        style={{ position: 'absolute', left: -6, top: 13, width: 11, height: 11, background: 'var(--surface)', borderLeft: '1.5px solid var(--hair)', borderBottom: '1.5px solid var(--hair)', transform: 'rotate(45deg)' }}
      />
      {text}
    </div>
  )
}
