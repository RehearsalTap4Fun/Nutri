import type { Dish } from '../../core/types'
import { D } from './helper'

// 示例：写法与份量标定基准。正式菜品分组见同目录其他文件。
export const DISHES_SAMPLE: Dish[] = [
  D('cn_tomato_egg', '番茄炒蛋', 'protein', 'cn', 'normal', 'LD', '1盘(约270g)', [
    ['tomato', 150], ['egg', 100], ['oil', 10], ['sugar', 3], ['salt', 1.5], ['scallion', 5],
  ], { aliases: ['西红柿炒鸡蛋'] }),
  D('cn_stirfry_bokchoy', '清炒小白菜', 'veg', 'cn', 'light', 'LD', '1盘(约200g)', [
    ['bok_choy', 200], ['oil', 6], ['garlic', 5], ['salt', 1.5],
  ], { aliases: ['炒青菜'] }),
  D('st_rice', '白米饭', 'staple', 'cn', 'light', 'LD', '1碗(约200g)', [['rice_cooked', 200]]),
  D('bf_egg_boiled', '水煮蛋', 'breakfast', 'cn', 'light', 'BS', '1个(约50g)', [['egg', 50]], { aliases: ['白煮蛋', '煮鸡蛋'] }),
]
