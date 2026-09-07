import type { Dish } from '../../core/types'
import { D } from './helper'

// 外卖与餐馆（第二批，2026-09-07）：地方小吃、连锁快餐、新式茶饮、日韩泰西。按门店常见一人份估算，含店家用油用盐。
export const DISHES_TAKEOUT_MORE: Dish[] = [
  // ===== 米粉米线面 =====
  D('to2_guoqiao_mixian', '过桥米线', 'combo', 'takeout', 'normal', 'LD', '1份(约700g)', [
    ['rice_noodles_cooked', 250], ['chicken_breast', 40], ['pork_lean', 30], ['fish_freshwater', 30], ['broth', 300], ['bok_choy', 40], ['egg', 25], ['oil', 8], ['salt', 2.2],
  ]),
  D('to2_guilin_mifen', '桂林米粉', 'combo', 'takeout', 'heavy', 'BLD', '1碗(约450g)', [
    ['rice_noodles_cooked', 250], ['beef_shank', 40], ['pork_lean', 30], ['peanut', 10], ['sour_bamboo', 30], ['oil', 12], ['soy_sauce', 12], ['chili_oil', 6],
  ]),
  D('to2_changde_niurou_fen', '常德牛肉粉', 'combo', 'takeout', 'heavy', 'BLD', '1碗(约550g)', [
    ['rice_noodles_cooked', 260], ['beef_brisket', 70], ['broth', 200], ['chili_oil', 10], ['oil', 8], ['salt', 2.5], ['garlic_chives', 10],
  ], { tags: ['spicy'] }),
  D('to2_yuntun_mian', '云吞面', 'combo', 'takeout', 'normal', 'BLD', '1碗(约450g)', [
    ['noodles_cooked', 150], ['shrimp', 40], ['pork_ground', 40], ['dumpling_wrapper', 40], ['broth', 200], ['salt', 2], ['sesame_oil', 3],
  ]),
  D('to2_chezai_mian', '车仔面', 'combo', 'takeout', 'heavy', 'LD', '1碗(约500g)', [
    ['noodles_cooked', 200], ['fish_balls', 50], ['hot_dog', 40], ['white_radish', 60], ['broth', 200], ['curry_block', 10], ['salt', 1.5],
  ]),
  D('to2_yaporn_mian', '油泼面', 'combo', 'takeout', 'heavy', 'LD', '1碗(约400g)', [
    ['noodles_cooked', 280], ['oil', 20], ['chili_powder', 6], ['garlic', 8], ['soy_sauce', 12], ['vinegar', 8], ['bean_sprouts', 40], ['bok_choy', 30],
  ], { tags: ['spicy'] }),
  D('to2_saozi_mian', '臊子面', 'combo', 'takeout', 'heavy', 'BLD', '1碗(约480g)', [
    ['noodles_cooked', 250], ['pork_belly', 50], ['carrot', 30], ['potato', 30], ['wood_ear', 20], ['egg', 25], ['vinegar', 10], ['oil', 10], ['salt', 2],
  ]),
  D('to2_henan_huimian', '河南烩面', 'combo', 'takeout', 'normal', 'LD', '1碗(约600g)', [
    ['noodles_cooked', 250], ['lamb', 50], ['broth', 250], ['kelp', 30], ['glass_noodles_dry', 15], ['coriander', 5], ['oil', 6], ['salt', 2.2],
  ]),
  D('to2_hulatang', '胡辣汤配油条', 'combo', 'takeout', 'heavy', 'B', '1碗+1根(约500g)', [
    ['beef_lean', 30], ['glass_noodles_dry', 20], ['peanut', 10], ['kelp', 20], ['starch', 15], ['water', 300], ['chili_powder', 3], ['salt', 2], ['youtiao', 60],
  ], { tags: ['spicy'] }),
  D('to2_guantang_bao', '灌汤包(6个)', 'combo', 'takeout', 'normal', 'BL', '6个(约260g)', [
    ['flour', 90], ['pork_ground', 100], ['broth', 40], ['soy_sauce', 6], ['ginger', 3], ['vinegar', 8],
  ]),
  D('to2_guotie', '锅贴(8个)', 'combo', 'takeout', 'fried', 'BL', '8个(约280g)', [
    ['dumpling_wrapper', 110], ['pork_ground', 90], ['cabbage', 60], ['oil', 15], ['soy_sauce', 5], ['vinegar', 8],
  ], { tags: ['fried'] }),
  D('to2_zaliang_jianbing', '山东杂粮煎饼(加蛋加薄脆)', 'combo', 'takeout', 'normal', 'B', '1个(约260g)', [
    ['cornmeal', 40], ['flour', 30], ['egg', 55], ['soda_crackers', 20], ['sweet_bean_sauce', 12], ['lettuce', 20], ['oil', 6],
  ]),
  D('to2_huainan_niurou_tang', '淮南牛肉汤配烧饼', 'combo', 'takeout', 'normal', 'BL', '1碗+1个(约550g)', [
    ['beef_brisket', 60], ['glass_noodles_dry', 25], ['tofu_sheet', 20], ['broth', 300], ['salt', 2.2], ['chili_oil', 5], ['flour', 70], ['oil', 8],
  ]),
  // ===== 川湘黔滇东北 =====
  D('to2_shuizhu_roupian', '水煮肉片(一人份)', 'combo', 'takeout', 'heavy', 'LD', '1份(约450g)', [
    ['pork_tenderloin', 120], ['soy_sprouts', 80], ['lettuce', 60], ['oil', 30], ['doubanjiang', 15], ['chili_powder', 4], ['sichuan_pepper', 2], ['starch', 8], ['broth', 100],
  ], { tags: ['spicy'] }),
  D('to2_maoxuewang', '毛血旺(无血,一人份)', 'combo', 'takeout', 'heavy', 'LD', '1份(约500g)', [
    ['beef_tripe', 80], ['luncheon_meat', 50], ['soy_sprouts', 100], ['yuba', 20], ['oil', 30], ['hotpot_base', 25], ['broth', 150],
  ], { tags: ['spicy'] }),
  D('to2_lengchi_tu', '冷吃兔', 'protein', 'takeout', 'heavy', 'LDS', '1袋(约150g)', [
    ['rabbit', 120], ['oil', 15], ['chili_powder', 6], ['sichuan_pepper', 2], ['soy_sauce', 6], ['sugar', 3],
  ], { tags: ['spicy'] }),
  D('to2_zhong_shuijiao', '钟水饺(10个)', 'combo', 'takeout', 'heavy', 'BL', '10个(约260g)', [
    ['dumpling_wrapper', 110], ['pork_ground', 90], ['chili_oil', 15], ['soy_sauce', 12], ['sugar', 6], ['garlic', 6],
  ], { tags: ['spicy', 'sweet'] }),
  D('to2_duojiao_yutou', '剁椒鱼头(一人份)', 'protein', 'takeout', 'heavy', 'LD', '半个(约300g)', [
    ['fish_freshwater', 220], ['chili_fresh', 40], ['chili_sauce', 15], ['oil', 15], ['soy_sauce', 8], ['ginger', 5], ['garlic', 8],
  ], { tags: ['spicy'] }),
  D('to2_waipocai_chaodan', '外婆菜炒蛋', 'protein', 'takeout', 'heavy', 'LD', '1盘(约200g)', [
    ['preserved_veg', 60], ['egg', 100], ['chili_fresh', 10], ['oil', 12],
  ], { tags: ['spicy'] }),
  D('to2_suantang_yu', '贵州酸汤鱼(一人份)', 'combo', 'takeout', 'normal', 'LD', '1份(约500g)', [
    ['fish_freshwater', 160], ['tomato', 120], ['sauerkraut', 50], ['tofu', 60], ['broth', 150], ['oil', 8], ['salt', 1.5], ['chili_fresh', 8],
  ], { tags: ['spicy'] }),
  D('to2_qiguo_ji', '云南汽锅鸡', 'soup', 'takeout', 'light', 'LD', '1碗(约400g)', [
    ['chicken_whole', 150], ['ginger', 5], ['water', 220], ['salt', 1.8], ['shiitake', 20],
  ]),
  D('to2_suancai_bairou', '酸菜白肉', 'combo', 'takeout', 'normal', 'LD', '1份(约500g)', [
    ['pork_belly', 100], ['sauerkraut', 150], ['glass_noodles_dry', 30], ['broth', 200], ['garlic', 8], ['salt', 1],
  ]),
  D('to2_dongbei_dalapi', '东北大拉皮', 'veg', 'takeout', 'normal', 'LD', '1盘(约300g)', [
    ['glass_noodles_dry', 50], ['cucumber', 80], ['carrot', 40], ['egg', 25], ['sesame_paste', 12], ['garlic', 6], ['vinegar', 8], ['soy_sauce', 6], ['mustard', 3],
  ]),
  D('to2_guobaorou_gaifan', '锅包肉盖饭', 'combo', 'takeout', 'fried', 'LD', '1份(约450g)', [
    ['rice_cooked', 250], ['pork_tenderloin', 100], ['starch', 25], ['oil', 22], ['sugar', 18], ['vinegar', 12],
  ], { tags: ['fried', 'sweet'] }),
  D('to2_xinjiang_chao_mifen', '新疆炒米粉', 'combo', 'takeout', 'heavy', 'LD', '1盘(约450g)', [
    ['rice_noodles_cooked', 280], ['chicken_thigh', 60], ['celery', 40], ['chili_sauce', 25], ['oil', 15], ['soy_sauce', 8],
  ], { tags: ['spicy'] }),
  D('to2_latiaozi', '拉条子(拌面)', 'combo', 'takeout', 'heavy', 'LD', '1盘(约500g)', [
    ['noodles_cooked', 280], ['lamb', 60], ['tomato', 80], ['green_pepper', 50], ['onion', 30], ['oil', 15], ['salt', 2],
  ]),
  // ===== 粤港 =====
  D('to2_chiyou_ji', '豉油鸡(四分一)', 'protein', 'takeout', 'normal', 'LD', '1盘(约180g)', [
    ['chicken_whole', 160], ['soy_sauce', 15], ['sugar', 6], ['cooking_wine', 8], ['ginger', 5],
  ]),
  D('to2_boluo_gulaorou', '菠萝咕咾肉', 'protein', 'takeout', 'fried', 'LD', '1盘(约260g)', [
    ['pork_shoulder', 110], ['pineapple', 80], ['green_pepper', 30], ['starch', 20], ['oil', 20], ['ketchup', 20], ['sugar', 10], ['vinegar', 8],
  ], { tags: ['fried', 'sweet'] }),
  D('to2_xiajiao', '虾饺(4个)', 'snack', 'takeout', 'light', 'BLS', '4个(约120g)', [
    ['shrimp', 60], ['starch', 30], ['pork_belly', 15], ['bamboo_shoot', 10], ['oil', 3], ['salt', 0.8],
  ]),
  D('to2_chashao_bao', '叉烧包(2个)', 'combo', 'takeout', 'normal', 'BLS', '2个(约160g)', [
    ['flour', 70], ['pork_lean', 40], ['hoisin', 12], ['sugar', 10], ['oil', 5],
  ], { tags: ['sweet'] }),
  D('to2_liusha_bao', '流沙包(2个)', 'snack', 'takeout', 'normal', 'BS', '2个(约140g)', [
    ['flour', 60], ['salted_duck_egg', 25], ['butter', 15], ['sugar', 15], ['milk', 15],
  ], { tags: ['sweet'] }),
  D('to2_tingzai_zhou', '艇仔粥', 'combo', 'takeout', 'light', 'BLD', '1碗(约450g)', [
    ['congee', 350], ['fish_freshwater', 30], ['squid', 20], ['peanut', 8], ['tofu_sheet', 10], ['scallion', 5], ['salt', 1.5],
  ]),
  D('to2_shenggun_niurou_zhou', '生滚牛肉粥', 'breakfast', 'takeout', 'light', 'BLD', '1碗(约450g)', [
    ['congee', 350], ['beef_lean', 60], ['ginger', 5], ['scallion', 5], ['salt', 1.5], ['sesame_oil', 2],
  ]),
  D('to2_jidi_zhou', '及第粥', 'combo', 'takeout', 'light', 'BLD', '1碗(约450g)', [
    ['congee', 330], ['pork_liver', 30], ['pork_kidney', 30], ['pork_ground', 30], ['ginger', 5], ['salt', 1.5],
  ]),
  D('to2_shaola_shuangpin_fan', '烧腊双拼饭', 'combo', 'takeout', 'heavy', 'LD', '1份(约450g)', [
    ['rice_cooked', 250], ['roast_duck', 70], ['pork_belly', 60], ['choy_sum', 50], ['soy_sauce', 10], ['honey', 5],
  ]),
  D('to2_baoyu_laofan', '鲍鱼捞饭', 'combo', 'takeout', 'normal', 'LD', '1份(约420g)', [
    ['rice_cooked', 250], ['abalone', 80], ['broccoli', 60], ['oyster_sauce', 12], ['starch', 5], ['oil', 6],
  ]),
  // ===== 西式快餐与连锁 =====
  D('to2_bk_whopper_set', '汉堡王皇堡套餐', 'combo', 'takeout', 'fried', 'LD', '1套(约600g)', [
    ['burger_bun', 90], ['beef_patty', 110], ['cheese', 15], ['lettuce', 20], ['tomato', 30], ['mayonnaise', 15], ['fries', 115], ['cola', 400],
  ], { tags: ['fried'] }),
  D('to2_mcd_mcmuffin', '麦当劳麦满分(猪柳蛋)', 'combo', 'takeout', 'normal', 'B', '1个(约170g)', [
    ['burger_bun', 60], ['pork_ground', 45], ['egg', 55], ['cheese', 15], ['butter', 4],
  ]),
  D('to2_mcd_grilled_chicken_burger', '麦当劳板烧鸡腿堡', 'combo', 'takeout', 'normal', 'LD', '1个(约200g)', [
    ['burger_bun', 75], ['chicken_thigh', 90], ['lettuce', 20], ['mayonnaise', 12], ['black_pepper_sauce', 8],
  ]),
  D('to2_mcd_nuggets6', '麦乐鸡6块', 'snack', 'takeout', 'fried', 'LDS', '6块(约100g)', [
    ['chicken_nuggets', 100], ['sweet_sour_sauce', 20],
  ], { tags: ['fried'] }),
  D('to2_tasting_burger', '塔斯汀香辣鸡腿堡', 'combo', 'takeout', 'fried', 'LD', '1个(约220g)', [
    ['flour', 80], ['fried_chicken', 100], ['lettuce', 20], ['mayonnaise', 12], ['chili_sauce', 5],
  ], { tags: ['fried', 'spicy'] }),
  D('to2_subway_sandwich', '赛百味鸡肉三明治(6寸)', 'combo', 'takeout', 'light', 'BLD', '1个(约260g)', [
    ['bread_whole', 90], ['chicken_breast', 70], ['lettuce', 30], ['tomato', 30], ['cucumber', 20], ['onion', 10], ['cheese', 10], ['mayonnaise', 8],
  ]),
  D('to2_starbucks_latte_croissant', '星巴克拿铁+牛角包', 'combo', 'takeout', 'normal', 'BS', '1杯+1个(约400g)', [
    ['milk', 300], ['black_coffee', 60], ['croissant', 65],
  ]),
  D('to2_luckin_coconut_latte', '瑞幸生椰拿铁', 'drink', 'takeout', 'normal', 'BLDS', '1杯(约450ml)', [
    ['coconut_milk', 120], ['milk', 150], ['black_coffee', 120], ['sugar', 15],
  ], { tags: ['sweet'] }),
  D('to2_cheese_grape_tea', '芝士葡萄(奶盖茶)', 'drink', 'takeout', 'heavy', 'LDS', '1杯(约500ml)', [
    ['grape', 120], ['tea', 250], ['cream', 40], ['cream_cheese', 15], ['sugar', 25], ['milk', 40],
  ], { tags: ['sweet'] }),
  D('to2_yangzhi_ganlu', '杨枝甘露', 'drink', 'takeout', 'normal', 'LDS', '1杯(约450ml)', [
    ['mango', 150], ['pomelo', 40], ['coconut_milk', 80], ['milk', 100], ['sugar', 20], ['tapioca_pearls', 30],
  ], { tags: ['sweet'] }),
  D('to2_bingfen', '红糖冰粉', 'snack', 'takeout', 'light', 'LDS', '1碗(约300g)', [
    ['jelly', 220], ['brown_sugar', 25], ['peanut', 10], ['raisins', 8], ['water', 30],
  ], { tags: ['sweet'] }),
  D('to2_korean_fried_chicken', '韩式炸鸡(半份)', 'protein', 'takeout', 'fried', 'LDS', '半份(约250g)', [
    ['fried_chicken', 200], ['honey', 15], ['chili_sauce', 15], ['sesame', 3],
  ], { tags: ['fried', 'sweet', 'spicy'] }),
  D('to2_tonkotsu_ramen', '日式豚骨拉面', 'combo', 'takeout', 'heavy', 'LD', '1碗(约600g)', [
    ['noodles_cooked', 220], ['pork_belly', 60], ['egg', 55], ['broth', 300], ['lard', 10], ['salt', 3], ['nori', 2], ['scallion', 8],
  ]),
  D('to2_unagi_don', '鳗鱼饭', 'combo', 'takeout', 'normal', 'LD', '1份(约400g)', [
    ['rice_cooked', 250], ['eel', 100], ['teriyaki', 20], ['sesame', 2],
  ], { tags: ['sweet'] }),
  D('to2_sukiyaki', '寿喜锅(一人份)', 'combo', 'takeout', 'normal', 'LD', '1份(约600g)', [
    ['beef_ribeye', 120], ['tofu', 80], ['chinese_cabbage', 100], ['enoki', 50], ['glass_noodles_dry', 20], ['soy_sauce', 20], ['sugar', 15], ['egg', 55], ['water', 150],
  ], { tags: ['sweet'] }),
  D('to2_tom_yum', '冬阴功汤', 'soup', 'takeout', 'normal', 'LD', '1碗(约400g)', [
    ['shrimp', 80], ['button_mushroom', 60], ['coconut_milk', 60], ['tomato', 50], ['lemon', 15], ['fish_sauce', 10], ['chili_fresh', 8], ['broth', 180],
  ], { tags: ['spicy'] }),
  D('to2_thai_green_curry', '泰式绿咖喱鸡配饭', 'combo', 'takeout', 'heavy', 'LD', '1份(约500g)', [
    ['rice_cooked', 230], ['chicken_thigh', 120], ['coconut_milk', 120], ['curry_powder', 6], ['eggplant', 60], ['fish_sauce', 8], ['sugar', 6], ['oil', 6],
  ], { tags: ['spicy'] }),
  D('to2_vietnam_spring_rolls', '越南鲜春卷(4个)', 'snack', 'takeout', 'light', 'LDS', '4个(约240g)', [
    ['rice_noodles_cooked', 80], ['shrimp', 60], ['lettuce', 40], ['carrot', 20], ['cucumber', 30], ['tortilla', 20], ['fish_sauce', 6], ['sugar', 4], ['lemon', 5],
  ]),
  D('to2_indian_curry_naan', '印度咖喱鸡配馕', 'combo', 'takeout', 'heavy', 'LD', '1份(约450g)', [
    ['chicken_thigh', 130], ['tomato', 80], ['onion', 40], ['yogurt_plain', 40], ['curry_powder', 8], ['butter', 12], ['flour', 90], ['oil', 6], ['salt', 2],
  ], { tags: ['spicy'] }),
  D('to2_doner_wrap', '土耳其烤肉卷', 'combo', 'takeout', 'normal', 'LD', '1个(约320g)', [
    ['tortilla', 80], ['lamb', 90], ['lettuce', 40], ['tomato', 40], ['onion', 20], ['yogurt_plain', 30], ['oil', 6], ['salt', 1.2],
  ]),
  D('to2_tacos', '墨西哥塔可(3个)', 'combo', 'takeout', 'normal', 'LD', '3个(约330g)', [
    ['tortilla', 90], ['beef_ground', 90], ['lettuce', 40], ['tomato', 40], ['cheese', 25], ['onion', 15], ['oil', 6], ['salt', 1.2],
  ]),
  D('to2_lasagna', '意式千层面', 'combo', 'takeout', 'heavy', 'LD', '1块(约350g)', [
    ['pasta_cooked', 150], ['beef_ground', 90], ['tomato', 80], ['cheese', 50], ['milk', 40], ['butter', 8], ['salt', 1.5],
  ]),
  D('to2_baked_rice', '芝士焗饭(鸡肉)', 'combo', 'takeout', 'heavy', 'LD', '1份(约400g)', [
    ['rice_cooked', 220], ['chicken_thigh', 80], ['cheese', 50], ['sweet_corn_kernels', 30], ['onion', 20], ['butter', 10], ['salt', 1.5],
  ]),
  D('to2_pancake_set', '松饼套餐(枫糖黄油)', 'combo', 'takeout', 'normal', 'BS', '3片(约260g)', [
    ['pancake', 200], ['syrup', 40], ['butter', 12],
  ], { tags: ['sweet'] }),
  D('to2_waffle_icecream', '华夫饼配冰淇淋', 'snack', 'takeout', 'normal', 'S', '1份(约200g)', [
    ['waffle', 110], ['ice_cream', 70], ['syrup', 20],
  ], { tags: ['sweet'] }),
]
