import { useState } from 'react'
import type { Creature, RetiredCreature } from '../core/creature'
import { PERSONALITY_LABEL } from '../core/creature'
import {
  CAT_LINE_NAMES, CAT_LINES, CAT_NAMES, MUTATION_SLOTS, PIXEL_CAT_DISPLAY, PIXEL_CAT_SIZE, PIXEL_CAT_TRIAL,
  CAT_SLOT_NAMES, TIER_NAMES, CAT_TIER, describeCat, isFullyGrown, type CatSpec,
} from '../core/pixelcat'
import { CAT_TITLES, titlesFor } from '../core/catTitles'
import { dexOwned, dexTotals, type CatDex } from '../core/catDex'
import { CreatureView, EggView } from './Creature'
import { PixelCatView } from './PixelCat'
import { Fold } from './bits'

/** 一只历史小管家的缩略图：像素猫按 1 倍原生尺寸显示，SVG 版保持原来的 56px */
function HistoryThumb({ c }: { c: RetiredCreature }) {
  const cat = PIXEL_CAT_TRIAL ? c.cat : null
  const titles = cat ? titlesFor(cat) : []
  return (
    <div style={{ textAlign: 'center' }}>
      {cat ? <PixelCatView spec={cat} size={PIXEL_CAT_SIZE} /> : <CreatureView traits={c.traits} size={56} />}
      <div className="tiny muted">{cat ? `${CAT_NAMES[cat.coat]} · ` : ''}{PERSONALITY_LABEL[c.personality]} · {c.mutations} 次</div>
      {titles.length > 0 && <div className="tiny" style={{ color: 'var(--accent)' }}>{titles.map((id) => CAT_TITLES.find((t) => t.id === id)?.name).join(' ')}</div>}
    </div>
  )
}

/** 称号：达成的显示名字，未达成的显示凑法 */
function TitleList({ dex, current }: { dex: CatDex; current: CatSpec | null }) {
  const now = new Set(current ? titlesFor(current) : [])
  return (
    <div className="stack" style={{ gap: 6 }}>
      {CAT_TITLES.map((t) => {
        const times = dex.titles[t.id] ?? 0
        const owned = times > 0
        return (
          <div key={t.id} className="row" style={{ gap: 8, alignItems: 'baseline' }}>
            <span className="small" style={{ flex: 'none', minWidth: 44, color: owned ? 'var(--ink)' : 'var(--muted)', fontWeight: owned ? 600 : 400 }}>
              {owned ? t.name : '？？'}
            </span>
            <span className="tiny muted grow">{t.hint}</span>
            {now.has(t.id) && <span className="tiny" style={{ flex: 'none', color: 'var(--accent)' }}>现在就是</span>}
            {owned && <span className="tiny muted" style={{ flex: 'none' }}>{times} 只</span>}
          </div>
        )
      })}
    </div>
  )
}

/** 部件图鉴：按 槽位 × 链 × 阶 排格，收集到的显示名字与只数，没收集到的留空位 */
function PartDex({ dex, current }: { dex: CatDex; current: CatSpec | null }) {
  return (
    <div className="stack" style={{ gap: 10 }}>
      {MUTATION_SLOTS.map((slot) => (
        <div key={slot}>
          <div className="tiny muted" style={{ marginBottom: 4 }}>{CAT_SLOT_NAMES[slot]}</div>
          <div className="stack" style={{ gap: 4 }}>
            {Object.entries(CAT_LINES[slot]).map(([line, parts]) => (
              <div key={line} className="row wrap" style={{ gap: 6, alignItems: 'center' }}>
                <span className="tiny muted" style={{ flex: 'none', minWidth: 28 }}>{CAT_LINE_NAMES[line] ?? line}</span>
                {parts.map((part) => {
                  const times = dex.parts[part] ?? 0
                  const owned = times > 0
                  const onNow = current ? MUTATION_SLOTS.some((s) => current[s] === part) : false
                  return (
                    <span
                      key={part}
                      className="tiny"
                      title={`${CAT_NAMES[part]} · ${TIER_NAMES[CAT_TIER[part]]}${owned ? ` · 出现过 ${times} 只` : ' · 还没见过'}`}
                      style={{
                        flex: 'none', padding: '3px 10px', borderRadius: 'var(--r-pill)',
                        boxShadow: `inset 0 0 0 1.5px ${onNow ? 'var(--ink)' : 'var(--hair)'}`,
                        color: owned ? 'var(--ink)' : 'var(--muted)',
                        background: owned ? 'var(--surface)' : 'transparent',
                      }}
                    >
                      {owned ? CAT_NAMES[part] : '？'}{owned && times > 1 ? ` ×${times}` : ''}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** 「我的」页：当前的健康小管家、毕业换一只，与图鉴 */
export function CreatureCard({ creature, history, dex, onReforge }: {
  creature: Creature | null
  history: RetiredCreature[]
  dex: CatDex
  onReforge: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const cat = PIXEL_CAT_TRIAL && creature ? creature.cat : null
  const grown = cat ? isFullyGrown(cat) : false
  const owned = dexOwned(dex)
  const totals = dexTotals()
  const intro = creature
    ? `${cat ? `${describeCat(cat)}，` : ''}性格「${PERSONALITY_LABEL[creature.personality]}」，已经异变 ${creature.mutations} 次。`
    : '记第一笔（三餐或喝水）就会孵化，长什么样、性格是什么都是随机的。'
  return (
    <div className="card">
      <h2>健康小管家</h2>
      <div className="row" style={{ gap: 14, alignItems: 'center' }}>
        {creature
          ? (cat ? <PixelCatView spec={cat} /> : <CreatureView traits={creature.traits} size={88} />)
          : <EggView size={PIXEL_CAT_TRIAL ? PIXEL_CAT_DISPLAY : 88} />}
        <div className="grow stack" style={{ gap: 8 }}>
          <p className="small muted">{intro}{creature && !grown && ' 每记一笔都会再长一点，只进不退。'}</p>
          {grown && <p className="small">已经长齐了，可以让它毕业，换一只新的来陪你。</p>}
          {creature && (
            !confirm
              ? <button className="btn ghost sm" onClick={() => setConfirm(true)}>{grown ? '让它毕业' : '提前毕业'}</button>
              : (
                <span className="row wrap"><span className="small">现在这只会存进图鉴，换一颗新蛋？</span><button className="btn danger sm" onClick={() => { onReforge(); setConfirm(false) }}>确定</button><button className="btn sm" onClick={() => setConfirm(false)}>取消</button></span>
              )
          )}
        </div>
      </div>

      <Fold summary={`图鉴 · 部件 ${owned.parts}/${totals.parts} · 称号 ${owned.titles}/${totals.titles}`}>
        <div className="stack" style={{ gap: 14 }}>
          <PartDex dex={dex} current={cat} />
          <div>
            <div className="tiny muted" style={{ marginBottom: 4 }}>称号</div>
            <TitleList dex={dex} current={cat} />
          </div>
          {history.length > 0 && (
            <div>
              <div className="tiny muted" style={{ marginBottom: 6 }}>毕业的 {history.length} 只</div>
              <div className="row wrap" style={{ gap: 14 }}>
                {[...history].reverse().map((c) => <HistoryThumb key={c.id} c={c} />)}
              </div>
            </div>
          )}
        </div>
      </Fold>
    </div>
  )
}
