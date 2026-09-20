import type { Dish } from '../../core/types'
import { D } from './helper'

// 连锁餐饮补充批次（2026-09-20）。
//
// 调研后改了方向：不按品牌建条目，按「品类 × 甜度」建。原因有两条：
//   1. 品牌配方是移动靶——霸王茶姬的伯牙绝弦 2025 年刚做过「8 年来最大升级」；
//   2. 甜度选择对热量的影响（全糖 vs 半糖 vs 无糖，差 30~100%）远大于品牌之间的差异。
// 库里原本只有「珍珠奶茶(全糖) 381 kcal」和「无糖奶茶 66 kcal」，中间三百多千卡是空的，
// 而半糖恰恰是最常点的。这批主要补这个断层。
//
// 品牌名挂在各自招牌品类上（沿用库里「杨国福/张亮 → 麻辣烫」的做法）：搜品牌先给一个起点，
// 具体喝的是什么再改一次搜索就到。把品牌做成独立条目没有意义——同一品牌下甜度差异比品牌差异大。
//
// 热量区间参照公开实测报道（500 ml：常规奶茶 200~350、加料奶茶 400~500、
// 奶盖茶 400~700、果茶 300~450），并与库里已有的珍珠奶茶口径对齐。
export const DISHES_CHAIN: Dish[] = [
  // ===== 奶茶 · 甜度轴 =====
  D('ch_milktea_full', '奶茶(全糖,无小料)', 'drink', 'takeout', 'light', 'LDS', '1杯(约400ml)', [
    ['tea', 300], ['creamer', 20], ['sugar', 30],
  ], { tags: ['sweet', 'caffeine'], aliases: ['全糖奶茶', '奶茶不加料'] }),
  D('ch_milktea_half', '奶茶(半糖,无小料)', 'drink', 'takeout', 'light', 'LDS', '1杯(约400ml)', [
    ['tea', 300], ['creamer', 20], ['sugar', 15],
  ], { tags: ['sweet', 'caffeine'], aliases: ['半糖奶茶', '五分糖奶茶', '少糖奶茶', '古茗', '茶百道', '沪上阿姨', '甜啦啦', '书亦烧仙草'] }),
  D('ch_bubble_tea_half', '珍珠奶茶(半糖)', 'drink', 'takeout', 'light', 'LDS', '1杯(约410ml)', [
    ['tea', 300], ['creamer', 20], ['sugar', 15], ['tapioca_pearls', 60],
  ], { tags: ['sweet', 'caffeine'], aliases: ['半糖珍珠奶茶', '珍珠奶茶少糖'] }),
  D('ch_jasmine_milk_tea', '茉莉奶绿(鲜奶茶)', 'drink', 'takeout', 'light', 'LDS', '1杯(约470ml)', [
    ['tea', 250], ['milk', 200], ['sugar', 20],
  ], { tags: ['sweet', 'caffeine'], aliases: ['伯牙绝弦', '霸王茶姬', '茉莉奶茶', '鲜奶茶', '原叶鲜奶茶', '茉莉奶绿'] }),

  // ===== 果茶 =====
  D('ch_lemon_water', '鲜榨柠檬水(全糖)', 'drink', 'takeout', 'light', 'LDS', '1杯(约500ml)', [
    ['tea', 350], ['lemon', 30], ['sugar', 45],
  ], { tags: ['sweet'], aliases: ['柠檬水', '蜜雪冰城', '蜜雪', '冰鲜柠檬水', '柠檬茶'] }),
  D('ch_grape_tea', '多肉葡萄(无奶盖)', 'drink', 'takeout', 'light', 'LDS', '1杯(约500ml)', [
    ['tea', 250], ['grape', 150], ['sugar', 25],
  ], { tags: ['sweet'], aliases: ['多肉葡萄', '喜茶', '奈雪', '奈雪的茶', '鲜果茶', '葡萄果茶'] }),
  D('ch_ice_cream_cone', '冰淇淋甜筒', 'snack', 'takeout', 'light', 'S', '1个(约100g)', [
    ['ice_cream', 100],
  ], { tags: ['sweet'], aliases: ['甜筒', '圣代', '蜜雪冰淇淋'] }),

  // ===== 连锁正餐：与家常版营养上确实不同的 =====
  // 餐馆版酸菜鱼油和汤都远多于家常版（库里的「酸菜鱼」是家常口径）
  D('ch_suancaiyu_restaurant', '酸菜鱼(餐厅一人份)', 'combo', 'takeout', 'heavy', 'LD', '1人份(约500g)', [
    ['fish_freshwater', 200], ['sauerkraut', 100], ['oil', 28], ['broth', 200], ['chili_fresh', 10], ['sichuan_pepper', 2], ['starch', 8], ['salt', 1],
  ], { tags: ['spicy'], aliases: ['太二酸菜鱼', '餐厅酸菜鱼', '老坛酸菜鱼'] }),
  D('ch_herbal_noodle', '草本汤面(连锁面馆)', 'combo', 'takeout', 'normal', 'LD', '1碗(约550g)', [
    ['noodles_cooked', 220], ['pork_ribs', 70], ['bok_choy', 60], ['broth', 300], ['oil', 8], ['salt', 1.5],
  ], { aliases: ['和府捞面', '草本汤面', '养生汤面'] }),
  // 莜面即燕麦面，成分与燕麦接近（~380 kcal / 蛋白 15 g），库里用 oats 作基底近似
  D('ch_youmian', '莜面鱼鱼(一人份)', 'combo', 'takeout', 'normal', 'LD', '1份(约400g)', [
    ['oats', 110], ['tomato', 80], ['pork_ground', 50], ['oil', 10], ['soy_sauce_light', 8], ['salt', 0.5],
  ], { aliases: ['西贝莜面', '莜面', '莜面栲栳栳'] }),
]
