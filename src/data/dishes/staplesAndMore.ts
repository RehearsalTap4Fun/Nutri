import type { Dish } from '../../core/types'
import { D } from './helper'

// 主食 / 早餐 / 水果 / 家庭小食与加餐 / 饮品
// 份量为一人份常见家庭份量；液体按 1 ml ≈ 1 g
export const DISHES_STAPLES_MORE: Dish[] = [
  // ===================== 主食 st_ =====================
  D('st_brown_rice', '糙米饭', 'staple', 'cn', 'light', 'LD', '1碗(约200g)', [['brown_rice_cooked', 200]]),
  D('st_mixed_rice', '杂粮饭', 'staple', 'cn', 'light', 'LD', '1碗(约200g)', [
    ['rice_cooked', 100], ['brown_rice_cooked', 100],
  ], { aliases: ['二米饭', '糙米白米饭'] }),
  D('st_quinoa_rice', '藜麦饭', 'staple', 'cn', 'light', 'LD', '1碗(约200g)', [
    ['quinoa_cooked', 80], ['rice_cooked', 120],
  ]),
  D('st_millet_porridge', '小米粥', 'staple', 'cn', 'light', 'BLD', '1碗(约300g)', [['millet_porridge', 300]]),
  D('st_oat_porridge', '燕麦粥(水煮)', 'staple', 'cn', 'light', 'BLD', '1碗(约300g)', [
    ['oats', 40], ['water', 260],
  ], { aliases: ['清水燕麦'] }),
  D('st_pumpkin_porridge', '南瓜粥', 'staple', 'cn', 'light', 'BLD', '1碗(约400g)', [
    ['pumpkin', 150], ['rice_raw', 25], ['water', 250],
  ], { tags: ['sweet'] }),
  D('st_century_egg_congee', '皮蛋瘦肉粥', 'staple', 'cn', 'light', 'BLD', '1碗(约420g)', [
    ['congee', 350], ['century_egg', 30], ['pork_lean', 30], ['oil', 2], ['salt', 1], ['scallion', 5],
  ]),
  D('st_babao_porridge', '八宝粥', 'staple', 'cn', 'light', 'BS', '1碗(约350g)', [
    ['glutinous_rice_raw', 30], ['red_beans_dry', 15], ['red_dates', 10], ['peanut', 8], ['raisins', 5], ['sugar', 12], ['water', 250],
  ], { tags: ['sweet'] }),
  D('st_mantou', '馒头', 'staple', 'cn', 'light', 'BLD', '1个(约100g)', [['steamed_bun', 100]]),
  D('st_huajuan', '花卷', 'staple', 'cn', 'light', 'BLD', '1个(约100g)', [
    ['steamed_bun', 90], ['oil', 3], ['scallion', 5], ['salt', 0.5],
  ]),
  D('st_wotou', '玉米面窝头', 'staple', 'cn', 'light', 'BLD', '2个(约100g)', [
    ['cornmeal', 45], ['flour', 20],
  ], { aliases: ['窝窝头'] }),
  D('st_whole_bread', '全麦面包片', 'staple', 'west', 'light', 'BLD', '2片(约70g)', [['bread_whole', 70]], { tags: ['quick'] }),
  D('st_steamed_sweet_potato', '蒸红薯', 'staple', 'cn', 'light', 'BLDS', '1个(约200g)', [['sweet_potato', 200]], { aliases: ['蒸地瓜'] }),
  D('st_boiled_corn', '水煮玉米', 'staple', 'cn', 'light', 'BLDS', '1根(玉米粒可食约120g)', [['corn', 120]]),
  D('st_steamed_yam', '蒸山药', 'staple', 'cn', 'light', 'BLD', '1段(约200g)', [['yam', 200]]),
  D('st_steamed_potato', '蒸土豆', 'staple', 'cn', 'light', 'BLD', '1个(约200g)', [['potato', 200]]),
  D('st_plain_noodles', '白水煮面(无汤)', 'staple', 'cn', 'light', 'LD', '1碗(约250g)', [['noodles_cooked', 250]]),
  D('st_clear_noodle_soup', '清汤面', 'staple', 'cn', 'light', 'BLD', '1碗(约600g)', [
    ['noodles_cooked', 250], ['broth', 300], ['bok_choy', 50], ['oil', 3], ['salt', 1],
  ]),
  D('st_yangchun_noodles', '阳春面', 'staple', 'cn', 'normal', 'BLD', '1碗(约570g)', [
    ['noodles_cooked', 250], ['broth', 300], ['lard', 5], ['soy_sauce', 8], ['scallion', 5],
  ]),
  D('st_egg_fried_rice', '蛋炒饭', 'staple', 'cn', 'normal', 'LD', '1盘(约320g)', [
    ['rice_cooked', 250], ['egg', 50], ['oil', 12], ['scallion', 10], ['salt', 1],
  ]),
  D('st_yangzhou_fried_rice', '扬州炒饭', 'staple', 'cn', 'normal', 'LD', '1盘(约400g)', [
    ['rice_cooked', 250], ['egg', 50], ['shrimp', 30], ['ham_deli', 20], ['peas', 20], ['carrot', 20], ['oil', 12], ['salt', 1],
  ], { aliases: ['什锦炒饭'] }),
  D('st_fried_noodles', '炒面', 'staple', 'cn', 'normal', 'LD', '1盘(约400g)', [
    ['noodles_cooked', 250], ['cabbage', 60], ['bean_sprouts', 30], ['pork_lean', 40], ['oil', 12], ['soy_sauce', 8],
  ]),
  D('st_fried_rice_cake', '炒年糕', 'staple', 'cn', 'normal', 'LD', '1盘(约310g)', [
    ['rice_cake', 200], ['cabbage', 60], ['pork_lean', 30], ['oil', 10], ['soy_sauce', 8],
  ], { aliases: ['年糕'] }),
  D('st_veg_dumplings', '素饺子', 'staple', 'cn', 'normal', 'LD', '12个(约260g)', [
    ['dumpling_wrapper', 120], ['garlic_chives', 60], ['egg', 50], ['wood_ear', 20], ['oil', 8], ['salt', 1],
  ], { aliases: ['韭菜木耳鸡蛋饺'] }),
  D('st_pork_cabbage_dumplings', '猪肉白菜饺子', 'staple', 'cn', 'normal', 'LD', '12个(约290g)', [
    ['dumpling_wrapper', 120], ['pork_ground', 80], ['chinese_cabbage', 80], ['oil', 5], ['soy_sauce', 4], ['salt', 0.5], ['ginger', 3],
  ], { aliases: ['白菜猪肉水饺'] }),
  D('st_chive_egg_dumplings', '韭菜鸡蛋饺子', 'staple', 'cn', 'normal', 'LD', '12个(约270g)', [
    ['dumpling_wrapper', 120], ['garlic_chives', 80], ['egg', 60], ['oil', 8], ['salt', 1],
  ]),
  D('st_pork_bun', '鲜肉包', 'staple', 'cn', 'normal', 'BLD', '1个大包(约110g)', [
    ['flour', 50], ['pork_ground', 35], ['onion', 10], ['soy_sauce', 6], ['oil', 3], ['sugar', 3], ['scallion', 5],
  ], { aliases: ['肉包子', '肉包'] }),
  D('st_veg_bun', '素包子', 'staple', 'cn', 'light', 'BLD', '1个大包(约130g)', [
    ['flour', 50], ['chinese_cabbage', 40], ['tofu_dried', 15], ['wood_ear', 10], ['shiitake', 10], ['oil', 5], ['salt', 1],
  ], { aliases: ['菜包', '香菇青菜包'] }),
  D('st_scallion_pancake', '葱油饼', 'staple', 'cn', 'heavy', 'BLD', '1张(约110g)', [
    ['flour', 80], ['oil', 10], ['scallion', 15], ['salt', 1],
  ]),
  D('st_shouzhuabing', '手抓饼(原味)', 'staple', 'cn', 'heavy', 'BLD', '1张(约80g)', [
    ['flour', 60], ['oil', 8], ['butter', 4], ['salt', 0.8],
  ]),
  D('st_laobing', '烙饼', 'staple', 'cn', 'normal', 'BLD', '1张(约90g)', [
    ['flour', 80], ['oil', 6], ['salt', 1],
  ], { aliases: ['家常饼', '死面饼'] }),

  // ===================== 早餐 bf_ =====================
  D('bf_soymilk_youtiao', '豆浆油条', 'breakfast', 'cn', 'fried', 'B', '1杯豆浆+1根油条(约380g)', [
    ['sweet_soy_milk', 300], ['youtiao', 80],
  ]),
  D('bf_mantou_soymilk', '馒头配豆浆', 'breakfast', 'cn', 'light', 'B', '1个馒头+1杯无糖豆浆', [
    ['steamed_bun', 100], ['soy_milk', 300],
  ]),
  D('bf_congee_pickle_egg', '白粥配咸菜鸡蛋', 'breakfast', 'cn', 'light', 'B', '1碗粥+1个蛋+咸菜', [
    ['congee', 350], ['pickled_mustard', 20], ['egg', 50],
  ]),
  D('bf_egg_pancake', '鸡蛋饼', 'breakfast', 'cn', 'normal', 'B', '1张(约120g)', [
    ['flour', 50], ['egg', 50], ['scallion', 10], ['oil', 8], ['salt', 1],
  ], { aliases: ['鸡蛋软饼'] }),
  D('bf_jianbing', '煎饼果子', 'breakfast', 'cn', 'normal', 'B', '1套(约240g)', [
    ['flour', 60], ['egg', 50], ['soda_crackers', 20], ['sweet_bean_sauce', 14.5], ['chili_sauce', 5], ['lettuce', 20], ['scallion', 5], ['coriander', 3], ['oil', 5],
  ], { aliases: ['煎饼'] }),
  D('bf_shouzhuabing_egg', '手抓饼加蛋', 'breakfast', 'cn', 'heavy', 'B', '1份(约170g)', [
    ['flour', 60], ['oil', 12], ['butter', 5], ['egg', 50], ['lettuce', 20], ['sweet_bean_sauce', 8],
  ]),
  D('bf_xiaolongbao', '小笼包', 'breakfast', 'cn', 'normal', 'BLD', '1笼8个(约200g)', [
    ['flour', 60], ['pork_ground', 70], ['broth', 20], ['lard', 4], ['ginger', 3], ['soy_sauce', 5], ['sugar', 3], ['oil', 2],
  ], { aliases: ['小笼', '汤包'] }),
  D('bf_shaomai', '烧麦', 'breakfast', 'cn', 'normal', 'BLD', '4个(约200g)', [
    ['flour', 40], ['glutinous_rice_raw', 40], ['pork_ground', 30], ['shiitake', 10], ['soy_sauce', 8], ['oil', 5],
  ], { aliases: ['烧卖', '糯米烧麦'] }),
  D('bf_steamed_dumplings', '蒸饺', 'breakfast', 'cn', 'normal', 'BLD', '8个(约190g)', [
    ['dumpling_wrapper', 100], ['pork_ground', 50], ['garlic_chives', 30], ['soy_sauce', 6], ['oil', 4],
  ]),
  D('bf_wonton', '鲜肉馄饨', 'breakfast', 'cn', 'normal', 'BLD', '1碗12个(约430g)', [
    ['dumpling_wrapper', 60], ['pork_ground', 60], ['broth', 300], ['scallion', 5], ['sesame_oil', 3], ['salt', 1], ['nori', 2],
  ], { aliases: ['小馄饨', '云吞'] }),
  D('bf_changfen', '肠粉', 'breakfast', 'cn', 'light', 'B', '1份(约290g)', [
    ['rice_noodles_cooked', 200], ['egg', 50], ['soy_sauce', 8], ['oil', 5], ['scallion', 5], ['lettuce', 20],
  ], { aliases: ['鸡蛋肠粉'] }),
  D('bf_tofu_pudding', '豆腐脑', 'breakfast', 'cn', 'light', 'B', '1碗(约330g)', [
    ['tofu_soft', 300], ['soy_sauce', 5.5], ['sesame_oil', 3], ['wood_ear', 15], ['coriander', 3], ['starch', 5], ['salt', 0.5],
  ], { aliases: ['豆花', '咸豆腐脑'] }),
  D('bf_cifantuan', '粢饭团', 'breakfast', 'cn', 'normal', 'B', '1个(约220g)', [
    ['glutinous_rice_raw', 80], ['youtiao', 30], ['pickled_mustard', 15], ['sugar', 5],
  ], { aliases: ['糍饭团', '饭团(油条榨菜)'] }),
  D('bf_tea_egg', '茶叶蛋', 'breakfast', 'cn', 'light', 'BS', '1个(约50g)', [
    ['egg', 50], ['soy_sauce', 3], ['salt', 0.3], ['tea', 5],
  ], { tags: ['quick'] }),
  D('bf_braised_egg', '卤蛋', 'breakfast', 'cn', 'light', 'BS', '1个(约50g)', [
    ['egg', 50], ['soy_sauce', 5], ['sugar', 1],
  ], { tags: ['quick'] }),
  D('bf_fried_egg', '煎蛋', 'breakfast', 'cn', 'normal', 'BLD', '1个(约55g)', [
    ['egg', 50], ['oil', 5], ['salt', 0.3],
  ], { aliases: ['荷包蛋', '煎鸡蛋'], tags: ['quick'] }),
  D('bf_two_boiled_eggs', '水煮蛋两个', 'breakfast', 'cn', 'light', 'BS', '2个(约100g)', [['egg', 100]], { tags: ['quick'] }),
  D('bf_omelette', '欧姆蛋', 'breakfast', 'west', 'normal', 'B', '1份(约140g)', [
    ['egg', 100], ['milk', 20], ['cheese', 15], ['butter', 5], ['salt', 0.5],
  ], { aliases: ['西式蛋卷', '芝士蛋卷'] }),
  D('bf_scrambled_egg_toast', '炒蛋吐司', 'breakfast', 'west', 'normal', 'B', '2个蛋+2片全麦', [
    ['egg', 100], ['bread_whole', 60], ['butter', 5], ['salt', 0.5],
  ]),
  D('bf_oat_milk_porridge', '燕麦牛奶粥', 'breakfast', 'west', 'light', 'B', '1碗(约290g)', [
    ['oats', 40], ['milk', 250],
  ], { aliases: ['牛奶燕麦'], tags: ['quick'] }),
  D('bf_cereal_milk', '牛奶麦片', 'breakfast', 'west', 'light', 'B', '1碗(约290g)', [
    ['cereal_flakes', 40], ['milk', 250],
  ], { aliases: ['玉米片牛奶'], tags: ['sweet', 'quick'] }),
  D('bf_protein_oat_bowl', '蛋白燕麦碗', 'breakfast', 'west', 'light', 'B', '1碗(约290g)', [
    ['oats', 40], ['whey_protein', 30], ['milk', 150], ['banana', 60], ['chia', 5],
  ], { aliases: ['高蛋白燕麦'] }),
  D('bf_greek_yogurt_bowl', '希腊酸奶水果碗', 'breakfast', 'west', 'light', 'BS', '1碗(约290g)', [
    ['greek_yogurt', 150], ['blueberry', 50], ['banana', 50], ['granola', 30], ['honey', 8],
  ], { tags: ['sweet', 'quick', 'cold'] }),
  D('bf_egg_sandwich', '鸡蛋三明治', 'breakfast', 'west', 'light', 'BS', '1个(约170g)', [
    ['bread_white', 60], ['egg', 50], ['lettuce', 20], ['tomato', 30], ['mayonnaise', 8],
  ], { tags: ['quick'] }),
  D('bf_ham_sandwich', '火腿三明治', 'breakfast', 'west', 'normal', 'BS', '1个(约170g)', [
    ['bread_white', 60], ['ham_deli', 30], ['cheese', 20], ['lettuce', 20], ['tomato', 30], ['mayonnaise', 15],
  ], { aliases: ['火腿芝士三明治'], tags: ['quick'] }),
  D('bf_toast_milk', '吐司加牛奶', 'breakfast', 'west', 'light', 'B', '2片吐司+1杯牛奶', [
    ['bread_white', 60], ['butter', 3], ['milk', 250],
  ], { tags: ['quick'] }),
  D('bf_toast_butter_honey', '烤面包配黄油蜂蜜', 'breakfast', 'west', 'normal', 'B', '2片(约85g)', [
    ['bread_white', 60], ['butter', 8], ['honey', 15],
  ], { aliases: ['黄油果酱吐司'], tags: ['sweet', 'quick'] }),
  D('bf_banana_pb_toast', '香蕉花生酱吐司', 'breakfast', 'west', 'light', 'BS', '2片(约175g)', [
    ['bread_whole', 60], ['peanut_butter', 15], ['banana', 100],
  ], { tags: ['sweet', 'quick'] }),
  D('bf_avocado_toast', '牛油果吐司', 'breakfast', 'west', 'normal', 'B', '2片+1个蛋(约185g)', [
    ['bread_whole', 60], ['avocado', 70], ['egg', 50], ['olive_oil', 3], ['salt', 0.5],
  ], { aliases: ['牛油果鸡蛋吐司'] }),
  D('bf_corn_egg_milk', '玉米鸡蛋牛奶', 'breakfast', 'cn', 'light', 'B', '1根玉米+1个蛋+1杯牛奶', [
    ['corn', 110], ['egg', 50], ['milk', 250],
  ], { tags: ['quick'] }),
  D('bf_sweetpotato_egg', '红薯鸡蛋', 'breakfast', 'cn', 'light', 'B', '1个红薯+1个蛋(约250g)', [
    ['sweet_potato', 200], ['egg', 50],
  ], { tags: ['quick'] }),

  // ===================== 水果 fr_ =====================
  D('fr_apple', '苹果', 'fruit', 'cn', 'light', 'BS', '1个(可食约170g)', [['apple', 170]]),
  D('fr_banana', '香蕉', 'fruit', 'cn', 'light', 'BS', '1根(去皮可食约80g)', [['banana', 80]]),
  D('fr_orange', '橙子', 'fruit', 'cn', 'light', 'BS', '1个(可食约150g)', [['orange', 150]]),
  D('fr_grape', '葡萄', 'fruit', 'cn', 'light', 'BS', '1小串(约150g)', [['grape', 150]]),
  D('fr_watermelon', '西瓜', 'fruit', 'cn', 'light', 'BS', '2块(约300g)', [['watermelon', 300]]),
  D('fr_strawberry', '草莓', 'fruit', 'cn', 'light', 'BS', '1盒(约150g)', [['strawberry', 150]]),
  D('fr_blueberry', '蓝莓', 'fruit', 'cn', 'light', 'BS', '1盒(约125g)', [['blueberry', 125]]),
  D('fr_kiwi', '猕猴桃', 'fruit', 'cn', 'light', 'BS', '2个(去皮可食约130g)', [['kiwi', 130]], { aliases: ['奇异果'] }),
  D('fr_pear', '梨', 'fruit', 'cn', 'light', 'BS', '1个(可食约180g)', [['pear', 180]]),
  D('fr_peach', '桃', 'fruit', 'cn', 'light', 'BS', '1个(可食约160g)', [['peach', 160]], { aliases: ['桃子', '水蜜桃'] }),
  D('fr_mango', '芒果', 'fruit', 'cn', 'light', 'BS', '1个(去皮去核可食约130g)', [['mango', 130]]),
  D('fr_pomelo', '柚子', 'fruit', 'cn', 'light', 'BS', '3瓣(约200g)', [['pomelo', 200]]),
  D('fr_dragon_fruit', '火龙果', 'fruit', 'cn', 'light', 'BS', '半个(可食约170g)', [['dragon_fruit', 170]]),
  D('fr_cherry_tomato', '圣女果', 'fruit', 'cn', 'light', 'BS', '1碟(约150g)', [['cherry_tomato', 150]], { aliases: ['小番茄'] }),
  D('fr_avocado_half', '牛油果', 'fruit', 'west', 'light', 'BS', '半个(约80g)', [['avocado', 80]]),
  D('fr_mixed_platter', '混合水果拼盘', 'fruit', 'cn', 'light', 'BS', '1盘(约250g)', [
    ['apple', 80], ['watermelon', 80], ['grape', 50], ['kiwi', 40],
  ], { aliases: ['水果拼盘', '果切'] }),

  // ===================== 家庭小食与加餐 sn_ =====================
  D('sn_mixed_nuts', '混合坚果一小把', 'snack', 'cn', 'light', 'S', '1小把(约25g)', [['nuts_mixed', 25]], { aliases: ['每日坚果'] }),
  D('sn_walnut', '核桃', 'snack', 'cn', 'light', 'S', '3个(仁约20g)', [['walnut', 20]]),
  D('sn_almond', '杏仁', 'snack', 'cn', 'light', 'S', '15粒(约18g)', [['almond', 18]], { aliases: ['巴旦木'] }),
  D('sn_sunflower_seeds', '瓜子', 'snack', 'cn', 'light', 'S', '1把(仁约25g)', [['sunflower_seeds', 25]]),
  D('sn_yogurt', '原味酸奶', 'snack', 'cn', 'light', 'S', '1杯(约200g)', [['yogurt', 200]], { tags: ['cold', 'quick'] }),
  D('sn_greek_yogurt', '希腊酸奶', 'snack', 'west', 'light', 'S', '1杯(约150g)', [['greek_yogurt', 150]], { tags: ['cold', 'quick'] }),
  D('sn_boiled_edamame', '水煮毛豆', 'snack', 'cn', 'light', 'S', '1碟(豆约100g)', [['edamame', 100], ['salt', 0.5]]),
  D('sn_boiled_chicken_breast', '水煮鸡胸肉', 'snack', 'cn', 'light', 'S', '1块(约100g)', [['chicken_breast', 100], ['salt', 0.5]]),
  D('sn_egg_whites', '鸡蛋白', 'snack', 'cn', 'light', 'S', '3个(约100g)', [['egg_white', 100]]),
  D('sn_whey_water', '蛋白粉冲水', 'snack', 'west', 'light', 'S', '1勺(30g)+300ml水', [['whey_protein', 30], ['water', 300]], { aliases: ['蛋白粉'], tags: ['quick'] }),
  D('sn_whey_milk', '蛋白粉牛奶', 'snack', 'west', 'light', 'S', '1勺(30g)+250ml牛奶', [['whey_protein', 30], ['milk', 250]], { tags: ['quick'] }),
  D('sn_protein_bar', '蛋白棒', 'snack', 'convenience', 'light', 'S', '1根(约60g)', [['protein_bar', 60]], { tags: ['quick'] }),
  D('sn_dark_chocolate', '黑巧克力', 'snack', 'convenience', 'light', 'S', '2块(约20g)', [['chocolate', 20]], { tags: ['sweet'] }),
  D('sn_biscuits', '饼干', 'snack', 'convenience', 'normal', 'S', '4片(约32g)', [['biscuits', 32]], { tags: ['sweet'] }),
  D('sn_soda_crackers', '苏打饼干', 'snack', 'convenience', 'light', 'S', '4片(约30g)', [['soda_crackers', 30]]),
  D('sn_chips', '薯片', 'snack', 'convenience', 'fried', 'S', '1小袋(约50g)', [['potato_chips', 50]]),
  D('sn_popcorn', '爆米花', 'snack', 'convenience', 'normal', 'S', '1小桶(约50g)', [['popcorn', 50]], { tags: ['sweet'] }),
  D('sn_baked_sweet_potato', '烤红薯', 'snack', 'cn', 'light', 'S', '1个(约200g)', [['sweet_potato', 200]], { tags: ['sweet'] }),
  D('sn_cucumber', '黄瓜', 'snack', 'cn', 'light', 'S', '1根(约150g)', [['cucumber', 150]], { tags: ['cold', 'quick'] }),
  D('sn_cheese_slice', '奶酪', 'snack', 'west', 'light', 'S', '1片(约20g)', [['cheese', 20]]),
  D('sn_beef_jerky', '牛肉干', 'snack', 'cn', 'light', 'S', '1小包(约30g)', [['beef_jerky', 30]]),
  D('sn_red_dates', '红枣', 'snack', 'cn', 'light', 'S', '5颗(约25g)', [['red_dates', 25]], { tags: ['sweet'] }),
  D('sn_tofu_dried', '豆腐干', 'snack', 'cn', 'light', 'S', '1小包(约50g)', [['tofu_dried', 50], ['soy_sauce', 3]]),
  D('sn_seaweed', '烤海苔', 'snack', 'convenience', 'light', 'S', '1包(约5g)', [['seaweed_snack', 5]]),
  D('sn_ice_cream', '冰淇淋', 'snack', 'convenience', 'light', 'S', '1个(约80g)', [['ice_cream', 80]], { tags: ['sweet', 'cold'] }),
  D('sn_egg_tart', '蛋挞', 'snack', 'convenience', 'normal', 'S', '1个(约60g)', [['egg_tart', 60]], { tags: ['sweet'] }),
  D('sn_cake_slice', '奶油蛋糕', 'snack', 'convenience', 'normal', 'S', '1块(约80g)', [['cake', 80]], { tags: ['sweet'] }),

  // ===================== 饮品 dr_ =====================
  D('dr_milk', '牛奶', 'drink', 'cn', 'light', 'BLDS', '1杯(250ml)', [['milk', 250]], { aliases: ['纯牛奶', '全脂牛奶'], tags: ['quick'] }),
  D('dr_skim_milk', '脱脂牛奶', 'drink', 'cn', 'light', 'BLDS', '1杯(250ml)', [['milk_skim', 250]], { tags: ['quick'] }),
  D('dr_soy_milk', '无糖豆浆', 'drink', 'cn', 'light', 'BS', '1杯(300ml)', [['soy_milk', 300]], { aliases: ['豆浆'] }),
  D('dr_sweet_soy_milk', '甜豆浆', 'drink', 'cn', 'light', 'BS', '1杯(300ml)', [['sweet_soy_milk', 300]], { tags: ['sweet'] }),
  D('dr_americano', '美式咖啡', 'drink', 'west', 'light', 'BLDS', '1杯(300ml)', [['black_coffee', 300]], { aliases: ['黑咖啡'], tags: ['caffeine', 'quick'] }),
  D('dr_latte', '拿铁', 'drink', 'west', 'light', 'BLDS', '1杯(250ml)', [['milk', 200], ['black_coffee', 50]], { aliases: ['牛奶咖啡'], tags: ['caffeine'] }),
  D('dr_oat_latte', '燕麦拿铁', 'drink', 'west', 'light', 'BLDS', '1杯(250ml)', [['oat_milk', 200], ['black_coffee', 50]], { tags: ['caffeine'] }),
  D('dr_tea', '无糖茶', 'drink', 'cn', 'light', 'BLDS', '1杯(300ml)', [['tea', 300]], { aliases: ['绿茶', '红茶', '乌龙茶'], tags: ['caffeine', 'quick'] }),
  D('dr_bubble_tea', '珍珠奶茶', 'drink', 'takeout', 'light', 'LDS', '1杯(约410ml)', [
    ['tea', 300], ['creamer', 20], ['sugar', 30], ['tapioca_pearls', 60],
  ], { aliases: ['奶茶', '波霸奶茶'], tags: ['sweet', 'caffeine'] }),
  D('dr_milk_tea_nosugar', '无糖奶茶', 'drink', 'takeout', 'light', 'LDS', '1杯(400ml)', [['tea', 300], ['milk', 100]], { aliases: ['鲜奶茶(无糖)'], tags: ['caffeine'] }),
  D('dr_honey_lemon', '蜂蜜柠檬水', 'drink', 'cn', 'light', 'BLDS', '1杯(约335ml)', [['water', 300], ['honey', 15], ['lemon', 20]], { tags: ['sweet'] }),
  D('dr_cola', '可乐', 'drink', 'convenience', 'light', 'LDS', '1罐(330ml)', [['cola', 330]], { aliases: ['汽水'], tags: ['sweet'] }),
  D('dr_cola_zero', '无糖可乐', 'drink', 'convenience', 'light', 'LDS', '1罐(330ml)', [['cola_zero', 330]], { aliases: ['零度可乐'] }),
  D('dr_orange_juice', '橙汁', 'drink', 'convenience', 'light', 'BLDS', '1杯(250ml)', [['orange_juice', 250]], { aliases: ['果汁'], tags: ['sweet'] }),
  D('dr_yakult', '乳酸菌饮料', 'drink', 'convenience', 'light', 'BLDS', '1瓶(100ml)', [['yakult', 100]], { aliases: ['养乐多'], tags: ['sweet'] }),
  D('dr_sports_drink', '运动饮料', 'drink', 'convenience', 'light', 'LDS', '1瓶(500ml)', [['sports_drink', 500]], { tags: ['sweet'] }),
  D('dr_beer', '啤酒', 'drink', 'cn', 'light', 'LD', '1瓶(500ml)', [['beer', 500]], { tags: ['alcohol'] }),
  D('dr_red_wine', '红酒', 'drink', 'west', 'light', 'LD', '1杯(150ml)', [['red_wine', 150]], { aliases: ['葡萄酒'], tags: ['alcohol'] }),
  D('dr_baijiu', '白酒', 'drink', 'cn', 'light', 'LD', '2两(100ml)', [['baijiu', 100]], { tags: ['alcohol'] }),
]
