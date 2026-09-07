import type { Dish } from '../../core/types'
import { DISHES_SAMPLE } from './sample'
import { DISHES_CN_MAIN } from './cnMain'
import { DISHES_STAPLES_MORE } from './staplesAndMore'
import { DISHES_WEST_TAKEOUT } from './westTakeout'
import { DISHES_CN_MORE } from './cnMore'
import { DISHES_TAKEOUT_MORE } from './takeout2'
import { DISHES_CONVENIENCE_MORE } from './convenience2'

// 各分组文件在此汇总；新增分组时在下方 concat
export const DISHES: Dish[] = [
  ...DISHES_SAMPLE,
  ...DISHES_CN_MAIN,
  ...DISHES_STAPLES_MORE,
  ...DISHES_WEST_TAKEOUT,
  ...DISHES_CN_MORE,
  ...DISHES_TAKEOUT_MORE,
  ...DISHES_CONVENIENCE_MORE,
]

export const DISH_MAP: Map<string, Dish> = new Map(DISHES.map((d) => [d.id, d]))
