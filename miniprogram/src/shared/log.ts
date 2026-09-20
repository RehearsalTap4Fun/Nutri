/**
 * 喂小管家：还没孵化就孵化，已孵化就异变一个部位，同时把新出现的部件与新达成的称号记进图鉴。
 *
 * 触发它的不止「记一餐」。网页版里**喝水增加时也会喂一次**，所以这里把「喂」和
 * 「写记录」拆开：`bumpCreature` 只喂，`logEntry` 是写记录再喂。
 */
import type { LogEntry } from '@core/types'
import { hatch, mutate } from '@core/creature'
import { recordSpec } from '@core/catDex'
import { newTitles } from '@core/catTitles'
import { catDiff } from '@core/pixelcat'
import { makeRng, hashString } from '@core/rng'
import type { AppState } from './state'
import { uid } from './state'

export interface LogResult {
  /** 形象发生的变化，用来给一句提示；没变化时是 null */
  change: string | null
  /** 这一笔之后新达成的称号 */
  titles: string[]
  hatched: boolean
}

type Update = (fn: (s: AppState) => AppState) => void

/**
 * 只喂，不写记录。`extra` 可以在同一次状态更新里捎带别的改动，
 * 这样喝水那种「改记录 + 喂一次」不会分成两次更新。
 *
 * 注意 update 的回调可能被调用多次，所以随机种子在外面先定好。
 */
export function bumpCreature(
  update: Update,
  extra?: (s: AppState) => Partial<AppState>,
): LogResult {
  const now = Date.now()
  const rnd = makeRng(hashString(uid() + now))
  const result: LogResult = { change: null, titles: [], hatched: false }

  update((s) => {
    const prev = s.creature
    const next = prev ? mutate(prev, now, rnd) : hatch(uid(), now, rnd)
    result.hatched = !prev
    result.change = prev ? catDiff(prev.cat, next.cat) : null
    result.titles = newTitles(prev ? prev.cat : null, next.cat)
    return {
      ...s,
      ...(extra ? extra(s) : {}),
      creature: next,
      creatureDex: recordSpec(s.creatureDex, prev ? prev.cat : null, next.cat),
    }
  })

  return result
}

/** 写入一条记录并喂一次。返回值用于提示 */
export function logEntry(update: Update, entry: Omit<LogEntry, 'id' | 'updatedAt'>): LogResult {
  return bumpCreature(update, (s) => ({
    entries: [...s.entries, { ...entry, id: uid(), updatedAt: Date.now() }],
  }))
}
