import type { Dish } from '../../core/types'
import { D } from './helper'

// 地方小吃与中式正餐连锁（2026-09-20）。
//
// 候选来自公开的「各地名小吃」盘点与连锁品牌招牌菜报道，再与库里逐条对差集，
// 只补真缺的。按「会不会被记录」筛过一轮：豆汁、烤脑花、炸鸡架这类地域极窄、
// 频次极低的没有收；米皮并入凉皮的别名，不单列。
//
// 连锁部分只收品牌独有且高频的招牌。这些店的菜单大半本来就是地方经典菜
// （外婆红烧肉就是红烧肉、太二酸菜鱼已在 chain.ts），重复建条目没有意义。
export const DISHES_STREET_CHAIN: Dish[] = [
  // ===== 街头小吃 · 主食类 =====
  D('st_lvrou_huoshao', '驴肉火烧', 'combo', 'takeout', 'normal', 'BLD', '1个(约180g)', [
    ['flour', 90], ['donkey_meat', 60], ['oil', 8], ['green_pepper', 15], ['salt', 0.8],
  ], { aliases: ['河间驴肉火烧', '保定驴肉火烧'] }),
  D('st_jidan_guanbing', '鸡蛋灌饼', 'combo', 'takeout', 'normal', 'B', '1个(约200g)', [
    ['flour', 85], ['egg', 55], ['oil', 14], ['lettuce', 20], ['sweet_bean_sauce', 8], ['chili_sauce', 5],
  ], { aliases: ['灌饼', '鸡蛋饼(灌饼)'] }),
  D('st_guokui', '锅盔', 'staple', 'takeout', 'normal', 'BLD', '1个(约150g)', [
    ['flour', 100], ['oil', 12], ['sesame', 4], ['salt', 1],
  ], { aliases: ['军屯锅盔', '荆州锅盔', '烧饼(锅盔)'] }),
  D('st_tudoufen', '土豆粉', 'combo', 'takeout', 'heavy', 'LD', '1碗(约500g)', [
    ['potato_noodle', 250], ['pork_ground', 40], ['bok_choy', 60], ['broth', 250], ['chili_oil', 15], ['soy_sauce_light', 10], ['peanut', 8],
  ], { tags: ['spicy'], aliases: ['砂锅土豆粉', '麻辣土豆粉'] }),
  D('st_huajia_fen', '花甲粉', 'combo', 'takeout', 'heavy', 'LD', '1碗(约520g)', [
    ['rice_noodles_cooked', 200], ['clam', 120], ['broth', 250], ['chili_oil', 12], ['soy_sauce_light', 10], ['garlic', 8], ['scallion', 6],
  ], { tags: ['spicy'], aliases: ['花甲米线', '海鲜粉'] }),

  // ===== 街头小吃 · 炸烤串类 =====
  D('st_chou_doufu', '长沙臭豆腐(6块)', 'snack', 'takeout', 'fried', 'S', '6块(约120g)', [
    ['tofu', 90], ['oil', 16], ['chili_sauce', 12], ['garlic', 5],
  ], { tags: ['spicy'], aliases: ['臭豆腐', '油炸臭豆腐', '黑色臭豆腐'] }),
  D('st_langya_tudou', '狼牙土豆', 'snack', 'takeout', 'fried', 'S', '1份(约180g)', [
    ['potato', 150], ['oil', 18], ['chili_powder', 4], ['sichuan_pepper', 1], ['coriander', 6], ['salt', 1],
  ], { tags: ['spicy'], aliases: ['狼牙薯条', '炸土豆'] }),
  D('st_kao_mianjin', '烤面筋(2串)', 'snack', 'takeout', 'normal', 'S', '2串(约110g)', [
    ['wheat_gluten', 90], ['oil', 8], ['chili_powder', 3], ['cumin', 1.5], ['salt', 0.8],
  ], { tags: ['spicy'], aliases: ['烤面筋', '面筋串'] }),
  D('st_zhachuan', '炸串(5串)', 'snack', 'takeout', 'fried', 'S', '5串(约180g)', [
    ['potato', 60], ['pork_lean', 40], ['tofu_dried', 30], ['oil', 22], ['chili_powder', 3], ['cumin', 1.5], ['salt', 1],
  ], { tags: ['spicy'], aliases: ['炸串', '油炸串串'] }),
  D('st_bobo_ji', '钵钵鸡(10串)', 'snack', 'takeout', 'heavy', 'LDS', '10串(约230g)', [
    ['chicken_breast', 70], ['lotus_root', 40], ['wood_ear', 30], ['soy_sprouts', 40], ['chili_oil', 20], ['sesame', 4], ['soy_sauce_light', 8],
  ], { tags: ['spicy', 'cold'], aliases: ['钵钵鸡', '冷串串'] }),
  D('st_lengguo_chuanchuan', '冷锅串串(一人份)', 'combo', 'takeout', 'heavy', 'LD', '1份(约400g)', [
    ['pork_lean', 60], ['tofu_dried', 40], ['potato', 60], ['soy_sprouts', 60], ['lotus_root', 40], ['hotpot_base', 20], ['broth', 150], ['chili_oil', 12],
  ], { tags: ['spicy'], aliases: ['串串香', '冷锅串串'] }),

  // ===== 街头小吃 · 京味 =====
  D('st_luzhu', '卤煮火烧', 'combo', 'takeout', 'heavy', 'LD', '1碗(约400g)', [
    ['pork_intestine', 70], ['tofu_puff', 40], ['flour', 70], ['broth', 250], ['chili_oil', 10], ['soy_sauce_light', 10], ['garlic', 5],
  ], { tags: ['spicy'], aliases: ['卤煮', '北京卤煮'] }),
  D('st_chaogan', '炒肝(1碗)', 'snack', 'takeout', 'normal', 'B', '1碗(约280g)', [
    ['pork_liver', 60], ['pork_intestine', 50], ['starch', 20], ['broth', 180], ['garlic', 10], ['soy_sauce_light', 8],
  ], { aliases: ['炒肝', '北京炒肝'] }),

  // ===== 街头小吃 · 甜口 =====
  D('st_tanghulu', '冰糖葫芦(1串)', 'snack', 'takeout', 'light', 'S', '1串(约110g)', [
    ['hawthorn', 80], ['sugar', 28],
  ], { tags: ['sweet'], aliases: ['糖葫芦', '冰糖葫芦'] }),
  D('st_tangyou_baba', '糖油粑粑(4个)', 'snack', 'takeout', 'fried', 'S', '4个(约130g)', [
    ['glutinous_rice_raw', 70], ['sugar', 22], ['oil', 12],
  ], { tags: ['sweet'], aliases: ['糖油粑粑', '长沙糖油粑粑'] }),
  D('st_lvdagun', '驴打滚(3块)', 'snack', 'cn', 'light', 'S', '3块(约120g)', [
    ['glutinous_rice_raw', 55], ['red_beans_dry', 25], ['sugar', 15], ['soybeans_dry', 8],
  ], { tags: ['sweet'], aliases: ['驴打滚', '豆面卷子'] }),
  D('st_maqiu', '麻球(2个)', 'snack', 'cn', 'fried', 'S', '2个(约110g)', [
    ['glutinous_rice_raw', 55], ['red_beans_dry', 20], ['sugar', 12], ['sesame', 6], ['oil', 14],
  ], { tags: ['sweet'], aliases: ['麻团', '煎堆', '麻球'] }),
  D('st_doufuhua_sweet', '豆腐花(甜)', 'snack', 'cn', 'light', 'BS', '1碗(约300g)', [
    ['tofu_pudding', 260], ['sugar', 18],
  ], { tags: ['sweet'], aliases: ['甜豆花', '豆花', '甜豆腐脑'] }),
  D('st_shaoxiancao', '烧仙草', 'drink', 'takeout', 'light', 'LDS', '1杯(约500ml)', [
    ['grass_jelly', 150], ['tea', 180], ['milk', 100], ['sugar', 22], ['tapioca_pearls', 30], ['peanut', 8],
  ], { tags: ['sweet'], aliases: ['烧仙草', '仙草冻奶茶', '书亦烧仙草'] }),

  // ===== 中式正餐连锁的招牌 =====
  D('ch_niudagu', '牛大骨(1根)', 'protein', 'takeout', 'normal', 'LD', '1根(可食部约160g)', [
    ['beef_shank', 150], ['soy_sauce_light', 8], ['cooking_wine', 8], ['ginger', 5], ['star_anise', 1],
  ], { tags: ['stew'], aliases: ['西贝牛大骨', '酱牛大骨'] }),
  D('ch_huang_momo', '黄馍馍(1个)', 'staple', 'takeout', 'light', 'BS', '1个(约120g)', [
    ['millet_raw', 55], ['red_dates', 20], ['red_beans_dry', 15], ['sugar', 5],
  ], { tags: ['sweet'], aliases: ['黄馍馍', '黄米馍馍'] }),
  D('ch_chaxiang_ji', '茶香鸡(1/4只)', 'protein', 'takeout', 'light', 'LD', '1/4只(约180g)', [
    ['chicken_whole', 170], ['tea', 20], ['soy_sauce_light', 8], ['ginger', 5], ['salt', 0.5],
  ], { aliases: ['外婆家茶香鸡', '茶香鸡'] }),
  D('ch_mianbao_youhuo', '面包诱惑', 'snack', 'takeout', 'heavy', 'S', '1份(约220g)', [
    ['bread_white', 90], ['ice_cream', 80], ['honey', 20], ['butter', 12],
  ], { tags: ['sweet'], aliases: ['绿茶面包诱惑', '面包诱惑', '绿茶餐厅'] }),
  D('ch_chou_guiyu', '臭鳜鱼(一人份)', 'protein', 'takeout', 'heavy', 'LD', '1人份(约220g)', [
    ['fish_freshwater', 180], ['pork_belly', 20], ['oil', 16], ['soy_sauce_light', 10], ['doubanjiang', 6], ['garlic', 6],
  ], { tags: ['spicy'], aliases: ['徽州臭鳜鱼', '臭鳜鱼', '腌鲜鳜鱼', '小菜园'] }),
  D('ch_laomuji_tang', '老母鸡汤', 'soup', 'takeout', 'light', 'LD', '1碗(约400g)', [
    ['chicken_whole', 120], ['broth', 300], ['ginger', 5], ['salt', 1.2],
  ], { tags: ['stew'], aliases: ['肥西老母鸡汤', '老乡鸡鸡汤', '土鸡汤'] }),
  D('ch_mao_doufu', '毛豆腐(一人份)', 'protein', 'takeout', 'fried', 'LD', '1份(约180g)', [
    ['tofu', 140], ['oil', 18], ['chili_sauce', 12], ['scallion', 6],
  ], { tags: ['spicy'], aliases: ['虎皮毛豆腐', '毛豆腐', '徽州毛豆腐'] }),
  D('ch_xiandanhuang_jichi', '咸蛋黄鸡翅(3个)', 'protein', 'takeout', 'fried', 'LD', '3个(约150g)', [
    ['chicken_wing', 120], ['egg_yolk', 25], ['oil', 14], ['starch', 8], ['salt', 0.6],
  ], { aliases: ['蛋黄鸡翅', '金沙鸡翅'] }),
]
