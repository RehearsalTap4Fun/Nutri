import { useMemo, useState } from 'react'
import type { Creature, RetiredCreature } from '../core/creature'
import { PERSONALITY_LABEL } from '../core/creature'
import { CAT_NAMES, PIXEL_CAT_DISPLAY, PIXEL_CAT_SIZE, PIXEL_CAT_TRIAL, catForCreature, describeCat } from '../core/pixelcat'
import { CreatureView, EggView } from './Creature'
import { PixelCatView } from './PixelCat'
import { Fold } from './bits'

/** 一只历史小管家的缩略图：像素猫按 1 倍原生尺寸显示，SVG 版保持原来的 56px */
function HistoryThumb({ c }: { c: RetiredCreature }) {
  const cat = useMemo(() => (PIXEL_CAT_TRIAL ? catForCreature(c) : null), [c])
  return (
    <div style={{ textAlign: 'center' }}>
      {cat ? <PixelCatView spec={cat} size={PIXEL_CAT_SIZE} /> : <CreatureView traits={c.traits} size={56} />}
      <div className="tiny muted">{cat ? `${CAT_NAMES[cat.coat]} · ` : ''}{PERSONALITY_LABEL[c.personality]} · {c.mutations} 次</div>
    </div>
  )
}

/** 「我的」页：当前的健康小管家、回炉重造，与历史生物的最终形象 */
export function CreatureCard({ creature, history, onReforge }: {
  creature: Creature | null
  history: RetiredCreature[]
  onReforge: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  // 像素猫试验：与今日页同一套推导，这里没有当日信号，心情固定中性
  const cat = useMemo(() => (PIXEL_CAT_TRIAL && creature ? catForCreature(creature) : null), [creature])
  const intro = creature
    ? `${cat ? `${describeCat(cat)}，` : ''}性格「${PERSONALITY_LABEL[creature.personality]}」，已经异变 ${creature.mutations} 次，每记一笔（三餐或喝水）都会再长一点，只进不退。`
    : '记第一笔（三餐或喝水）就会孵化，长什么样、性格是什么都是随机的。'
  return (
    <div className="card">
      <h2>健康小管家</h2>
      <div className="row" style={{ gap: 14, alignItems: 'center' }}>
        {creature
          ? (cat ? <PixelCatView spec={cat} /> : <CreatureView traits={creature.traits} size={88} />)
          : <EggView size={PIXEL_CAT_TRIAL ? PIXEL_CAT_DISPLAY : 88} />}
        <div className="grow stack" style={{ gap: 8 }}>
          <p className="small muted">{intro}</p>
          {creature && (
            !confirm ? <button className="btn ghost sm" onClick={() => setConfirm(true)}>回炉重造</button> : (
              <span className="row wrap"><span className="small">现在这只会存进下面的历史，换一颗新蛋？</span><button className="btn danger sm" onClick={() => { onReforge(); setConfirm(false) }}>确定</button><button className="btn sm" onClick={() => setConfirm(false)}>取消</button></span>
            )
          )}
        </div>
      </div>
      {history.length > 0 && (
        <Fold summary={`历史 ${history.length} 只`}>
          <div className="row wrap" style={{ gap: 14 }}>
            {[...history].reverse().map((c) => <HistoryThumb key={c.id} c={c} />)}
          </div>
        </Fold>
      )}
    </div>
  )
}
