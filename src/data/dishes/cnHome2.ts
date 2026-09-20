import type { Dish } from '../../core/types'
import { D } from './helper'

// 缺口补充批次二（2026-09-20）。来源是两次实测而不是拍脑袋：
//   · 正向：npm run hitrate 拿 235 个常见食物名测搜索，14 个零结果
//   · 反向：npm run dishgaps 从现有菜名挖命名模式，86 条候选里人眼挑出 8 条
//   · 外部：下厨房热搜 TOP100 里的真实高频词，22 个测出 2 道真缺（双皮奶、蛋包饭）
// 份量与油盐口径同 cnMain.ts / cnHome.ts。
// validate 下 cnh2_latiao 的钠 1125 mg 是**有意保留**的：辣条本身就是 ~2500 mg/100 g，
// 一包 45 g 就这么咸，不是调味写多了。
export const DISHES_CN_HOME2: Dish[] = [
  // ===== 反向组合挖出的家常菜 =====
  D('cnh2_luobo_paigu_tang', '萝卜排骨汤', 'soup', 'cn', 'normal', 'LD', '1碗(约400g)', [
    ['pork_ribs', 85], ['white_radish', 150], ['broth', 320], ['ginger', 5], ['salt', 0.8],
  ], { tags: ['stew'], aliases: ['白萝卜排骨汤', '排骨萝卜汤'] }),
  D('cnh2_liangban_fanqie', '凉拌番茄', 'veg', 'cn', 'light', 'LD', '1盘(约210g)', [
    ['tomato', 200], ['sugar', 10],
  ], { tags: ['cold', 'sweet'], aliases: ['糖拌西红柿', '糖拌番茄', '凉拌西红柿'] }),
  D('cnh2_hongshao_niunan', '红烧牛腩', 'protein', 'cn', 'heavy', 'LD', '1碗(约170g)', [
    ['beef_brisket', 120], ['oil', 8], ['soy_sauce_light', 8], ['soy_sauce_dark', 4], ['sugar', 6], ['cooking_wine', 8], ['ginger', 5], ['star_anise', 1],
  ], { tags: ['stew'], aliases: ['红烧牛肉', '家常红烧牛腩'] }),
  D('cnh2_hongshao_yangrou', '红烧羊肉', 'protein', 'cn', 'heavy', 'LD', '1碗(约170g)', [
    ['lamb', 120], ['oil', 8], ['soy_sauce_light', 6], ['soy_sauce_dark', 3], ['sugar', 5], ['cooking_wine', 8], ['ginger', 5],
  ], { tags: ['stew'], aliases: ['红烧羊肉块'] }),
  D('cnh2_fanqie_chaorou', '番茄炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约240g)', [
    ['tomato', 150], ['pork_lean', 80], ['oil', 10], ['sugar', 3], ['salt', 0.8],
  ], { tags: ['quick'], aliases: ['西红柿炒肉', '番茄炒肉片'] }),
  D('cnh2_luobo_chaorou', '白萝卜炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约260g)', [
    ['white_radish', 180], ['pork_lean', 70], ['oil', 10], ['soy_sauce_light', 8], ['salt', 0.3],
  ], { aliases: ['萝卜炒肉', '萝卜丝炒肉'] }),
  D('cnh2_nangua_chaodan', '南瓜炒蛋', 'protein', 'cn', 'normal', 'LD', '1盘(约260g)', [
    ['pumpkin', 150], ['egg', 100], ['oil', 12], ['salt', 1.2],
  ], { aliases: ['南瓜炒鸡蛋'] }),

  // ===== 正向测出的零结果 =====
  D('cnh2_hongshao_daiyu', '红烧带鱼', 'protein', 'cn', 'normal', 'LD', '1盘(约180g)', [
    ['fish_sea', 150], ['oil', 12], ['soy_sauce_light', 6], ['soy_sauce_dark', 2], ['sugar', 6], ['cooking_wine', 8], ['ginger', 5],
  ], { aliases: ['干烧带鱼', '家常带鱼'] }),
  D('cnh2_tieban_niurou', '铁板牛肉', 'protein', 'cn', 'heavy', 'LD', '1盘(约250g)', [
    ['beef_lean', 120], ['onion', 60], ['green_pepper', 50], ['oil', 12], ['black_pepper_sauce', 10], ['oyster_sauce', 6],
  ], { aliases: ['铁板烧', '黑椒铁板牛肉'] }),
  D('cnh2_shuangpinai', '双皮奶', 'snack', 'cn', 'light', 'S', '1碗(约250g)', [
    ['milk', 200], ['egg_white', 40], ['sugar', 18],
  ], { tags: ['sweet'], aliases: ['港式双皮奶', '姜撞奶'] }),
  D('cnh2_danbaofan', '蛋包饭', 'combo', 'cn', 'normal', 'LD', '1份(约400g)', [
    ['rice_cooked', 200], ['egg', 100], ['chicken_breast', 50], ['onion', 30], ['ketchup', 20], ['oil', 10],
  ], { aliases: ['日式蛋包饭', '番茄蛋包饭'] }),
  D('cnh2_paofu', '泡芙(1个)', 'snack', 'west', 'normal', 'S', '1个(约70g)', [
    ['flour', 15], ['butter', 8], ['egg', 18], ['cream', 25], ['sugar', 6],
  ], { tags: ['sweet'], aliases: ['奶油泡芙'] }),

  // ===== 零食与饮料：食材库里有、却没有对应可记录条目 =====
  D('cnh2_peanut_snack', '炒花生(一小把)', 'snack', 'cn', 'normal', 'S', '一小把(约25g)', [
    ['peanut', 25],
  ], { aliases: ['花生', '花生米', '油炸花生'] }),
  D('cnh2_latiao', '辣条(1包)', 'snack', 'cn', 'normal', 'S', '1包(约45g)', [
    ['latiao', 45],
  ], { tags: ['spicy'], aliases: ['辣条', '卫龙'] }),
  D('cnh2_jelly', '果冻(1个)', 'snack', 'cn', 'light', 'S', '1个(约100g)', [
    ['jelly', 100],
  ], { tags: ['sweet'], aliases: ['果冻'] }),
  D('cnh2_cheese_stick', '奶酪棒(2根)', 'snack', 'west', 'light', 'S', '2根(约30g)', [
    ['cheese', 30],
  ], { aliases: ['奶酪棒', '芝士棒', '儿童奶酪'] }),
  D('cnh2_cornflakes_milk', '玉米片配牛奶', 'breakfast', 'west', 'light', 'B', '1碗(约240g)', [
    ['cereal_flakes', 40], ['milk', 200],
  ], { aliases: ['玉米片', '谷物圈牛奶'] }),
  D('cnh2_sprite', '雪碧(1罐)', 'drink', 'cn', 'light', 'BLDS', '1罐(330ml)', [
    ['soda_lemon', 330],
  ], { tags: ['sweet'], aliases: ['雪碧', '七喜', '柠檬汽水', '汽水'] }),

  // ===== 外卖 =====
  D('cnh2_kfc_bucket', '肯德基全家桶(1人份)', 'combo', 'takeout', 'fried', 'LD', '1人份(约全桶 1/4)', [
    ['fried_chicken', 150], ['chicken_wing', 80], ['fries', 70], ['cola', 200],
  ], { aliases: ['全家桶', '肯德基全家桶'] }),
]
