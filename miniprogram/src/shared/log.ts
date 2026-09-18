/**
 * 记一笔 = 写入记录 + 喂一次小管家。
 *
 * 网页版把这两件事绑在 `noticeAfterLog` 里，小程序有两个入口（记录页搜出来记、
 * 计划页一键补记），所以抽出来，保证两边行为一致：还没孵化就孵化，已孵化就异变一个部位，
 * 同时把新出现的部件和新达成的称号记进图鉴。
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

/**
 * 写入一条记录并推进小管家。返回值用于提示，状态更新走传入的 update。
 * 注意 update 的回调可能被调用多次，所以随机种子在外面先定好。
 */
export function logEntry(
  update: (fn: (s: AppState) => AppState) => void,
  entry: Omit<LogEntry, 'id' | 'updatedAt'>,
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
      entries: [...s.entries, { ...entry, id: uid(), updatedAt: now }],
      creature: next,
      creatureDex: recordSpec(s.creatureDex, prev ? prev.cat : null, next.cat),
    }
  })

  return result
}
