import { useState } from 'react'
import type { Creature, RetiredCreature } from '../core/creature'
import { PERSONALITY_LABEL } from '../core/creature'
import { CreatureView, EggView } from './Creature'
import { Fold } from './bits'

/** 「我的」页：当前的健康小管家、回炉重造，与历史生物的最终形象 */
export function CreatureCard({ creature, history, onReforge }: {
  creature: Creature | null
  history: RetiredCreature[]
  onReforge: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="card">
      <h2>健康小管家</h2>
      <div className="row" style={{ gap: 14, alignItems: 'center' }}>
        {creature ? <CreatureView traits={creature.traits} size={88} /> : <EggView size={88} />}
        <div className="grow stack" style={{ gap: 8 }}>
          <p className="small muted">{creature ? `性格「${PERSONALITY_LABEL[creature.personality]}」，已经异变 ${creature.mutations} 次，每记一笔（三餐或喝水）都会再变一点。` : '记第一笔（三餐或喝水）就会孵化，长什么样、性格是什么都是随机的。'}</p>
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
            {[...history].reverse().map((c) => (
              <div key={c.id} style={{ textAlign: 'center' }}>
                <CreatureView traits={c.traits} size={56} />
                <div className="tiny muted">{PERSONALITY_LABEL[c.personality]} · {c.mutations} 次</div>
              </div>
            ))}
          </div>
        </Fold>
      )}
    </div>
  )
}
