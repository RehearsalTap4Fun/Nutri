import type { Dish } from '../../core/types'
import { D } from './helper'

// 便利店与包装食品（第二批，2026-09-07）：按常见规格一份估算；包装食品营养多取自 USDA 对应品类（ingredientsUsda.ts）。
export const DISHES_CONVENIENCE_MORE: Dish[] = [
  // ===== 便利店即食 =====
  D('cv2_onigiri_tuna', '金枪鱼饭团', 'staple', 'convenience', 'light', 'BLS', '1个(约110g)', [
    ['rice_pressed', 85], ['tuna_canned', 15], ['mayonnaise', 6], ['nori', 2], ['salt', 0.5],
  ]),
  D('cv2_onigiri_plum', '梅子饭团', 'staple', 'convenience', 'light', 'BLS', '1个(约100g)', [
    ['rice_pressed', 92], ['nori', 2], ['plum', 6], ['salt', 0.6],
  ]),
  D('cv2_chicken_salad_cup', '鸡肉沙拉杯', 'protein', 'convenience', 'light', 'LDS', '1杯(约220g)', [
    ['chicken_breast', 70], ['lettuce', 60], ['cherry_tomato', 40], ['sweet_corn_canned', 30], ['vinaigrette', 15],
  ]),
  D('cv2_soft_egg', '溏心蛋(1个)', 'snack', 'convenience', 'light', 'BLDS', '1个(约55g)', [
    ['egg', 55], ['soy_sauce', 2],
  ]),
  D('cv2_lu_jitui', '便利店卤鸡腿', 'protein', 'convenience', 'normal', 'LDS', '1个(约120g)', [
    ['chicken_thigh', 115], ['soy_sauce', 8], ['sugar', 3],
  ]),
  D('cv2_lu_yabo', '卤鸭脖(1袋)', 'snack', 'convenience', 'heavy', 'LDS', '1袋(约120g)', [
    ['duck_neck_braised', 120],
  ], { tags: ['spicy'] }),
  D('cv2_lu_chijian', '卤翅尖(1袋)', 'snack', 'convenience', 'heavy', 'LDS', '1袋(约100g)', [
    ['chicken_wing', 95], ['soy_sauce', 8], ['sugar', 3], ['chili_oil', 3],
  ], { tags: ['spicy'] }),
  D('cv2_konjac_shuang', '魔芋爽(1包)', 'snack', 'convenience', 'heavy', 'LDS', '1包(约18g)', [
    ['konjac', 18], ['chili_oil', 3], ['salt', 0.4],
  ], { tags: ['spicy'] }),
  D('cv2_haidai_jie', '海带结(1袋)', 'snack', 'convenience', 'normal', 'LDS', '1袋(约100g)', [
    ['kelp', 90], ['soy_sauce', 5], ['chili_oil', 2], ['sugar', 2],
  ]),
  D('cv2_paojiao_fengzhua', '泡椒凤爪(1袋)', 'snack', 'convenience', 'normal', 'LDS', '1袋(约100g)', [
    ['chicken_feet', 90], ['chili_fresh', 8], ['vinegar', 5], ['salt', 1.2],
  ], { tags: ['spicy'] }),
  D('cv2_hot_dog_bun', '便利店热狗', 'combo', 'convenience', 'normal', 'BLS', '1个(约130g)', [
    ['hot_dog', 60], ['burger_bun', 55], ['ketchup', 10], ['mustard', 5],
  ]),
  D('cv2_bagel_cream_cheese', '贝果配奶油奶酪', 'staple', 'convenience', 'normal', 'BS', '1个(约120g)', [
    ['bagel', 95], ['cream_cheese', 25],
  ]),
  D('cv2_self_heating_rice', '自热米饭(梅菜扣肉)', 'combo', 'convenience', 'heavy', 'LD', '1盒(约380g)', [
    ['rice_cooked', 230], ['pork_belly', 60], ['preserved_veg', 30], ['oil', 8], ['soy_sauce', 8], ['sugar', 4],
  ]),
  D('cv2_self_heating_hotpot', '自热小火锅', 'combo', 'convenience', 'heavy', 'LD', '1盒(约450g)', [
    ['hotpot_base', 40], ['konjac', 60], ['potato', 60], ['glass_noodles_dry', 40], ['luncheon_meat', 40], ['kelp', 30], ['bamboo_shoot', 30], ['water', 150],
  ], { tags: ['spicy'] }),
  D('cv2_oat_cup', '冲泡燕麦杯(牛奶)', 'breakfast', 'convenience', 'light', 'BS', '1杯(约280g)', [
    ['oats', 40], ['milk', 200], ['raisins', 10],
  ]),
  D('cv2_takoyaki', '章鱼小丸子(6个)', 'snack', 'convenience', 'fried', 'LDS', '6个(约150g)', [
    ['flour', 50], ['egg', 30], ['octopus', 30], ['cabbage', 20], ['mayonnaise', 12], ['bbq_sauce', 10], ['oil', 8],
  ], { tags: ['fried'] }),
  D('cv2_surimi_pack', '蟹棒(1袋)', 'snack', 'convenience', 'light', 'LDS', '1袋(约90g)', [
    ['surimi', 90],
  ]),
  D('cv2_sardine_can', '沙丁鱼罐头(1罐)', 'protein', 'convenience', 'normal', 'BLDS', '1罐(约90g)', [
    ['sardine_canned', 90],
  ]),
  D('cv2_natto_pack', '纳豆(1盒)', 'snack', 'convenience', 'light', 'BLDS', '1盒(约50g)', [
    ['natto', 45], ['soy_sauce', 4], ['mustard', 1],
  ]),
  D('cv2_tempeh_pan', '香煎天贝', 'protein', 'convenience', 'normal', 'LDS', '1块(约100g)', [
    ['tempeh', 90], ['oil', 6], ['soy_sauce', 5],
  ]),
  // ===== 坚果果干 =====
  D('cv2_daily_nuts', '每日坚果(1包)', 'snack', 'convenience', 'light', 'S', '1包(约25g)', [
    ['trail_mix', 25],
  ]),
  D('cv2_pistachio', '开心果一小把', 'snack', 'convenience', 'light', 'S', '带壳约40g(可食25g)', [
    ['pistachio', 25],
  ]),
  D('cv2_macadamia', '夏威夷果一小把', 'snack', 'convenience', 'normal', 'S', '约6颗(20g)', [
    ['macadamia', 20],
  ]),
  D('cv2_pumpkin_seeds', '南瓜籽一小把', 'snack', 'convenience', 'light', 'S', '约20g', [
    ['pumpkin_seeds', 20],
  ]),
  D('cv2_pecan', '碧根果一小把', 'snack', 'convenience', 'light', 'S', '约6个(20g)', [
    ['pecan', 20],
  ]),
  D('cv2_chestnut_bag', '即食板栗(1袋)', 'snack', 'convenience', 'light', 'S', '1袋(约80g)', [
    ['chestnut', 80],
  ]),
  D('cv2_dried_cranberry', '蔓越莓干一小把', 'snack', 'convenience', 'light', 'S', '约25g', [
    ['cranberries_dried', 25],
  ], { tags: ['sweet'] }),
  D('cv2_dried_mango', '芒果干(1包)', 'snack', 'convenience', 'light', 'S', '1包(约40g)', [
    ['mango_dried', 40],
  ], { tags: ['sweet'] }),
  D('cv2_dried_longan', '桂圆干一小把', 'snack', 'convenience', 'light', 'S', '约20g', [
    ['dried_longan', 20],
  ], { tags: ['sweet'] }),
  // ===== 水果（新增品种）=====
  D('cv2_pineapple', '菠萝', 'fruit', 'convenience', 'light', 'BLDS', '1小碗(约150g)', [['pineapple', 150]]),
  D('cv2_cherry', '樱桃/车厘子', 'fruit', 'convenience', 'light', 'BLDS', '1小碗(去核可食约110g)', [['cherry', 110]]),
  D('cv2_cantaloupe', '哈密瓜', 'fruit', 'convenience', 'light', 'BLDS', '2块(约200g)', [['cantaloupe', 200]]),
  D('cv2_lychee', '荔枝', 'fruit', 'convenience', 'light', 'BLDS', '8颗(去壳去核可食约85g)', [['lychee', 85]]),
  D('cv2_longan', '龙眼', 'fruit', 'convenience', 'light', 'BLDS', '10颗(去壳去核可食约65g)', [['longan', 65]]),
  D('cv2_durian', '榴莲', 'fruit', 'convenience', 'light', 'S', '1瓣(约120g)', [['durian', 120]]),
  D('cv2_pomegranate', '石榴', 'fruit', 'convenience', 'light', 'BLDS', '半个(籽粒可食约60g)', [['pomegranate', 60]]),
  D('cv2_papaya', '木瓜', 'fruit', 'convenience', 'light', 'BLDS', '半个(可食约150g)', [['papaya', 150]]),
  D('cv2_persimmon', '柿子', 'fruit', 'convenience', 'light', 'BLDS', '1个(可食约145g)', [['persimmon', 145]]),
  D('cv2_loquat', '枇杷', 'fruit', 'convenience', 'light', 'BLDS', '6个(去皮去核可食约100g)', [['loquat', 100]]),
  D('cv2_mandarin', '橘子/砂糖橘', 'fruit', 'convenience', 'light', 'BLDS', '3个(去皮可食约115g)', [['mandarin', 115]]),
  D('cv2_grapefruit', '西柚', 'fruit', 'convenience', 'light', 'BLDS', '半个(可食约120g)', [['grapefruit', 120]]),
  D('cv2_plum', '李子', 'fruit', 'convenience', 'light', 'BLDS', '2个(可食约120g)', [['plum', 120]]),
  D('cv2_apricot', '杏', 'fruit', 'convenience', 'light', 'BLDS', '3个(去核可食约110g)', [['apricot', 110]]),
  D('cv2_fig', '无花果', 'fruit', 'convenience', 'light', 'BLDS', '3个(约120g)', [['fig', 120]]),
  D('cv2_coconut_water', '椰子水', 'drink', 'convenience', 'light', 'BLDS', '1瓶(330ml)', [['coconut_water', 330]]),
  // ===== 奶与甜品 =====
  D('cv2_lowfat_milk', '低脂牛奶', 'drink', 'convenience', 'light', 'BLDS', '1盒(250ml)', [['milk_lowfat', 250]]),
  D('cv2_plain_yogurt_cup', '原味全脂酸奶(无糖)', 'snack', 'convenience', 'light', 'BLDS', '1杯(约200g)', [['yogurt_plain', 200]]),
  D('cv2_pudding', '布丁(1杯)', 'snack', 'convenience', 'light', 'S', '1杯(约100g)', [['pudding', 100]], { tags: ['sweet'] }),
  D('cv2_cheesecake_slice', '芝士蛋糕(1块)', 'snack', 'convenience', 'heavy', 'S', '1块(约100g)', [['cheesecake', 100]], { tags: ['sweet'] }),
  D('cv2_doughnut', '甜甜圈(1个)', 'snack', 'convenience', 'fried', 'BS', '1个(约60g)', [['doughnut', 60]], { tags: ['sweet', 'fried'] }),
  D('cv2_cookies2', '曲奇(2块)', 'snack', 'convenience', 'heavy', 'S', '2块(约30g)', [['chocolate_chip_cookie', 30]], { tags: ['sweet'] }),
  D('cv2_blueberry_muffin', '蓝莓麦芬', 'snack', 'convenience', 'heavy', 'BS', '1个(约110g)', [['muffin_blueberry', 110]], { tags: ['sweet'] }),
  D('cv2_chocolate_croissant', '巧克力可颂', 'breakfast', 'convenience', 'heavy', 'BS', '1个(约70g)', [['croissant_chocolate', 60], ['chocolate', 10]], { tags: ['sweet'] }),
  D('cv2_graham', '消化饼(3片)', 'snack', 'convenience', 'normal', 'S', '3片(约30g)', [['graham_crackers', 30]], { tags: ['sweet'] }),
  D('cv2_wafers', '威化饼(1小包)', 'snack', 'convenience', 'normal', 'S', '1小包(约30g)', [['vanilla_wafers', 30]], { tags: ['sweet'] }),
  D('cv2_snickers', '士力架(1条)', 'snack', 'convenience', 'heavy', 'S', '1条(约51g)', [['snickers', 51]], { tags: ['sweet'] }),
  D('cv2_granola_bar', '麦片棒(1条)', 'snack', 'convenience', 'normal', 'BS', '1条(约30g)', [['granola_bar', 30]], { tags: ['sweet'] }),
  D('cv2_rice_cracker', '米饼(2片)', 'snack', 'convenience', 'light', 'S', '2片(约20g)', [['rice_cracker', 20]]),
  // ===== 快餐小食 =====
  D('cv2_onion_rings', '洋葱圈(1份)', 'snack', 'convenience', 'fried', 'LDS', '1份(约90g)', [['onion_rings', 90]], { tags: ['fried'] }),
  D('cv2_hash_brown', '薯饼(1个)', 'snack', 'convenience', 'fried', 'BS', '1个(约55g)', [['hash_brown', 55]], { tags: ['fried'] }),
  D('cv2_nuggets5', '鸡块(5块)', 'snack', 'convenience', 'fried', 'LDS', '5块(约85g)', [['chicken_nuggets', 85], ['ketchup', 15]], { tags: ['fried'] }),
  // ===== 饮料 =====
  D('cv2_energy_drink', '能量饮料(1罐)', 'drink', 'convenience', 'light', 'BLDS', '1罐(250ml)', [['energy_drink', 250]], { tags: ['sweet'] }),
  D('cv2_apple_juice', '苹果汁(1瓶)', 'drink', 'convenience', 'light', 'BLDS', '1瓶(300ml)', [['apple_juice', 300]], { tags: ['sweet'] }),
  D('cv2_sparkling_water', '气泡水(无糖)', 'drink', 'convenience', 'light', 'BLDS', '1瓶(500ml)', [['water', 500]]),
  D('cv2_black_beans_side', '水煮黑豆(1小碗)', 'snack', 'convenience', 'light', 'LDS', '1小碗(约100g)', [['black_beans_cooked', 100], ['salt', 0.3]]),
  D('cv2_kidney_bean_salad', '红腰豆蔬菜沙拉', 'veg', 'convenience', 'light', 'LDS', '1盒(约250g)', [
    ['kidney_beans_cooked', 100], ['lettuce', 60], ['cherry_tomato', 50], ['sweet_corn_canned', 30], ['vinaigrette', 12],
  ]),
  D('cv2_kale_salad', '羽衣甘蓝沙拉', 'veg', 'convenience', 'light', 'LDS', '1盒(约220g)', [
    ['kale', 100], ['red_cabbage', 40], ['carrot', 30], ['almond', 10], ['vinaigrette', 15], ['cranberries_dried', 10],
  ]),
]
