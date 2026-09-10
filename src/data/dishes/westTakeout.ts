import type { Dish } from '../../core/types'
import { D } from './helper'

// 西式 / 外卖与餐馆 / 便利店。parts 为一人份；外卖普遍重油重盐，用油 20~35 g、盐当量 3~5 g。
// 近似替代：肥牛→beef_brisket，羊肉串→lamb，猪排→pork_lean+flour+oil，白吉馍/馍→flour，
// 凉皮→starch+flour，薄脆→youtiao，鱼露→soy_sauce，韩式辣酱→chili_sauce，荷兰酱→butter+egg，
// 巨无霸酱→thousand_island，萨其马→flour+sugar+oil+egg+syrup。
export const DISHES_WEST_TAKEOUT: Dish[] = [
  // ============================ 西式 (we_) ============================
  D('we_steak_fries', '西冷牛排配薯条', 'combo', 'west', 'normal', 'LD', '1份(约420g)', [
    ['beef_steak', 200], ['fries', 120], ['butter', 10], ['black_pepper_sauce', 23.5], ['broccoli', 60], ['salt', 1],
  ], { aliases: ['牛排套餐', '牛排'] }),
  D('we_chicken_roast_veg', '香煎鸡胸配烤蔬菜', 'protein', 'west', 'light', 'LD', '1份(约430g)', [
    ['chicken_breast', 180], ['broccoli', 100], ['zucchini', 80], ['cherry_tomato', 60], ['olive_oil', 8], ['salt', 1.5],
  ], { aliases: ['煎鸡胸', '鸡胸肉'] }),
  D('we_salmon_quinoa', '香煎三文鱼配藜麦', 'combo', 'west', 'light', 'LD', '1份(约400g)', [
    ['salmon', 150], ['quinoa_cooked', 150], ['asparagus', 80], ['olive_oil', 6], ['lemon', 10], ['salt', 1.5],
  ], { aliases: ['煎三文鱼', '三文鱼'] }),
  D('we_spaghetti_bolognese', '番茄肉酱意面', 'combo', 'west', 'normal', 'LD', '1盘(约520g)', [
    ['pasta_cooked', 250], ['beef_ground', 80], ['tomato', 120], ['onion', 30], ['ketchup', 20], ['olive_oil', 10], ['cheese', 10], ['garlic', 5], ['salt', 1.5],
  ], { aliases: ['肉酱意面', '意面', '博洛尼亚'] }),
  D('we_carbonara', '奶油培根意面', 'combo', 'west', 'heavy', 'LD', '1盘(约440g)', [
    ['pasta_cooked', 250], ['bacon', 50], ['cream', 60], ['egg', 50], ['cheese', 20], ['olive_oil', 5], ['garlic', 5], ['salt', 1],
  ], { aliases: ['卡邦尼', '培根意面', '白酱意面'] }),
  D('we_aglio_olio', '蒜香橄榄油意面', 'combo', 'west', 'normal', 'LD', '1盘(约300g)', [
    ['pasta_cooked', 250], ['olive_oil', 20], ['garlic', 15], ['chili_fresh', 5], ['cheese', 10], ['salt', 1.5],
  ], { aliases: ['蒜香意面'] }),
  D('we_seafood_pasta', '海鲜意面', 'combo', 'west', 'normal', 'LD', '1盘(约560g)', [
    ['pasta_cooked', 250], ['shrimp', 80], ['squid', 60], ['clam', 50], ['tomato', 100], ['olive_oil', 12], ['garlic', 8], ['salt', 1.5],
  ]),
  D('we_caesar_salad', '凯撒沙拉(鸡肉)', 'combo', 'west', 'normal', 'LD', '1份(约360g)', [
    ['lettuce', 150], ['chicken_breast', 100], ['bread_white', 30], ['cheese', 15], ['bacon', 15], ['mayonnaise', 25], ['egg', 25],
  ], { aliases: ['鸡肉凯撒', '凯撒'] }),
  D('we_chicken_salad_vinaigrette', '鸡胸蔬菜沙拉(油醋汁)', 'combo', 'west', 'light', 'LD', '1份(约400g)', [
    ['chicken_breast', 120], ['lettuce', 100], ['cherry_tomato', 60], ['cucumber', 60], ['sweet_corn_kernels', 30], ['egg', 50], ['vinaigrette', 15],
  ], { aliases: ['鸡胸沙拉', '减脂沙拉'] }),
  D('we_tuna_salad', '金枪鱼沙拉', 'combo', 'west', 'light', 'LD', '1份(约400g)', [
    ['tuna_canned', 100], ['lettuce', 100], ['cherry_tomato', 50], ['cucumber', 50], ['onion', 20], ['sweet_corn_kernels', 30], ['egg', 50], ['vinaigrette', 15],
  ], { aliases: ['吞拿鱼沙拉'] }),
  D('we_chickpea_avocado_salad', '鹰嘴豆牛油果沙拉', 'combo', 'west', 'light', 'LD', '1份(约420g)', [
    ['chickpeas_cooked', 120], ['avocado', 70], ['cherry_tomato', 80], ['lettuce', 80], ['cucumber', 50], ['lemon', 10], ['olive_oil', 5], ['salt', 1],
  ], { aliases: ['素食沙拉'] }),
  D('we_salmon_avocado_toast', '烟熏三文鱼牛油果吐司', 'breakfast', 'west', 'normal', 'BL', '1份(约200g)', [
    ['bread_whole', 70], ['avocado', 60], ['salmon', 60], ['lemon', 5], ['salt', 0.5],
  ], { aliases: ['牛油果吐司', '三文鱼吐司'] }),
  D('we_ham_cheese_sandwich', '火腿芝士三明治', 'combo', 'west', 'normal', 'BL', '1份(约210g)', [
    ['bread_white', 70], ['ham_deli', 50], ['cheese', 25], ['lettuce', 20], ['tomato', 30], ['butter', 8], ['mayonnaise', 8],
  ], { aliases: ['火腿三明治', '三明治'] }),
  D('we_tuna_sandwich', '金枪鱼三明治', 'combo', 'west', 'normal', 'BL', '1份(约215g)', [
    ['bread_whole', 70], ['tuna_canned', 70], ['mayonnaise', 15], ['lettuce', 20], ['cucumber', 30], ['onion', 10],
  ]),
  D('we_chicken_wrap', '鸡肉卷饼(墨西哥卷)', 'combo', 'west', 'normal', 'LD', '1个(约300g)', [
    ['tortilla', 70], ['chicken_breast', 100], ['lettuce', 40], ['tomato', 40], ['cheese', 20], ['thousand_island', 15], ['onion', 20],
  ], { aliases: ['墨西哥卷', '鸡肉卷', 'taco', '塔可'] }),
  D('we_homemade_burger', '牛肉汉堡(自制)', 'combo', 'west', 'normal', 'LD', '1个(约300g)', [
    ['burger_bun', 80], ['beef_ground', 120], ['cheese', 20], ['lettuce', 20], ['tomato', 30], ['onion', 15], ['ketchup', 15], ['mayonnaise', 10], ['oil', 5],
  ], { aliases: ['汉堡', '牛肉堡'] }),
  D('we_cheese_pizza_2', '芝士披萨2片', 'combo', 'west', 'heavy', 'LD', '2片(约240g)', [
    ['pizza', 240],
  ], { aliases: ['披萨', '比萨'] }),
  D('we_margherita', '玛格丽特披萨(9寸)', 'combo', 'west', 'normal', 'LD', '1个(约310g)', [
    ['flour', 120], ['cheese', 80], ['tomato', 100], ['olive_oil', 10], ['salt', 2],
  ], { aliases: ['玛格丽特', '番茄芝士披萨'] }),
  D('we_roast_chicken_potato', '烤鸡腿配土豆', 'combo', 'west', 'normal', 'LD', '1份(约490g)', [
    ['chicken_thigh', 200], ['potato', 200], ['olive_oil', 10], ['broccoli', 80], ['salt', 2],
  ], { aliases: ['烤鸡腿', '烤鸡'] }),
  D('we_fish_chips', '炸鱼薯条', 'combo', 'west', 'fried', 'LD', '1份(约370g)', [
    ['fish_sea', 150], ['flour', 30], ['oil', 25], ['fries', 150], ['lemon', 10], ['salt', 2],
  ], { aliases: ['fish and chips'] }),
  D('we_mushroom_soup', '奶油蘑菇汤', 'soup', 'west', 'normal', 'LD', '1碗(约280g)', [
    ['button_mushroom', 100], ['cream', 40], ['milk', 100], ['butter', 8], ['flour', 8], ['onion', 20], ['broth', 100], ['salt', 1.5],
  ], { aliases: ['蘑菇汤'] }),
  D('we_borscht', '罗宋汤', 'soup', 'west', 'normal', 'LD', '1碗(约700g)', [
    ['beef_brisket', 60], ['cabbage', 80], ['potato', 80], ['tomato', 100], ['carrot', 40], ['onion', 30], ['ketchup', 15.5], ['oil', 8], ['broth', 300], ['salt', 1],
  ], { aliases: ['红菜汤', '牛肉蔬菜汤'] }),
  D('we_tomato_soup', '番茄浓汤', 'soup', 'west', 'light', 'LD', '1碗(约470g)', [
    ['tomato', 250], ['onion', 30], ['cream', 20], ['olive_oil', 5], ['broth', 150], ['sugar', 3], ['salt', 1.5],
  ]),
  D('we_eggs_benedict', '班尼迪克蛋', 'breakfast', 'west', 'normal', 'B', '1份(约235g)', [
    ['bread_white', 60], ['egg', 100], ['ham_deli', 50], ['butter', 25],
  ], { aliases: ['班尼迪克', '水波蛋'] }),
  D('we_american_breakfast', '美式早餐(培根煎蛋吐司)', 'breakfast', 'west', 'normal', 'B', '1份(约260g)', [
    ['bacon', 40], ['egg', 100], ['bread_white', 60], ['butter', 8], ['oil', 5], ['tomato', 50],
  ], { aliases: ['培根煎蛋', '美式早餐'] }),
  D('we_omelette', '欧姆蛋', 'breakfast', 'west', 'normal', 'BLD', '1份(约240g)', [
    ['egg', 150], ['milk', 20], ['cheese', 20], ['butter', 8], ['onion', 20], ['green_pepper', 20], ['salt', 1],
  ], { aliases: ['芝士蛋卷', '西式蛋卷'] }),
  D('we_french_toast', '法式吐司', 'breakfast', 'west', 'normal', 'B', '2片(约200g)', [
    ['bread_white', 80], ['egg', 50], ['milk', 40], ['butter', 10], ['sugar', 8], ['honey', 10],
  ], { tags: ['sweet'], aliases: ['西多士'] }),
  D('we_overnight_oats', '燕麦碗(隔夜燕麦)', 'breakfast', 'west', 'light', 'B', '1碗(约360g)', [
    ['oats', 50], ['milk', 150], ['greek_yogurt', 50], ['banana', 60], ['blueberry', 30], ['chia', 8], ['honey', 8],
  ], { aliases: ['隔夜燕麦', 'overnight oats', '燕麦碗'] }),
  D('we_greek_yogurt_granola', '希腊酸奶格兰诺拉', 'breakfast', 'west', 'light', 'BS', '1杯(约280g)', [
    ['greek_yogurt', 150], ['granola', 40], ['blueberry', 40], ['strawberry', 40], ['honey', 8],
  ], { aliases: ['酸奶麦片', '酸奶碗'] }),
  D('we_roast_veg', '烤蔬菜拼盘', 'veg', 'west', 'light', 'LD', '1盘(约390g)', [
    ['zucchini', 80], ['eggplant', 80], ['green_pepper', 60], ['onion', 50], ['cherry_tomato', 60], ['button_mushroom', 50], ['olive_oil', 8], ['salt', 1.5],
  ], { aliases: ['烤蔬菜'] }),
  D('we_mashed_potato', '土豆泥', 'staple', 'west', 'normal', 'LD', '1份(约255g)', [
    ['potato', 200], ['milk', 40], ['butter', 15], ['salt', 1],
  ], { aliases: ['薯泥'] }),
  D('we_veg_soup', '蔬菜浓汤(南瓜胡萝卜)', 'soup', 'west', 'light', 'LD', '1碗(约510g)', [
    ['pumpkin', 150], ['carrot', 50], ['onion', 30], ['potato', 60], ['cream', 20], ['olive_oil', 5], ['broth', 200], ['salt', 1],
  ], { aliases: ['南瓜汤', '蔬菜汤'] }),

  // ============================ 外卖与餐馆 (to_) ============================
  D('to_huangmenji', '黄焖鸡米饭', 'combo', 'takeout', 'heavy', 'LD', '1份(约690g)', [
    ['chicken_thigh', 200], ['rice_cooked', 280], ['shiitake', 40], ['green_pepper', 30], ['potato', 80], ['oil', 20], ['soy_sauce', 20], ['sugar', 5], ['ginger', 5], ['garlic', 5], ['salt', 2],
  ], { tags: ['rice'], aliases: ['黄焖鸡', '杨铭宇'] }),
  D('to_lanzhou_lamian', '兰州牛肉拉面', 'combo', 'takeout', 'normal', 'BLD', '1碗(约810g)', [
    ['noodles_cooked', 300], ['beef_shank', 40], ['white_radish', 50], ['broth', 400], ['chili_oil', 10], ['coriander', 5], ['scallion', 5], ['salt', 2],
  ], { tags: ['noodle'], aliases: ['牛肉面', '拉面', '兰州拉面'] }),
  D('to_shaxian_banmian', '沙县拌面', 'combo', 'takeout', 'normal', 'BLD', '1碗(约245g)', [
    ['noodles_cooked', 200], ['peanut_butter', 20], ['soy_sauce', 10], ['lard', 8], ['scallion', 5], ['salt', 1],
  ], { tags: ['noodle'], aliases: ['花生酱拌面', '沙县小吃'] }),
  D('to_shaxian_zhengjiao', '沙县蒸饺(10个)', 'combo', 'takeout', 'normal', 'BLD', '1份(约170g)', [
    ['dumpling_wrapper', 80], ['pork_ground', 50], ['onion', 20], ['oil', 3], ['peanut_butter', 10], ['soy_sauce', 5], ['salt', 1],
  ], { aliases: ['蒸饺', '沙县小吃'] }),
  D('to_luosifen', '螺蛳粉', 'combo', 'takeout', 'heavy', 'LD', '1碗(约860g)', [
    ['rice_noodles_cooked', 300], ['sour_bamboo', 50], ['long_beans', 30], ['peanut', 20], ['yuba', 15], ['wood_ear', 20], ['chili_oil', 20], ['broth', 400], ['pickled_mustard', 10], ['salt', 1.5],
  ], { tags: ['spicy', 'noodle'], aliases: ['柳州螺蛳粉'] }),
  D('to_malatang', '麻辣烫(一份带粉)', 'combo', 'takeout', 'heavy', 'LD', '1碗(约760g)', [
    ['glass_noodles_dry', 50], ['chinese_cabbage', 100], ['enoki', 50], ['tofu_sheet', 30], ['fish_balls', 60], ['beef_balls', 40], ['potato', 50], ['konjac', 50], ['hotpot_base', 40], ['sesame_paste', 20], ['broth', 200],
  ], { tags: ['spicy', 'hotpot'], aliases: ['杨国福', '张亮麻辣烫', '冒菜'] }),
  D('to_mala_xiangguo', '麻辣香锅(一人份带饭)', 'combo', 'takeout', 'heavy', 'LD', '1份(约680g)', [
    ['pork_belly', 60], ['shrimp', 50], ['lotus_root', 60], ['potato', 60], ['cauliflower', 60], ['king_oyster', 50], ['yuba', 15], ['hotpot_base', 30], ['oil', 25], ['sichuan_pepper', 3], ['soy_sauce', 10], ['rice_cooked', 250], ['salt', 1],
  ], { tags: ['spicy', 'rice'], aliases: ['香锅'] }),
  D('to_suanlafen', '酸辣粉', 'combo', 'takeout', 'heavy', 'LD', '1碗(约465g)', [
    ['glass_noodles_dry', 70], ['chili_oil', 15], ['vinegar', 15], ['soy_sauce', 10], ['peanut', 15], ['soy_sprouts', 30], ['pickled_mustard', 10], ['coriander', 5], ['broth', 300], ['sugar', 3], ['salt', 1],
  ], { tags: ['spicy', 'noodle'], aliases: ['重庆酸辣粉'] }),
  D('to_chongqing_xiaomian', '重庆小面', 'combo', 'takeout', 'heavy', 'BLD', '1碗(约510g)', [
    ['noodles_cooked', 250], ['chili_oil', 15], ['doubanjiang', 10], ['soy_sauce', 10], ['peanut', 10], ['pickled_mustard', 10], ['youmaicai', 50], ['lard', 5], ['sichuan_pepper', 2], ['scallion', 5], ['broth', 150],
  ], { tags: ['spicy', 'noodle'], aliases: ['小面'] }),
  D('to_reganmian', '热干面', 'combo', 'takeout', 'normal', 'BL', '1碗(约320g)', [
    ['noodles_cooked', 250], ['sesame_paste', 30], ['soy_sauce', 10], ['chili_oil', 8], ['pickled_mustard', 15], ['scallion', 5], ['sesame_oil', 3],
  ], { tags: ['noodle'], aliases: ['武汉热干面'] }),
  D('to_chaofen', '炒米粉', 'combo', 'takeout', 'heavy', 'LD', '1份(约570g)', [
    ['rice_noodles_cooked', 300], ['egg', 50], ['pork_lean', 50], ['cabbage', 80], ['bean_sprouts', 50], ['oil', 25], ['soy_sauce', 15], ['salt', 1.5],
  ], { tags: ['noodle'], aliases: ['炒粉'] }),
  D('to_chao_hefen', '干炒牛河', 'combo', 'takeout', 'heavy', 'LD', '1份(约530g)', [
    ['rice_noodles_cooked', 300], ['beef_lean', 80], ['bean_sprouts', 60], ['garlic_chives', 30], ['onion', 30], ['oil', 30], ['soy_sauce', 20], ['sugar', 3], ['salt', 1],
  ], { tags: ['noodle'], aliases: ['炒河粉', '牛河'] }),
  D('to_kaolengmian', '烤冷面', 'combo', 'takeout', 'heavy', 'LDS', '1份(约310g)', [
    ['noodles_cooked', 150], ['egg', 50], ['hot_dog', 40], ['oil', 10], ['sweet_bean_sauce', 15], ['chili_sauce', 10], ['sugar', 5], ['vinegar', 5], ['onion', 20], ['coriander', 5],
  ], { tags: ['spicy', 'sweet'], aliases: ['东北烤冷面'] }),
  D('to_baozaifan', '腊味煲仔饭', 'combo', 'takeout', 'heavy', 'LD', '1份(约500g)', [
    ['rice_cooked', 300], ['chinese_sausage', 60], ['choy_sum', 60], ['egg', 50], ['soy_sauce', 15], ['oil', 10], ['sugar', 3],
  ], { tags: ['rice'], aliases: ['煲仔饭', '腊肠煲仔饭'] }),
  D('to_zhujiaofan', '隆江猪脚饭', 'combo', 'takeout', 'heavy', 'LD', '1份(约570g)', [
    ['pork_trotter', 150], ['rice_cooked', 300], ['sauerkraut', 40], ['egg', 50], ['soy_sauce', 20], ['sugar', 5], ['oil', 5],
  ], { tags: ['rice'], aliases: ['猪脚饭', '猪蹄饭'] }),
  D('to_luroufan', '卤肉饭', 'combo', 'takeout', 'heavy', 'LD', '1份(约490g)', [
    ['rice_cooked', 250], ['pork_belly', 80], ['egg', 50], ['soy_sauce', 20], ['sugar', 8], ['bok_choy', 50], ['shiitake', 20], ['oil', 5],
  ], { tags: ['rice'], aliases: ['台式卤肉饭'] }),
  D('to_yuxiang_rousi_fan', '鱼香肉丝盖饭', 'combo', 'takeout', 'heavy', 'LD', '1份(约580g)', [
    ['rice_cooked', 300], ['pork_lean', 80], ['carrot', 40], ['wood_ear', 30], ['bamboo_shoot', 40], ['green_pepper', 30], ['oil', 25], ['doubanjiang', 12], ['soy_sauce', 10], ['sugar', 10], ['vinegar', 10], ['starch', 8], ['salt', 0.5],
  ], { tags: ['rice', 'spicy'], aliases: ['鱼香肉丝', '盖浇饭'] }),
  D('to_gongbao_jiding_fan', '宫保鸡丁盖饭', 'combo', 'takeout', 'heavy', 'LD', '1份(约560g)', [
    ['rice_cooked', 300], ['chicken_thigh', 100], ['peanut', 25], ['cucumber', 40], ['green_pepper', 30], ['oil', 15], ['soy_sauce', 12], ['sugar', 10], ['vinegar', 8], ['starch', 8], ['chili_fresh', 5], ['salt', 1],
  ], { tags: ['rice', 'spicy'], aliases: ['宫保鸡丁', '盖浇饭'] }),
  D('to_qingjiao_rousi_fan', '青椒肉丝盖饭', 'combo', 'takeout', 'heavy', 'LD', '1份(约520g)', [
    ['rice_cooked', 300], ['pork_lean', 80], ['green_pepper', 100], ['oil', 20], ['soy_sauce', 10], ['starch', 5], ['salt', 1.5],
  ], { tags: ['rice'], aliases: ['青椒肉丝', '盖浇饭'] }),
  D('to_fanqie_niunan_fan', '番茄牛腩盖饭', 'combo', 'takeout', 'normal', 'LD', '1份(约640g)', [
    ['rice_cooked', 300], ['beef_brisket', 120], ['tomato', 150], ['onion', 30], ['oil', 12], ['ketchup', 15], ['soy_sauce', 10], ['sugar', 5], ['salt', 1.5],
  ], { tags: ['rice'], aliases: ['番茄牛腩', '西红柿牛腩饭'] }),
  D('to_curry_chicken_rice', '咖喱鸡饭', 'combo', 'takeout', 'normal', 'LD', '1份(约650g)', [
    ['rice_cooked', 300], ['chicken_thigh', 120], ['potato', 80], ['carrot', 50], ['onion', 40], ['curry_block', 25], ['oil', 10], ['coconut_milk', 20],
  ], { tags: ['rice'], aliases: ['咖喱鸡', '咖喱饭'] }),
  D('to_mutong_fan', '木桶饭(回锅肉)', 'combo', 'takeout', 'heavy', 'LD', '1份(约530g)', [
    ['rice_cooked', 300], ['pork_belly', 100], ['green_pepper', 60], ['garlic_chives', 30], ['doubanjiang', 15], ['oil', 15], ['soy_sauce', 8], ['sugar', 3], ['salt', 0.5],
  ], { tags: ['rice', 'spicy'], aliases: ['回锅肉盖饭', '木桶饭'] }),
  D('to_yangzhou_chaofan', '扬州炒饭(餐馆)', 'combo', 'takeout', 'heavy', 'LD', '1份(约510g)', [
    ['rice_cooked', 300], ['egg', 50], ['shrimp', 30], ['ham_deli', 30], ['peas', 30], ['carrot', 20], ['sweet_corn_kernels', 20], ['oil', 25], ['scallion', 5], ['salt', 2],
  ], { tags: ['rice'], aliases: ['炒饭', '蛋炒饭'] }),
  D('to_shuizhuyu', '水煮鱼(一人份)', 'protein', 'takeout', 'heavy', 'LD', '1份(约390g)', [
    ['fish_freshwater', 200], ['soy_sprouts', 100], ['chili_oil', 20], ['oil', 20], ['doubanjiang', 15], ['sichuan_pepper', 5], ['egg_white', 20], ['starch', 8], ['garlic', 10], ['ginger', 5], ['salt', 1.5],
  ], { tags: ['spicy'], aliases: ['水煮鱼片', '沸腾鱼'] }),
  D('to_kaoyu', '烤鱼一人份(带配菜)', 'protein', 'takeout', 'heavy', 'LD', '1份(约550g)', [
    ['fish_freshwater', 250], ['tofu_sheet', 30], ['lotus_root', 60], ['potato', 60], ['celery', 40], ['glass_noodles_dry', 30], ['hotpot_base', 25], ['oil', 25], ['doubanjiang', 10], ['sichuan_pepper', 3], ['soy_sauce', 8], ['salt', 1],
  ], { tags: ['spicy', 'hotpot'], aliases: ['万州烤鱼', '烤鱼'] }),
  D('to_hotpot_solo', '火锅一人份(牛油锅)', 'combo', 'takeout', 'heavy', 'LD', '1份(约580g)', [
    ['hotpot_base', 60], ['beef_brisket', 150], ['chinese_cabbage', 100], ['enoki', 50], ['potato', 50], ['rice_noodles_cooked', 100], ['tofu', 50], ['sesame_paste', 30], ['soy_sauce', 5], ['garlic', 10], ['oil', 10],
  ], { tags: ['spicy', 'hotpot'], aliases: ['火锅', '海底捞', '呷哺呷哺', '肥牛火锅'] }),
  D('to_bbq_skewers', '烧烤一人份(羊肉串+烤韭菜+馒头片)', 'combo', 'takeout', 'heavy', 'D', '1份(约320g)', [
    ['lamb', 150], ['garlic_chives', 80], ['steamed_bun', 60], ['oil', 20], ['sichuan_pepper', 5], ['sugar', 2], ['salt', 3],
  ], { tags: ['hotpot'], aliases: ['烧烤', '羊肉串', '撸串'] }),
  D('to_crayfish', '麻辣小龙虾(1斤)', 'protein', 'takeout', 'heavy', 'D', '1份(可食部约150g)', [
    ['crayfish', 150], ['chili_oil', 20], ['oil', 20], ['doubanjiang', 10], ['sichuan_pepper', 4], ['beer', 30], ['sugar', 5], ['garlic', 15], ['ginger', 5], ['salt', 1.5],
  ], { tags: ['spicy'], aliases: ['小龙虾', '麻小'] }),
  D('to_mcd_bigmac_set', '麦当劳巨无霸套餐', 'combo', 'takeout', 'fried', 'LD', '1套(汉堡+中薯+可乐)', [
    ['burger_bun', 80], ['beef_ground', 90], ['cheese', 15], ['lettuce', 20], ['onion', 10], ['thousand_island', 20], ['fries', 110], ['cola', 400], ['salt', 0.5],
  ], { tags: ['fastfood'], aliases: ['巨无霸', '麦当劳', '麦当劳套餐'] }),
  D('to_mcd_mcchicken', '麦当劳麦香鸡', 'combo', 'takeout', 'fried', 'LDS', '1个(约175g)', [
    ['burger_bun', 60], ['fried_chicken', 80], ['lettuce', 20], ['mayonnaise', 12],
  ], { tags: ['fastfood'], aliases: ['麦香鸡', '麦当劳'] }),
  D('to_kfc_original_2', '肯德基吮指原味鸡2块', 'protein', 'takeout', 'fried', 'LDS', '2块(约240g)', [
    ['fried_chicken', 240],
  ], { tags: ['fastfood'], aliases: ['原味鸡', '肯德基', 'KFC', '炸鸡'] }),
  D('to_kfc_zinger', '肯德基香辣鸡腿堡', 'combo', 'takeout', 'fried', 'LD', '1个(约215g)', [
    ['burger_bun', 70], ['fried_chicken', 110], ['lettuce', 20], ['mayonnaise', 15],
  ], { tags: ['fastfood', 'spicy'], aliases: ['香辣鸡腿堡', '肯德基', 'KFC'] }),
  D('to_pizzahut_3', '必胜客芝士披萨3片', 'combo', 'takeout', 'heavy', 'LD', '3片(约330g)', [
    ['pizza', 330],
  ], { tags: ['fastfood'], aliases: ['必胜客', '披萨'] }),
  D('to_wallace_set', '华莱士炸鸡套餐', 'combo', 'takeout', 'fried', 'LD', '1套(汉堡+鸡翅+可乐)', [
    ['burger_bun', 60], ['fried_chicken', 60], ['mayonnaise', 10], ['lettuce', 15], ['chicken_wing', 80], ['flour', 10], ['oil', 10], ['cola', 400], ['salt', 1],
  ], { tags: ['fastfood'], aliases: ['华莱士', '炸鸡套餐'] }),
  D('to_sushi_10', '寿司拼盘10件', 'combo', 'takeout', 'light', 'LD', '10件(约430g)', [
    ['rice_pressed', 200], ['salmon', 60], ['shrimp', 40], ['squid', 30], ['egg', 30], ['cucumber', 30], ['nori', 5], ['avocado', 20], ['soy_sauce', 15], ['sugar', 8], ['vinegar', 10],
  ], { aliases: ['寿司', '刺身寿司', '日料'] }),
  D('to_katsu_curry', '日式咖喱猪排饭', 'combo', 'takeout', 'fried', 'LD', '1份(约650g)', [
    ['rice_cooked', 300], ['pork_lean', 120], ['flour', 20], ['egg', 20], ['oil', 25], ['curry_block', 25], ['potato', 60], ['carrot', 40], ['onion', 40],
  ], { tags: ['rice'], aliases: ['猪排咖喱饭', '咖喱猪排', '日式咖喱'] }),
  D('to_yoshinoya_beef', '吉野家牛肉饭', 'combo', 'takeout', 'normal', 'LD', '1份(约470g)', [
    ['rice_cooked', 300], ['beef_brisket', 80], ['onion', 50], ['soy_sauce', 15], ['sugar', 8], ['cooking_wine', 10], ['oil', 5],
  ], { tags: ['rice'], aliases: ['牛肉饭', '吉野家', '牛丼', '食其家'] }),
  D('to_bibimbap', '韩式石锅拌饭', 'combo', 'takeout', 'normal', 'LD', '1份(约650g)', [
    ['rice_cooked', 250], ['beef_lean', 60], ['egg', 50], ['spinach', 50], ['carrot', 40], ['bean_sprouts', 50], ['zucchini', 40], ['shiitake', 30], ['kimchi', 40], ['chili_sauce', 20], ['sesame_oil', 10], ['oil', 10], ['sesame', 3],
  ], { tags: ['rice', 'spicy'], aliases: ['石锅拌饭', '拌饭', '韩餐'] }),
  D('to_budae_jjigae', '部队锅一人份', 'combo', 'takeout', 'heavy', 'LD', '1份(约700g)', [
    ['instant_noodles', 60], ['luncheon_meat', 50], ['hot_dog', 40], ['kimchi', 80], ['tofu', 80], ['enoki', 50], ['cheese', 20], ['chili_sauce', 10], ['broth', 150], ['rice_cooked', 150], ['scallion', 10],
  ], { tags: ['spicy', 'hotpot'], aliases: ['部队火锅', '芝士部队锅', '韩餐'] }),
  D('to_pho', '越南牛肉河粉', 'combo', 'takeout', 'normal', 'BLD', '1碗(约970g)', [
    ['rice_noodles_cooked', 300], ['beef_lean', 80], ['bean_sprouts', 50], ['onion', 20], ['coriander', 5], ['lemon', 10], ['broth', 500], ['chili_fresh', 5], ['salt', 1.5],
  ], { tags: ['noodle'], aliases: ['越南粉', 'pho', '牛肉河粉'] }),
  D('to_pad_thai', '泰式炒河粉', 'combo', 'takeout', 'heavy', 'LD', '1份(约480g)', [
    ['rice_noodles_cooked', 250], ['shrimp', 60], ['egg', 50], ['bean_sprouts', 50], ['garlic_chives', 20], ['peanut', 15], ['oil', 20], ['sugar', 12], ['soy_sauce', 10], ['lemon', 10], ['chili_fresh', 3],
  ], { tags: ['noodle'], aliases: ['pad thai', '泰餐'] }),
  D('to_light_chicken_salad', '轻食鸡胸沙拉外卖', 'combo', 'takeout', 'light', 'LD', '1份(约480g)', [
    ['chicken_breast', 100], ['lettuce', 100], ['cherry_tomato', 60], ['sweet_corn_kernels', 40], ['egg', 50], ['broccoli', 50], ['quinoa_cooked', 50], ['cabbage', 30], ['vinaigrette', 20],
  ], { aliases: ['轻食', '沙拉外卖', '减脂餐'] }),
  D('to_chicken_roll', '鸡肉卷(老乡鸡/肯德基类)', 'combo', 'takeout', 'fried', 'BLD', '1个(约195g)', [
    ['tortilla', 60], ['fried_chicken', 70], ['lettuce', 30], ['cucumber', 20], ['thousand_island', 15],
  ], { tags: ['fastfood'], aliases: ['老北京鸡肉卷', '鸡肉卷', '肯德基'] }),
  D('to_jianbing', '煎饼果子(餐车)', 'breakfast', 'takeout', 'heavy', 'BL', '1个(约205g)', [
    ['flour', 40], ['mung_beans_dry', 20], ['egg', 50], ['youtiao', 30], ['lettuce', 20], ['sweet_bean_sauce', 15], ['chili_sauce', 8], ['oil', 8], ['scallion', 5], ['coriander', 3], ['pickled_mustard', 10],
  ], { aliases: ['煎饼', '煎饼馃子'] }),
  D('to_roujiamo', '肉夹馍', 'combo', 'takeout', 'normal', 'BLD', '1个(约165g)', [
    ['flour', 80], ['pork_belly', 60], ['green_pepper', 10], ['coriander', 5], ['soy_sauce', 8], ['sugar', 2], ['salt', 0.5],
  ], { aliases: ['腊汁肉夹馍', '白吉馍'] }),
  D('to_liangpi', '凉皮', 'combo', 'takeout', 'normal', 'LD', '1份(约240g)', [
    ['starch', 50], ['flour', 20], ['cucumber', 50], ['bean_sprouts', 40], ['chili_oil', 12], ['vinegar', 15], ['soy_sauce', 8], ['garlic', 8], ['sesame_paste', 10], ['salt', 1],
  ], { tags: ['cold', 'spicy'], aliases: ['陕西凉皮', '擀面皮', '米皮'] }),
  D('to_yangrou_paomo', '羊肉泡馍', 'combo', 'takeout', 'normal', 'LD', '1碗(约650g)', [
    ['flour', 100], ['lamb', 100], ['glass_noodles_dry', 20], ['wood_ear', 15], ['broth', 400], ['coriander', 5], ['garlic', 10], ['salt', 2],
  ], { aliases: ['泡馍', '西安泡馍'] }),
  D('to_shengjian_6', '生煎6个', 'breakfast', 'takeout', 'heavy', 'BL', '6个(约200g)', [
    ['flour', 80], ['pork_ground', 70], ['oil', 10], ['soy_sauce', 6], ['sugar', 3], ['sesame', 3], ['scallion', 5], ['salt', 1],
  ], { aliases: ['生煎包', '上海生煎'] }),
  D('to_xiaolongbao', '小笼包1笼(8个)', 'breakfast', 'takeout', 'normal', 'BL', '1笼(约220g)', [
    ['flour', 70], ['pork_ground', 80], ['soy_sauce', 6], ['sugar', 3], ['ginger', 3], ['sesame_oil', 3], ['salt', 1],
  ], { aliases: ['小笼', '汤包', '鼎泰丰'] }),
  D('to_shaoya_fan', '烧鸭饭', 'combo', 'takeout', 'heavy', 'LD', '1份(约480g)', [
    ['rice_cooked', 300], ['roast_duck', 100], ['choy_sum', 60], ['soy_sauce', 12], ['sugar', 5], ['oil', 5],
  ], { tags: ['rice'], aliases: ['烧鸭', '烧腊饭', '烤鸭饭'] }),
  D('to_chashao_fan', '叉烧饭', 'combo', 'takeout', 'normal', 'LD', '1份(约500g)', [
    ['rice_cooked', 300], ['pork_lean', 100], ['honey', 10], ['sweet_bean_sauce', 10], ['oil', 8], ['choy_sum', 60], ['soy_sauce', 10],
  ], { tags: ['rice'], aliases: ['叉烧', '烧腊饭', '蜜汁叉烧'] }),

  // ============================ 便利店 (cv_) ============================
  D('cv_sandwich', '便利店三明治', 'combo', 'convenience', 'normal', 'BLS', '1份(约160g)', [
    ['bread_white', 60], ['ham_deli', 30], ['egg', 30], ['lettuce', 15], ['mayonnaise', 12], ['cheese', 10],
  ], { aliases: ['三明治', '全家三明治', '7-11三明治'] }),
  D('cv_onigiri', '便利店饭团', 'snack', 'convenience', 'light', 'BLS', '1个(约130g)', [
    ['rice_pressed', 100], ['tuna_canned', 20], ['mayonnaise', 8], ['nori', 2], ['salt', 0.5],
  ], { aliases: ['饭团', '金枪鱼饭团', '御饭团'] }),
  D('cv_oden', '关东煮一份', 'snack', 'convenience', 'light', 'LDS', '1份(约470g)', [
    ['fish_balls', 60], ['white_radish', 80], ['tofu', 50], ['kelp', 30], ['konjac', 50], ['broth', 200], ['salt', 0.5],
  ], { aliases: ['关东煮', '好炖', '便利店关东煮'] }),
  D('cv_bento', '便利店便当', 'combo', 'convenience', 'normal', 'LD', '1盒(约390g)', [
    ['rice_cooked', 200], ['chicken_thigh', 70], ['egg', 30], ['cabbage', 40], ['carrot', 20], ['chinese_sausage', 15], ['oil', 8], ['soy_sauce', 8], ['salt', 1],
  ], { tags: ['rice'], aliases: ['便当', '盒饭', '便利店盒饭'] }),
  D('cv_baozi_2', '便利店包子2个', 'breakfast', 'convenience', 'normal', 'BLS', '2个(约210g)', [
    ['flour', 100], ['pork_ground', 60], ['chinese_cabbage', 40], ['oil', 5], ['soy_sauce', 5], ['sugar', 3], ['salt', 1],
  ], { aliases: ['包子', '肉包', '鲜肉包'] }),
  D('cv_tea_egg', '茶叶蛋', 'snack', 'convenience', 'light', 'BS', '1个(约55g)', [
    ['egg', 50], ['soy_sauce', 3], ['tea', 5], ['salt', 0.3],
  ], { aliases: ['茶蛋'] }),
  D('cv_grilled_sausage', '烤肠1根', 'snack', 'convenience', 'normal', 'S', '1根(约70g)', [
    ['hot_dog', 70],
  ], { aliases: ['烤香肠', '台湾烤肠', '便利店烤肠'] }),
  D('cv_cup_noodles', '泡面1桶', 'combo', 'convenience', 'heavy', 'LDS', '1桶(干重约100g)', [
    ['instant_noodles', 100],
  ], { tags: ['noodle'], aliases: ['桶面', '方便面', '康师傅', '统一'] }),
  D('cv_noodles_egg_sausage', '泡面加蛋加火腿肠', 'combo', 'convenience', 'heavy', 'LDS', '1份(干重约190g)', [
    ['instant_noodles', 100], ['egg', 50], ['hot_dog', 40],
  ], { tags: ['noodle'], aliases: ['方便面加蛋', '泡面加料'] }),
  D('cv_chicken_breast_pack', '即食鸡胸肉1袋', 'protein', 'convenience', 'light', 'BLDS', '1袋(约100g)', [
    ['chicken_breast', 100], ['salt', 1], ['sugar', 2],
  ], { aliases: ['鸡胸肉', '即食鸡胸', '低脂鸡胸'] }),
  D('cv_boiled_corn', '水煮玉米1根', 'staple', 'convenience', 'light', 'BLS', '1根(玉米粒可食约120g)', [
    ['corn', 120],
  ], { aliases: ['玉米', '甜玉米', '煮玉米'] }),
  D('cv_braised_egg', '卤蛋1个', 'snack', 'convenience', 'light', 'BS', '1个(约55g)', [
    ['egg', 50], ['soy_sauce', 5], ['sugar', 1],
  ], { aliases: ['卤鸡蛋', '酱蛋'] }),
  D('cv_saqima', '萨其马1块', 'snack', 'convenience', 'fried', 'S', '1块(约55g)', [
    ['flour', 22], ['sugar', 12], ['oil', 10], ['egg', 8], ['syrup', 5],
  ], { tags: ['sweet'], aliases: ['沙琪玛'] }),
  D('cv_salad', '便利店沙拉', 'veg', 'convenience', 'light', 'LDS', '1盒(约290g)', [
    ['lettuce', 80], ['cabbage', 30], ['carrot', 20], ['sweet_corn_kernels', 30], ['cherry_tomato', 40], ['egg', 30], ['chicken_breast', 40], ['thousand_island', 20],
  ], { aliases: ['沙拉', '蔬菜沙拉', '便利店轻食'] }),
  D('cv_yogurt_cup', '便利店酸奶1杯', 'snack', 'convenience', 'light', 'BS', '1杯(约200g)', [
    ['yogurt', 200],
  ], { aliases: ['酸奶', '风味酸奶'] }),
  D('cv_chicken_wrap', '便利店鸡肉卷', 'combo', 'convenience', 'normal', 'BLS', '1个(约155g)', [
    ['tortilla', 50], ['chicken_breast', 50], ['lettuce', 20], ['cucumber', 15], ['thousand_island', 12], ['cheese', 8],
  ], { aliases: ['鸡肉卷', '便利店卷饼'] }),
]
