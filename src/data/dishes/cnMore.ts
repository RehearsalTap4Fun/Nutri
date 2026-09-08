import type { Dish } from '../../core/types'
import { D } from './helper'

// 中式家常与地方菜（第二批，2026-09-07）。一人份，含烹调油与盐；新增食材来自 USDA 提取（ingredientsUsda.ts）。
// 用不上的原料用近似替代：牛尾/羊蝎子未收录，血制品未收录。
export const DISHES_CN_MORE: Dish[] = [
  // ===== 荤菜 · 猪 =====
  D('cn2_jingjiang_rousi', '京酱肉丝', 'protein', 'cn', 'normal', 'LD', '1盘(约230g)', [
    ['pork_tenderloin', 100], ['sweet_bean_sauce', 15], ['scallion', 40], ['tofu_sheet', 40], ['oil', 8], ['sugar', 4], ['cooking_wine', 5], ['starch', 4],
  ], { tags: ['sweet'] }),
  D('cn2_suantai_chaorou', '蒜苔炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约240g)', [
    ['pork_lean', 80], ['garlic_scapes', 150], ['oil', 9], ['soy_sauce', 7], ['salt', 0.6], ['cooking_wine', 5],
  ]),
  D('cn2_guobaorou', '锅包肉', 'protein', 'cn', 'fried', 'LD', '1盘(约220g)', [
    ['pork_tenderloin', 120], ['starch', 25], ['oil', 22], ['sugar', 18], ['vinegar', 15], ['carrot', 10], ['coriander', 5], ['salt', 1],
  ], { tags: ['sweet', 'fried'] }),
  D('cn2_liurouduan', '溜肉段', 'protein', 'cn', 'fried', 'LD', '1盘(约240g)', [
    ['pork_tenderloin', 120], ['green_pepper', 60], ['starch', 20], ['oil', 20], ['soy_sauce', 8], ['sugar', 4], ['vinegar', 4],
  ], { tags: ['fried'] }),
  D('cn2_fenzhengrou', '粉蒸肉', 'protein', 'cn', 'heavy', 'LD', '1碗(约200g)', [
    ['pork_belly', 110], ['rice_raw', 25], ['sweet_potato', 60], ['doubanjiang', 8], ['soy_sauce', 5], ['sugar', 3], ['sichuan_pepper', 1],
  ]),
  D('cn2_meicai_kourou', '梅菜扣肉', 'protein', 'cn', 'heavy', 'LD', '1碗(约200g)', [
    ['pork_belly', 120], ['preserved_veg', 30], ['soy_sauce', 4], ['sugar', 5], ['oil', 5], ['ginger', 3],
  ]),
  D('cn2_nongjia_xiaochaorou', '农家小炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约230g)', [
    ['pork_belly', 60], ['pork_lean', 50], ['green_pepper', 90], ['chili_fresh', 10], ['garlic', 5], ['soy_sauce', 8], ['oil', 8], ['salt', 0.5],
  ], { tags: ['spicy'] }),
  D('cn2_lajiao_chaorou', '辣椒炒肉(湘)', 'protein', 'cn', 'normal', 'LD', '1盘(约230g)', [
    ['pork_shoulder', 110], ['green_pepper', 100], ['garlic', 6], ['soy_sauce', 8], ['oil', 8], ['fermented_bean_curd', 3],
  ], { tags: ['spicy'] }),
  D('cn2_lianou_chaorou', '莲藕炒肉片', 'protein', 'cn', 'normal', 'LD', '1盘(约250g)', [
    ['pork_lean', 80], ['lotus_root', 150], ['oil', 8], ['soy_sauce', 6], ['salt', 1], ['starch', 3], ['scallion', 5],
  ]),
  D('cn2_qingsun_roupian', '青笋炒肉片', 'protein', 'cn', 'light', 'LD', '1盘(约240g)', [
    ['pork_lean', 80], ['celtuce', 150], ['oil', 7], ['salt', 1.5], ['starch', 3], ['garlic', 4],
  ]),
  D('cn2_muer_chaorou', '木耳炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约220g)', [
    ['pork_lean', 80], ['wood_ear', 100], ['red_pepper', 30], ['oil', 8], ['soy_sauce', 7], ['salt', 0.5], ['cooking_wine', 5],
  ]),
  D('cn2_suanxiang_paigu', '蒜香排骨', 'protein', 'cn', 'fried', 'LD', '1盘(约200g)', [
    ['pork_ribs', 160], ['garlic', 15], ['starch', 10], ['oil', 15], ['soy_sauce', 8], ['sugar', 3], ['cooking_wine', 6],
  ], { tags: ['fried'] }),
  D('cn2_hongshao_zhuti', '红烧猪蹄', 'protein', 'cn', 'heavy', 'LD', '1碗(约220g)', [
    ['pork_trotter', 180], ['soy_sauce', 10], ['sugar', 8], ['cooking_wine', 10], ['ginger', 5], ['star_anise', 1], ['oil', 4],
  ], { tags: ['stew'] }),
  D('cn2_bocai_zhugan_tang', '菠菜猪肝汤', 'soup', 'cn', 'light', 'LD', '1碗(约400g)', [
    ['pork_liver', 60], ['spinach', 100], ['broth', 250], ['ginger', 3], ['salt', 1.2], ['sesame_oil', 2], ['cooking_wine', 5],
  ]),
  D('cn2_ganguo_feichang', '干锅肥肠', 'protein', 'cn', 'heavy', 'LD', '1小锅(约260g)', [
    ['pork_intestine', 120], ['celery', 60], ['onion', 40], ['garlic', 8], ['doubanjiang', 10], ['oil', 12], ['sichuan_pepper', 2], ['sugar', 2],
  ], { tags: ['spicy'] }),
  D('cn2_baochao_yaohua', '爆炒腰花', 'protein', 'cn', 'normal', 'LD', '1盘(约220g)', [
    ['pork_kidney', 130], ['wood_ear', 40], ['bamboo_shoot', 40], ['oil', 10], ['soy_sauce', 8], ['vinegar', 5], ['cooking_wine', 8], ['starch', 4],
  ]),
  D('cn2_zhuxin_tang', '猪心汤', 'soup', 'cn', 'light', 'LD', '1碗(约400g)', [
    ['pork_heart', 80], ['red_dates', 10], ['ginger', 3], ['broth', 300], ['salt', 1.2], ['cooking_wine', 5],
  ]),
  // ===== 荤菜 · 牛羊 =====
  D('cn2_congbao_niurou', '葱爆牛肉', 'protein', 'cn', 'normal', 'LD', '1盘(约220g)', [
    ['beef_lean', 110], ['leek', 90], ['oil', 10], ['soy_sauce', 8], ['cooking_wine', 6], ['starch', 4], ['sugar', 2],
  ]),
  D('cn2_hangjiao_niuliu', '杭椒牛柳', 'protein', 'cn', 'normal', 'LD', '1盘(约230g)', [
    ['beef_tenderloin', 110], ['green_pepper', 100], ['oil', 10], ['oyster_sauce', 8], ['soy_sauce', 4], ['starch', 4], ['garlic', 5],
  ], { tags: ['spicy'] }),
  D('cn2_jiang_niurou', '酱牛肉(卤牛肉)', 'protein', 'cn', 'light', 'LDS', '1小盘(约100g)', [
    ['beef_shank', 100], ['soy_sauce', 6], ['sugar', 2], ['star_anise', 0.5], ['cinnamon', 0.3], ['ginger', 3],
  ]),
  D('cn2_niurou_chao_gailan', '牛肉炒芥兰', 'protein', 'cn', 'normal', 'LD', '1盘(约260g)', [
    ['beef_lean', 90], ['gai_lan', 160], ['oil', 9], ['oyster_sauce', 8], ['soy_sauce', 4], ['starch', 4], ['garlic', 5],
  ]),
  D('cn2_shacha_niurou', '沙茶牛肉', 'protein', 'cn', 'heavy', 'LD', '1盘(约230g)', [
    ['beef_lean', 110], ['onion', 60], ['hoisin', 15], ['peanut_butter', 6], ['oil', 9], ['soy_sauce', 4], ['starch', 4],
  ]),
  D('cn2_shouzhua_yangrou', '手抓羊肉', 'protein', 'cn', 'light', 'LD', '1盘(约200g)', [
    ['lamb', 170], ['ginger', 5], ['scallion', 10], ['salt', 1.6], ['cumin', 1], ['sichuan_pepper', 1],
  ]),
  D('cn2_congbao_yangrou', '葱爆羊肉', 'protein', 'cn', 'normal', 'LD', '1盘(约220g)', [
    ['lamb', 110], ['leek', 90], ['oil', 10], ['soy_sauce', 8], ['cooking_wine', 8], ['cumin', 1], ['vinegar', 3],
  ]),
  D('cn2_liangban_niudu', '凉拌牛肚', 'protein', 'cn', 'normal', 'LDS', '1盘(约180g)', [
    ['beef_tripe', 120], ['cucumber', 40], ['coriander', 5], ['chili_oil', 8], ['soy_sauce', 6], ['vinegar', 6], ['garlic', 5], ['sugar', 2],
  ], { tags: ['spicy'] }),
  D('cn2_fuqi_feipian', '夫妻肺片', 'protein', 'cn', 'heavy', 'LD', '1盘(约200g)', [
    ['beef_shank', 70], ['beef_tripe', 60], ['beef_tongue', 30], ['celery', 30], ['chili_oil', 12], ['soy_sauce', 6], ['sichuan_pepper', 1], ['peanut', 8], ['sugar', 2],
  ], { tags: ['spicy'] }),
  D('cn2_niunan_bao', '牛腩煲', 'protein', 'cn', 'heavy', 'LD', '1碗(约260g)', [
    ['beef_brisket', 140], ['white_radish', 100], ['soy_sauce', 10], ['sugar', 4], ['cooking_wine', 8], ['ginger', 5], ['oil', 5], ['star_anise', 1],
  ], { tags: ['stew'] }),
  D('cn2_yangrou_luobo_tang', '羊肉萝卜汤', 'soup', 'cn', 'light', 'LD', '1碗(约450g)', [
    ['lamb', 70], ['white_radish', 150], ['broth', 220], ['ginger', 5], ['salt', 1.3], ['coriander', 5],
  ]),
  // ===== 荤菜 · 鸡鸭鹅 =====
  D('cn2_sanbei_ji', '三杯鸡', 'protein', 'cn', 'heavy', 'LD', '1碗(约220g)', [
    ['chicken_thigh', 160], ['soy_sauce', 10], ['sesame_oil', 8], ['cooking_wine', 15], ['sugar', 5], ['ginger', 8], ['garlic', 8],
  ]),
  D('cn2_banli_shaoji', '板栗烧鸡', 'protein', 'cn', 'normal', 'LD', '1碗(约260g)', [
    ['chicken_thigh', 140], ['chestnut', 70], ['soy_sauce', 9], ['sugar', 4], ['oil', 6], ['cooking_wine', 8], ['ginger', 4],
  ], { tags: ['stew'] }),
  D('cn2_xianggu_jitang', '香菇鸡汤', 'soup', 'cn', 'light', 'LD', '1碗(约450g)', [
    ['chicken_whole', 100], ['shiitake_dried', 8], ['red_dates', 8], ['ginger', 4], ['water', 300], ['salt', 1.8],
  ]),
  D('cn2_lu_jitui', '卤鸡腿', 'protein', 'cn', 'light', 'LDS', '1个(约130g)', [
    ['chicken_drumstick_skinless', 120], ['soy_sauce', 7], ['sugar', 2], ['star_anise', 0.5], ['cinnamon', 0.3], ['ginger', 3],
  ]),
  D('cn2_paojiao_fengzhua', '泡椒凤爪', 'snack', 'cn', 'normal', 'LDS', '1小份(约120g)', [
    ['chicken_feet', 100], ['chili_fresh', 15], ['vinegar', 10], ['salt', 1.5], ['sugar', 2], ['sichuan_pepper', 0.5],
  ], { tags: ['spicy'] }),
  D('cn2_laoya_tang', '老鸭汤', 'soup', 'cn', 'normal', 'LD', '1碗(约450g)', [
    ['duck', 80], ['sour_bamboo', 40], ['ginger', 5], ['water', 300], ['salt', 1.2],
  ]),
  D('cn2_jiangxiang_yatui', '酱香鸭腿', 'protein', 'cn', 'heavy', 'LD', '1个(约180g)', [
    ['duck', 150], ['soy_sauce', 12], ['sugar', 6], ['cooking_wine', 10], ['star_anise', 1], ['ginger', 5], ['oil', 3],
  ]),
  D('cn2_kao_ruge', '烤乳鸽', 'protein', 'cn', 'normal', 'LD', '半只(约150g)', [
    ['pigeon', 140], ['soy_sauce', 6], ['honey', 4], ['salt', 1], ['cooking_wine', 5],
  ]),
  D('cn2_yanju_ji', '盐焗鸡', 'protein', 'cn', 'light', 'LD', '1盘(约180g)', [
    ['chicken_whole', 170], ['salt', 1.8], ['ginger', 5], ['sesame_oil', 3],
  ]),
  D('cn2_tengjiao_ji', '藤椒鸡', 'protein', 'cn', 'normal', 'LD', '1盘(约200g)', [
    ['chicken_thigh', 150], ['chili_fresh', 12], ['sichuan_pepper', 2], ['chili_oil', 8], ['soy_sauce', 6], ['vinegar', 4], ['garlic', 5],
  ], { tags: ['spicy'] }),
  D('cn2_jizhen_chao_jianjiao', '尖椒炒鸡胗', 'protein', 'cn', 'normal', 'LD', '1盘(约200g)', [
    ['chicken_gizzard', 120], ['green_pepper', 70], ['oil', 9], ['soy_sauce', 8], ['cooking_wine', 6], ['garlic', 5],
  ], { tags: ['spicy'] }),
  D('cn2_shao_e', '烧鹅(一人份)', 'protein', 'cn', 'heavy', 'LD', '1盘(约150g)', [
    ['goose', 130], ['honey', 5], ['soy_sauce', 6], ['salt', 0.8], ['sugar', 3],
  ]),
  D('cn2_mala_tuding', '麻辣兔丁', 'protein', 'cn', 'heavy', 'LD', '1盘(约200g)', [
    ['rabbit', 130], ['chili_fresh', 20], ['sichuan_pepper', 3], ['chili_oil', 12], ['garlic', 8], ['soy_sauce', 6], ['sugar', 2], ['peanut', 10],
  ], { tags: ['spicy'] }),
  D('cn2_anchun_dan_hongshaorou', '鹌鹑蛋红烧肉', 'protein', 'cn', 'heavy', 'LD', '1碗(约200g)', [
    ['pork_belly', 90], ['quail_egg', 60], ['soy_sauce', 10], ['sugar', 7], ['cooking_wine', 8], ['ginger', 4], ['oil', 4],
  ], { tags: ['stew', 'sweet'] }),
  D('cn2_jiucai_chao_yadan', '韭菜炒鸭蛋', 'protein', 'cn', 'normal', 'BLD', '1盘(约200g)', [
    ['duck_egg', 110], ['garlic_chives', 90], ['oil', 9], ['salt', 1.2],
  ]),
  D('cn2_lu_anchundan', '卤鹌鹑蛋', 'snack', 'cn', 'light', 'BLDS', '6个(约60g)', [
    ['quail_egg', 60], ['soy_sauce', 3], ['sugar', 1], ['star_anise', 0.3],
  ]),
  D('cn2_qiukui_chaodan', '秋葵炒蛋', 'protein', 'cn', 'light', 'BLD', '1盘(约200g)', [
    ['egg', 100], ['okra', 100], ['oil', 7], ['salt', 1.2],
  ]),
  D('cn2_caijiao_chaodan', '彩椒炒蛋', 'protein', 'cn', 'light', 'BLD', '1盘(约200g)', [
    ['egg', 100], ['red_pepper', 100], ['oil', 7], ['salt', 1.2],
  ]),
  D('cn2_dacong_chaodan', '大葱炒蛋', 'protein', 'cn', 'light', 'BLD', '1盘(约180g)', [
    ['egg', 100], ['leek', 80], ['oil', 7], ['salt', 1.2],
  ]),
  // ===== 水产 =====
  D('cn2_qingzheng_xueyu', '清蒸鳕鱼', 'protein', 'cn', 'light', 'LD', '1块(约180g)', [
    ['cod', 160], ['soy_sauce', 5], ['ginger', 5], ['scallion', 8], ['oil', 4], ['cooking_wine', 5],
  ]),
  D('cn2_xiangjian_longliyu', '香煎龙利鱼', 'protein', 'cn', 'normal', 'LD', '1块(约170g)', [
    ['tilapia', 150], ['oil', 8], ['salt', 1.2], ['black_pepper_sauce', 5], ['lemon', 10],
  ]),
  D('cn2_suantang_bashayu', '酸汤巴沙鱼', 'protein', 'cn', 'normal', 'LD', '1碗(约350g)', [
    ['catfish', 150], ['tomato', 100], ['sauerkraut', 30], ['broth', 100], ['oil', 6], ['salt', 0.6], ['chili_fresh', 5],
  ], { tags: ['spicy'] }),
  D('cn2_hongshao_huanghuayu', '红烧黄花鱼', 'protein', 'cn', 'normal', 'LD', '1条(约220g)', [
    ['croaker', 180], ['soy_sauce', 10], ['sugar', 4], ['cooking_wine', 8], ['oil', 8], ['ginger', 5], ['scallion', 8],
  ]),
  D('cn2_xiangjian_qiudaoyu', '香煎秋刀鱼', 'protein', 'cn', 'normal', 'LD', '2条(约200g)', [
    ['saury', 180], ['oil', 5], ['salt', 1.2], ['lemon', 10],
  ]),
  D('cn2_suanrong_shenghao', '蒜蓉生蚝', 'protein', 'cn', 'normal', 'LD', '6只(约180g)', [
    ['oyster', 190], ['garlic', 15], ['oil', 8], ['soy_sauce', 4], ['glass_noodles_dry', 10],
  ]),
  D('cn2_baizhuo_qingkou', '白灼青口', 'protein', 'cn', 'light', 'LD', '1盘(约250g)', [
    ['mussel', 220], ['ginger', 5], ['scallion', 5], ['soy_sauce', 3], ['cooking_wine', 8],
  ]),
  D('cn2_yanshui_jiweixia', '盐水基围虾', 'protein', 'cn', 'light', 'LD', '1盘(约200g)', [
    ['shrimp_shell_on', 150], ['salt', 0.5], ['ginger', 5], ['cooking_wine', 8], ['scallion', 5],
  ]),
  D('cn2_jiaoyan_xia', '椒盐虾', 'protein', 'cn', 'fried', 'LD', '1盘(约200g)', [
    ['shrimp_shell_on', 150], ['starch', 12], ['oil', 15], ['salt', 0.6], ['sichuan_pepper', 1], ['garlic', 5],
  ], { tags: ['fried'] }),
  D('cn2_ganguo_xia', '干锅虾', 'protein', 'cn', 'heavy', 'LD', '1小锅(约280g)', [
    ['shrimp_shell_on', 120], ['potato', 80], ['celery', 40], ['doubanjiang', 5], ['oil', 14], ['sugar', 3], ['garlic', 8],
  ], { tags: ['spicy'] }),
  D('cn2_zheng_xie', '清蒸螃蟹', 'protein', 'cn', 'light', 'LD', '1只(可食部约120g)', [
    ['crab', 120], ['ginger', 8], ['vinegar', 10], ['soy_sauce', 3],
  ]),
  D('cn2_huage_chao_sigua', '花蛤炒丝瓜', 'protein', 'cn', 'light', 'LD', '1盘(约280g)', [
    ['clam', 120], ['luffa', 150], ['oil', 7], ['garlic', 5], ['salt', 0.6],
  ]),
  D('cn2_donggua_xiami_tang', '冬瓜虾米汤', 'soup', 'cn', 'light', 'LD', '1碗(约400g)', [
    ['winter_melon', 150], ['dried_shrimp', 6], ['broth', 250], ['salt', 0.8], ['sesame_oil', 2],
  ]),
  D('cn2_zicai_xiapi_tang', '紫菜虾皮汤', 'soup', 'cn', 'light', 'BLD', '1碗(约350g)', [
    ['nori', 4], ['dried_shrimp', 5], ['egg', 25], ['broth', 300], ['salt', 0.6], ['sesame_oil', 2],
  ]),
  D('cn2_haixian_doufu_tang', '海鲜豆腐汤', 'soup', 'cn', 'light', 'LD', '1碗(约450g)', [
    ['mussel', 60], ['shrimp', 40], ['tofu_soft', 120], ['broth', 220], ['salt', 1], ['ginger', 3], ['coriander', 5],
  ]),
  D('cn2_shadingyu_guantou', '沙丁鱼罐头(半罐)', 'protein', 'cn', 'normal', 'BLDS', '半罐(约60g)', [
    ['sardine_canned', 60],
  ]),
  // ===== 豆蛋与素菜 =====
  D('cn2_doufupi_chao_qingjiao', '青椒炒豆腐皮', 'veg', 'cn', 'normal', 'LD', '1盘(约200g)', [
    ['tofu_sheet', 80], ['green_pepper', 100], ['oil', 6], ['soy_sauce', 6], ['salt', 0.8],
  ]),
  D('cn2_fuzhu_chao_muer', '腐竹炒木耳', 'veg', 'cn', 'normal', 'LD', '1盘(约200g)', [
    ['yuba', 30], ['wood_ear', 90], ['carrot', 30], ['oil', 8], ['soy_sauce', 6], ['salt', 0.8],
  ]),
  D('cn2_mala_dougan', '麻辣豆干', 'protein', 'cn', 'heavy', 'LDS', '1盘(约160g)', [
    ['tofu_dried', 120], ['celery', 30], ['chili_oil', 10], ['sichuan_pepper', 1.5], ['soy_sauce', 6], ['sugar', 2],
  ], { tags: ['spicy'] }),
  D('cn2_weizeng_tang', '味噌汤', 'soup', 'cn', 'light', 'BLD', '1碗(约350g)', [
    ['miso', 15], ['tofu_soft', 60], ['wakame', 20], ['scallion', 5], ['water', 280],
  ]),
  D('cn2_natto_ban_fan', '纳豆拌饭', 'staple', 'cn', 'light', 'BLD', '1碗(约260g)', [
    ['natto', 50], ['rice_cooked', 180], ['soy_sauce', 5], ['scallion', 5], ['mustard', 3],
  ]),
  D('cn2_baizhuo_gailan', '白灼芥兰', 'veg', 'cn', 'light', 'LD', '1盘(约220g)', [
    ['gai_lan', 200], ['oyster_sauce', 8], ['oil', 5], ['garlic', 4],
  ]),
  D('cn2_qingchao_tonghao', '清炒茼蒿', 'veg', 'cn', 'light', 'LD', '1盘(约220g)', [
    ['garland_chrysanthemum', 200], ['oil', 7], ['garlic', 5], ['salt', 1.2],
  ]),
  D('cn2_liangban_qiukui', '凉拌秋葵', 'veg', 'cn', 'light', 'LD', '1盘(约180g)', [
    ['okra', 160], ['soy_sauce', 6], ['vinegar', 4], ['sesame_oil', 3], ['garlic', 5],
  ]),
  D('cn2_qingchao_wosun', '清炒莴笋', 'veg', 'cn', 'light', 'LD', '1盘(约220g)', [
    ['celtuce', 200], ['oil', 7], ['garlic', 4], ['salt', 1.2],
  ]),
  D('cn2_chao_jiecai', '炒芥菜', 'veg', 'cn', 'light', 'LD', '1盘(约220g)', [
    ['mustard_greens', 200], ['oil', 7], ['garlic', 5], ['salt', 1.2],
  ]),
  D('cn2_suanrong_xiancai', '蒜蓉苋菜', 'veg', 'cn', 'light', 'LD', '1盘(约220g)', [
    ['amaranth_leaves', 200], ['oil', 7], ['garlic', 8], ['salt', 1.2],
  ]),
  D('cn2_chao_hongshuye', '炒红薯叶', 'veg', 'cn', 'light', 'LD', '1盘(约220g)', [
    ['sweet_potato_leaves', 200], ['oil', 7], ['garlic', 5], ['salt', 1.2],
  ]),
  D('cn2_biqi_chao_muer', '荸荠炒木耳', 'veg', 'cn', 'light', 'LD', '1盘(约200g)', [
    ['water_chestnut', 100], ['wood_ear', 80], ['snow_peas', 30], ['oil', 7], ['salt', 1], ['starch', 3],
  ]),
  D('cn2_pinggu_chaorou', '平菇炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约240g)', [
    ['oyster_mushroom', 150], ['pork_lean', 70], ['oil', 8], ['soy_sauce', 7], ['salt', 0.5], ['garlic', 4],
  ]),
  D('cn2_ganxianggu_dunji', '干香菇炖鸡', 'protein', 'cn', 'normal', 'LD', '1碗(约260g)', [
    ['chicken_thigh', 140], ['shiitake_dried', 12], ['soy_sauce', 8], ['cooking_wine', 8], ['oil', 5], ['ginger', 4], ['sugar', 2],
  ], { tags: ['stew'] }),
  D('cn2_qundaicai_tang', '裙带菜汤', 'soup', 'cn', 'light', 'LD', '1碗(约350g)', [
    ['wakame', 30], ['tofu_soft', 60], ['broth', 260], ['salt', 1], ['sesame_oil', 2],
  ]),
  D('cn2_candou_chaodan', '蚕豆炒蛋', 'protein', 'cn', 'light', 'LD', '1盘(约210g)', [
    ['fava_beans_fresh', 100], ['egg', 100], ['oil', 8], ['salt', 1.2], ['scallion', 5],
  ]),
  D('cn2_ziganlan_shala', '手撕紫甘蓝', 'veg', 'cn', 'light', 'LD', '1盘(约200g)', [
    ['red_cabbage', 180], ['vinegar', 8], ['soy_sauce', 4], ['sugar', 3], ['sesame_oil', 4], ['garlic', 4],
  ]),
  // ===== 汤 =====
  D('cn2_fanqie_tudou_tang', '番茄土豆汤', 'soup', 'cn', 'light', 'LD', '1碗(约400g)', [
    ['tomato', 150], ['potato', 100], ['oil', 4], ['salt', 1.5], ['water', 150],
  ]),
  D('cn2_suancai_fensi_tang', '酸菜粉丝汤', 'soup', 'cn', 'light', 'LD', '1碗(约400g)', [
    ['sauerkraut', 60], ['glass_noodles_dry', 30], ['broth', 280], ['oil', 3], ['salt', 0.3], ['coriander', 5],
  ]),
  D('cn2_jiecai_xiandan_tang', '芥菜咸蛋汤', 'soup', 'cn', 'light', 'LD', '1碗(约400g)', [
    ['mustard_greens', 120], ['salted_duck_egg', 30], ['broth', 250], ['ginger', 3], ['oil', 3],
  ]),
  D('cn2_donggua_yimi_paigu', '冬瓜薏米排骨汤', 'soup', 'cn', 'normal', 'LD', '1碗(约450g)', [
    ['pork_ribs', 80], ['winter_melon', 120], ['job_tears', 20], ['water', 250], ['ginger', 4], ['salt', 1.5],
  ]),
  D('cn2_lianzi_shanyao_tang', '莲子山药汤', 'soup', 'cn', 'light', 'LDS', '1碗(约350g)', [
    ['lotus_seeds', 20], ['yam', 100], ['red_dates', 10], ['water', 250], ['sugar', 5],
  ], { tags: ['sweet'] }),
  D('cn2_huasheng_zhujiao_tang', '花生猪脚汤', 'soup', 'cn', 'normal', 'LD', '1碗(约450g)', [
    ['pork_trotter', 100], ['peanut', 25], ['red_dates', 8], ['ginger', 5], ['water', 300], ['salt', 1.8],
  ]),
  D('cn2_guiyuan_hongzao_tang', '桂圆红枣茶', 'drink', 'cn', 'light', 'BLDS', '1杯(约300ml)', [
    ['dried_longan', 15], ['red_dates', 15], ['water', 280], ['brown_sugar', 5],
  ], { tags: ['sweet'] }),
  // ===== 主食与面点 =====
  D('cn2_qiaomai_liangmian', '荞麦凉面', 'staple', 'cn', 'light', 'LD', '1碗(约300g)', [
    ['soba_cooked', 200], ['cucumber', 50], ['egg', 25], ['soy_sauce', 8], ['sesame_paste', 10], ['vinegar', 6], ['garlic', 4],
  ]),
  D('cn2_yumi_hu', '玉米糊', 'staple', 'cn', 'light', 'B', '1碗(约300g)', [
    ['cornmeal', 40], ['water', 260],
  ]),
  D('cn2_quanmai_mantou', '全麦馒头', 'staple', 'cn', 'light', 'BLD', '1个(约90g)', [
    ['whole_wheat_flour', 55], ['yeast', 1], ['water', 30],
  ]),
  D('cn2_zongzi', '鲜肉粽', 'staple', 'cn', 'normal', 'BLS', '1个(约180g)', [
    ['glutinous_rice_raw', 80], ['pork_belly', 40], ['soy_sauce', 6], ['salt', 0.5],
  ]),
  D('cn2_tangyuan', '黑芝麻汤圆', 'snack', 'cn', 'normal', 'BS', '6个(约150g)', [
    ['glutinous_rice_raw', 60], ['sesame', 20], ['sugar', 15], ['lard', 12],
  ], { tags: ['sweet'] }),
  D('cn2_jiucai_hezi', '韭菜盒子', 'staple', 'cn', 'normal', 'BLD', '2个(约240g)', [
    ['flour', 90], ['garlic_chives', 100], ['egg', 50], ['oil', 12], ['salt', 1.5],
  ]),
  D('cn2_nuomi_ji', '糯米鸡', 'staple', 'cn', 'normal', 'BL', '1个(约220g)', [
    ['glutinous_rice_raw', 80], ['chicken_thigh', 50], ['shiitake_dried', 5], ['soy_sauce', 6], ['oil', 5],
  ]),
  D('cn2_gedatang', '西红柿鸡蛋疙瘩汤', 'staple', 'cn', 'light', 'BLD', '1碗(约400g)', [
    ['flour', 50], ['tomato', 120], ['egg', 50], ['oil', 5], ['salt', 1.5], ['water', 200],
  ]),
  D('cn2_fanqie_jidan_mian', '番茄鸡蛋面', 'staple', 'cn', 'light', 'BLD', '1碗(约450g)', [
    ['noodles_cooked', 220], ['tomato', 120], ['egg', 50], ['oil', 6], ['salt', 1.5], ['broth', 100],
  ]),
  D('cn2_zhajiangmian', '炸酱面', 'staple', 'cn', 'heavy', 'LD', '1碗(约400g)', [
    ['noodles_cooked', 220], ['pork_ground', 60], ['sweet_bean_sauce', 20], ['cucumber', 60], ['soy_sprouts', 30], ['oil', 8],
  ]),
  D('cn2_dandanmian', '担担面', 'staple', 'cn', 'heavy', 'LD', '1碗(约350g)', [
    ['noodles_cooked', 200], ['pork_ground', 50], ['sesame_paste', 12], ['chili_oil', 10], ['soy_sauce', 8], ['peanut', 8], ['scallion', 5],
  ], { tags: ['spicy'] }),
  D('cn2_congyou_banmian', '葱油拌面', 'staple', 'cn', 'normal', 'BLD', '1碗(约300g)', [
    ['noodles_cooked', 230], ['scallion', 20], ['oil', 12], ['soy_sauce', 10], ['sugar', 3],
  ]),
  D('cn2_daoxiaomian', '刀削面(番茄肉)', 'staple', 'cn', 'normal', 'LD', '1碗(约480g)', [
    ['noodles_cooked', 240], ['pork_lean', 40], ['tomato', 100], ['egg', 25], ['oil', 6], ['salt', 1.5], ['broth', 80],
  ]),
  D('cn2_yang_rou_shouzhuafan', '羊肉手抓饭', 'combo', 'cn', 'normal', 'LD', '1盘(约400g)', [
    ['rice_cooked', 230], ['lamb', 80], ['carrot', 60], ['onion', 30], ['oil', 10], ['salt', 1.8], ['cumin', 1],
  ]),
  D('cn2_jidan_bocai_bing', '鸡蛋菠菜饼', 'breakfast', 'cn', 'light', 'BS', '2张(约180g)', [
    ['flour', 50], ['egg', 50], ['spinach', 60], ['oil', 6], ['salt', 1],
  ]),
]
