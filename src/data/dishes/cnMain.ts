import type { Dish } from '../../core/types'
import { D } from './helper'

// 中式家常：荤菜与蛋白菜 / 素菜 / 汤。份量均为一人份，含烹调油与盐。
// 食材库中没有的原料用近似替代：扇贝→蛤蜊，百合→山药，茼蒿→菠菜，银耳→木耳，干辣椒/白胡椒→花椒(sichuan_pepper)
export const DISHES_CN_MAIN: Dish[] = [
  // ===== 荤菜 · 猪 =====
  D('cn_hongshaorou', '红烧肉', 'protein', 'cn', 'heavy', 'LD', '1小碗(约160g)', [
    ['pork_belly', 120], ['soy_sauce', 12], ['sugar', 8], ['cooking_wine', 8], ['oil', 5], ['ginger', 5], ['scallion', 5],
  ], { tags: ['stew', 'sweet'] }),
  D('cn_huiguorou', '回锅肉', 'protein', 'cn', 'heavy', 'LD', '1盘(约230g)', [
    ['pork_belly', 100], ['green_pepper', 60], ['scallion', 30], ['doubanjiang', 7.5], ['sweet_bean_sauce', 3], ['oil', 10], ['soy_sauce', 3], ['sugar', 2],
  ], { tags: ['spicy'] }),
  D('cn_yuxiang_rousi', '鱼香肉丝', 'protein', 'cn', 'normal', 'LD', '1盘(约260g)', [
    ['pork_lean', 100], ['wood_ear', 30], ['carrot', 40], ['bamboo_shoot', 40], ['doubanjiang', 6.5], ['sugar', 8], ['vinegar', 8], ['soy_sauce', 5.5], ['starch', 5], ['oil', 12], ['garlic', 5], ['ginger', 3], ['scallion', 5],
  ], { tags: ['spicy', 'sweet'] }),
  D('cn_qingjiao_rousi', '青椒肉丝', 'protein', 'cn', 'normal', 'LD', '1盘(约240g)', [
    ['pork_lean', 100], ['green_pepper', 120], ['oil', 10], ['soy_sauce', 6.5], ['starch', 3], ['salt', 1], ['garlic', 5],
  ], { tags: ['quick'] }),
  D('cn_tangcu_liji', '糖醋里脊', 'protein', 'cn', 'fried', 'LD', '1盘(约230g)', [
    ['pork_lean', 120], ['starch', 20], ['egg', 20], ['oil', 20], ['sugar', 20], ['vinegar', 15], ['ketchup', 15], ['salt', 1],
  ], { tags: ['sweet'] }),
  D('cn_suanni_bairou', '蒜泥白肉', 'protein', 'cn', 'normal', 'LD', '1盘(约200g)', [
    ['pork_belly', 100], ['cucumber', 60], ['garlic', 15], ['soy_sauce', 10], ['chili_oil', 5], ['vinegar', 5], ['sugar', 2], ['sesame_oil', 2],
  ], { tags: ['cold', 'spicy'] }),
  D('cn_hongshao_paigu', '红烧排骨', 'protein', 'cn', 'normal', 'LD', '1小碗(约190g)', [
    ['pork_ribs', 150], ['soy_sauce', 12], ['sugar', 8], ['cooking_wine', 8], ['oil', 8], ['ginger', 5], ['scallion', 5],
  ], { tags: ['stew'] }),
  D('cn_tangcu_paigu', '糖醋排骨', 'protein', 'cn', 'normal', 'LD', '1小碗(约200g)', [
    ['pork_ribs', 150], ['sugar', 15], ['vinegar', 15], ['soy_sauce', 10], ['oil', 10], ['cooking_wine', 5], ['sesame', 2],
  ], { tags: ['sweet'] }),
  D('cn_zheng_paigu', '豉汁蒸排骨', 'protein', 'cn', 'light', 'LD', '1碟(约175g)', [
    ['pork_ribs', 150], ['soy_sauce', 8], ['garlic', 8], ['starch', 3], ['oil', 3], ['sugar', 2], ['salt', 0.5],
  ], { aliases: ['蒸排骨'] }),
  D('cn_muxurou', '木须肉', 'protein', 'cn', 'normal', 'LD', '1盘(约220g)', [
    ['pork_lean', 60], ['egg', 50], ['cucumber', 60], ['wood_ear', 30], ['oil', 10], ['soy_sauce', 5.5], ['salt', 1],
  ], { tags: ['quick'], aliases: ['木樨肉'] }),
  D('cn_roumo_qiezi', '肉末茄子', 'protein', 'cn', 'heavy', 'LD', '1盘(约300g)', [
    ['eggplant', 200], ['pork_ground', 50], ['oil', 18], ['soy_sauce', 6.5], ['doubanjiang', 5.5], ['garlic', 8], ['sugar', 3], ['starch', 3],
  ]),
  D('cn_shizitou', '红烧狮子头', 'protein', 'cn', 'normal', 'LD', '1个大丸子+菜(约250g)', [
    ['pork_ground', 120], ['egg', 15], ['starch', 8], ['soy_sauce', 10], ['sugar', 3], ['oil', 5], ['ginger', 3], ['scallion', 5], ['chinese_cabbage', 80],
  ], { tags: ['stew'], aliases: ['狮子头', '四喜丸子'] }),
  D('cn_mayi_shangshu', '蚂蚁上树', 'protein', 'cn', 'normal', 'LD', '1盘(约210g)', [
    ['glass_noodles_dry', 60], ['pork_ground', 60], ['doubanjiang', 6.5], ['soy_sauce', 5.5], ['oil', 12], ['scallion', 5], ['garlic', 5], ['broth', 50],
  ], { tags: ['spicy'], aliases: ['肉末粉丝'] }),
  D('cn_jiangbao_rouding', '酱爆肉丁', 'protein', 'cn', 'normal', 'LD', '1盘(约200g)', [
    ['pork_lean', 100], ['cucumber', 60], ['peanut', 15], ['sweet_bean_sauce', 15], ['soy_sauce', 5], ['oil', 10], ['sugar', 3],
  ]),
  D('cn_xianggu_roupian', '香菇肉片', 'protein', 'cn', 'normal', 'LD', '1盘(约230g)', [
    ['pork_lean', 100], ['shiitake', 100], ['oil', 10], ['soy_sauce', 8], ['oyster_sauce', 5], ['starch', 3], ['garlic', 5],
  ], { tags: ['quick'] }),
  D('cn_sun_chaorou', '笋炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约270g)', [
    ['pork_lean', 100], ['bamboo_shoot', 150], ['oil', 10], ['soy_sauce', 6.5], ['salt', 1], ['garlic', 5],
  ], { tags: ['quick'], aliases: ['竹笋炒肉'] }),
  D('cn_baochao_zhugan', '爆炒猪肝', 'protein', 'cn', 'normal', 'LD', '1盘(约250g)', [
    ['pork_liver', 120], ['onion', 50], ['green_pepper', 40], ['oil', 12], ['soy_sauce', 8], ['cooking_wine', 8], ['starch', 3], ['ginger', 5],
  ], { tags: ['quick'], aliases: ['炒猪肝'] }),

  // ===== 荤菜 · 牛羊 =====
  D('cn_tudou_dun_niurou', '土豆炖牛肉', 'protein', 'cn', 'normal', 'LD', '1碗(约380g)', [
    ['beef_brisket', 120], ['potato', 150], ['carrot', 50], ['onion', 30], ['oil', 8], ['soy_sauce', 7], ['salt', 0.5], ['cooking_wine', 8], ['ginger', 5],
  ], { tags: ['stew'], aliases: ['牛肉炖土豆'] }),
  D('cn_fanqie_niunan', '番茄牛腩', 'protein', 'cn', 'normal', 'LD', '1碗(约370g)', [
    ['beef_brisket', 120], ['tomato', 200], ['onion', 30], ['oil', 8], ['soy_sauce', 5.5], ['sugar', 3], ['salt', 1], ['ginger', 5],
  ], { tags: ['stew'], aliases: ['西红柿炖牛腩'] }),
  D('cn_heijiao_niuliu', '黑椒牛柳', 'protein', 'cn', 'normal', 'LD', '1盘(约240g)', [
    ['beef_lean', 120], ['onion', 60], ['green_pepper', 40], ['black_pepper_sauce', 18], ['oil', 12], ['starch', 4], ['soy_sauce', 4.5],
  ], { tags: ['quick'] }),
  D('cn_ziran_yangrou', '孜然羊肉', 'protein', 'cn', 'heavy', 'LD', '1盘(约220g)', [
    ['lamb', 120], ['onion', 60], ['oil', 15], ['chili_fresh', 10], ['sichuan_pepper', 3], ['soy_sauce', 5.5], ['salt', 1], ['coriander', 10],
  ], { tags: ['spicy'] }),
  D('cn_shuizhu_niurou', '水煮牛肉', 'protein', 'cn', 'heavy', 'LD', '1碗(约400g)', [
    ['beef_lean', 120], ['soy_sprouts', 80], ['youmaicai', 50], ['doubanjiang', 8.5], ['chili_oil', 11.5], ['oil', 10], ['sichuan_pepper', 3], ['starch', 5], ['soy_sauce', 3], ['garlic', 8], ['broth', 100],
  ], { tags: ['spicy'] }),
  D('cn_xiaochao_huangniurou', '小炒黄牛肉', 'protein', 'cn', 'heavy', 'LD', '1盘(约230g)', [
    ['beef_lean', 120], ['chili_fresh', 40], ['garlic_chives', 40], ['oil', 15], ['soy_sauce', 8], ['cooking_wine', 5], ['starch', 3], ['salt', 0.5], ['garlic', 5],
  ], { tags: ['spicy', 'quick'], aliases: ['湘式小炒牛肉'] }),
  D('cn_luobo_dun_yangrou', '萝卜炖羊肉', 'protein', 'cn', 'light', 'LD', '1碗(约650g)', [
    ['lamb', 120], ['white_radish', 200], ['water', 300], ['ginger', 8], ['salt', 2], ['cooking_wine', 8], ['scallion', 5], ['coriander', 5],
  ], { tags: ['stew'], aliases: ['羊肉炖萝卜'] }),
  D('cn_qincai_chao_niurou', '芹菜炒牛肉', 'protein', 'cn', 'normal', 'LD', '1盘(约270g)', [
    ['beef_lean', 100], ['celery', 150], ['oil', 10], ['soy_sauce', 8], ['starch', 3], ['salt', 0.5], ['garlic', 5],
  ], { tags: ['quick'] }),
  D('cn_jinzhengu_feiniu', '金针菇肥牛', 'protein', 'cn', 'normal', 'LD', '1盘(约290g)', [
    ['beef_brisket', 100], ['enoki', 150], ['oil', 8], ['soy_sauce', 9.5], ['oyster_sauce', 4.5], ['garlic', 8], ['chili_fresh', 5], ['sugar', 2],
  ], { tags: ['quick'] }),

  // ===== 荤菜 · 鸡鸭 =====
  D('cn_gongbao_jiding', '宫保鸡丁', 'protein', 'cn', 'normal', 'LD', '1盘(约230g)', [
    ['chicken_breast', 120], ['peanut', 15], ['cucumber', 50], ['oil', 10], ['soy_sauce', 10], ['sugar', 8], ['vinegar', 8], ['chili_oil', 5], ['starch', 4], ['sichuan_pepper', 2], ['garlic', 5], ['scallion', 10],
  ], { tags: ['spicy', 'sweet'], aliases: ['宫爆鸡丁'] }),
  D('cn_lazi_ji', '辣子鸡', 'protein', 'cn', 'fried', 'LD', '1盘(约230g)', [
    ['chicken_thigh', 150], ['oil', 20], ['chili_fresh', 30], ['sichuan_pepper', 10], ['soy_sauce', 6.5], ['sugar', 3], ['sesame', 3], ['garlic', 8], ['ginger', 5], ['starch', 5], ['salt', 1],
  ], { tags: ['spicy'], aliases: ['辣子鸡丁'] }),
  D('cn_baiqie_ji', '白切鸡', 'protein', 'cn', 'light', 'LD', '1碟(约180g)', [
    ['chicken_whole', 150], ['soy_sauce', 10], ['ginger', 10], ['scallion', 10], ['sesame_oil', 3],
  ], { tags: ['cold'], aliases: ['白斩鸡'] }),
  D('cn_kele_jichi', '可乐鸡翅', 'protein', 'cn', 'normal', 'LD', '4~5个(约270g)', [
    ['chicken_wing', 150], ['cola', 100], ['soy_sauce', 10], ['oil', 8], ['ginger', 5], ['cooking_wine', 5],
  ], { tags: ['sweet'] }),
  D('cn_xianggu_huaji', '香菇滑鸡', 'protein', 'cn', 'light', 'LD', '1碟(约230g)', [
    ['chicken_thigh', 120], ['shiitake', 80], ['soy_sauce', 8], ['oyster_sauce', 5], ['starch', 4], ['oil', 5], ['ginger', 5], ['scallion', 5],
  ], { aliases: ['香菇蒸鸡'] }),
  D('cn_dapan_ji', '大盘鸡', 'protein', 'cn', 'heavy', 'LD', '1份(约450g)', [
    ['chicken_thigh', 150], ['potato', 150], ['green_pepper', 50], ['onion', 30], ['oil', 18], ['doubanjiang', 6.5], ['soy_sauce', 5.5], ['sugar', 4], ['chili_fresh', 10], ['sichuan_pepper', 2], ['garlic', 8], ['ginger', 5],
  ], { tags: ['spicy', 'stew'], aliases: ['新疆大盘鸡'] }),
  D('cn_koushui_ji', '口水鸡', 'protein', 'cn', 'heavy', 'LD', '1盘(约200g)', [
    ['chicken_thigh', 130], ['chili_oil', 19], ['soy_sauce', 11.5], ['sugar', 5], ['vinegar', 8], ['peanut', 10], ['sesame', 3], ['garlic', 8], ['scallion', 8], ['coriander', 5], ['sichuan_pepper', 2],
  ], { tags: ['spicy', 'cold'] }),
  D('cn_pijiu_ya', '啤酒鸭', 'protein', 'cn', 'normal', 'LD', '1碗(约370g)', [
    ['duck', 150], ['beer', 150], ['soy_sauce', 8], ['oil', 8], ['sugar', 4], ['ginger', 8], ['green_pepper', 30], ['garlic', 5], ['doubanjiang', 4],
  ], { tags: ['stew'] }),
  D('cn_yanshui_ya', '盐水鸭', 'protein', 'cn', 'light', 'LD', '1碟(约180g)', [
    ['duck', 120], ['salt', 2], ['ginger', 5], ['sichuan_pepper', 1], ['water', 50],
  ], { tags: ['cold'], aliases: ['南京盐水鸭'] }),
  D('cn_huangmen_ji', '黄焖鸡', 'protein', 'cn', 'normal', 'LD', '1碗(约450g)', [
    ['chicken_thigh', 150], ['shiitake', 50], ['green_pepper', 40], ['potato', 60], ['oil', 10], ['soy_sauce', 8.5], ['oyster_sauce', 6], ['sugar', 3], ['cooking_wine', 5], ['ginger', 5], ['garlic', 5], ['water', 100],
  ], { tags: ['stew'] }),
  D('cn_mizhi_kaochi', '蜜汁烤鸡翅', 'protein', 'cn', 'normal', 'LD', '4~5个(约180g)', [
    ['chicken_wing', 150], ['honey', 10], ['soy_sauce', 10], ['oil', 3], ['garlic', 5],
  ], { tags: ['sweet'], aliases: ['烤鸡翅', '空气炸锅鸡翅'] }),
  D('cn_xilanhua_chao_jixiong', '西兰花炒鸡胸', 'protein', 'cn', 'light', 'LD', '1盘(约290g)', [
    ['chicken_breast', 120], ['broccoli', 150], ['oil', 5], ['soy_sauce', 6], ['oyster_sauce', 5], ['garlic', 5], ['starch', 2],
  ], { tags: ['quick'], aliases: ['鸡胸肉炒西兰花', '减脂鸡胸'] }),

  // ===== 荤菜 · 水产 =====
  D('cn_qingzheng_luyu', '清蒸鲈鱼', 'protein', 'cn', 'light', 'LD', '1条(约250g)', [
    ['fish_bass', 200], ['soy_sauce', 12], ['oil', 6], ['ginger', 10], ['scallion', 10], ['cooking_wine', 5],
  ], { aliases: ['清蒸鱼'] }),
  D('cn_hongshao_yu', '红烧鱼', 'protein', 'cn', 'normal', 'LD', '1份(约260g)', [
    ['fish_freshwater', 200], ['oil', 15], ['soy_sauce', 12], ['sugar', 5], ['cooking_wine', 8], ['ginger', 8], ['scallion', 8], ['garlic', 5], ['starch', 3],
  ], { aliases: ['红烧草鱼', '红烧鲤鱼'] }),
  D('cn_suancai_yu', '酸菜鱼', 'protein', 'cn', 'heavy', 'LD', '1碗(约550g)', [
    ['fish_freshwater', 180], ['sauerkraut', 120], ['oil', 15], ['chili_fresh', 10], ['sichuan_pepper', 3], ['ginger', 8], ['garlic', 8], ['egg_white', 15], ['starch', 5], ['salt', 1], ['broth', 200],
  ], { tags: ['spicy'] }),
  D('cn_baizhuo_xia', '白灼虾', 'protein', 'cn', 'light', 'LD', '1盘(约175g)', [
    ['shrimp', 150], ['soy_sauce', 10], ['ginger', 5], ['scallion', 5], ['vinegar', 5],
  ], { tags: ['quick'], aliases: ['水煮虾', '白灼基围虾'] }),
  D('cn_youmen_daxia', '油焖大虾', 'protein', 'cn', 'heavy', 'LD', '1盘(约210g)', [
    ['shrimp', 150], ['oil', 18], ['ketchup', 15], ['soy_sauce', 8], ['sugar', 8], ['cooking_wine', 5], ['ginger', 5], ['scallion', 5],
  ], { tags: ['sweet'] }),
  D('cn_jiuhuang_xiaren', '韭黄炒虾仁', 'protein', 'cn', 'normal', 'LD', '1盘(约220g)', [
    ['shrimp', 100], ['garlic_chives', 100], ['oil', 10], ['salt', 1.5], ['cooking_wine', 5], ['starch', 2],
  ], { tags: ['quick'], aliases: ['韭菜炒虾仁'] }),
  D('cn_suanrong_fensi_shanbei', '蒜蓉粉丝扇贝', 'protein', 'cn', 'normal', 'LD', '1盘(约190g)', [
    ['scallop', 120], ['glass_noodles_dry', 25], ['garlic', 20], ['oil', 10], ['soy_sauce', 8], ['scallion', 5], ['chili_fresh', 5],
  ], { aliases: ['蒜蓉扇贝', '蒜蓉粉丝蛤蜊'] }),
  D('cn_baochao_youyu', '爆炒鱿鱼', 'protein', 'cn', 'heavy', 'LD', '1盘(约280g)', [
    ['squid', 150], ['green_pepper', 50], ['onion', 40], ['oil', 15], ['doubanjiang', 7], ['soy_sauce', 5], ['cooking_wine', 5], ['garlic', 5], ['ginger', 5],
  ], { tags: ['spicy', 'quick'] }),
  D('cn_qingchao_xiaren', '清炒虾仁', 'protein', 'cn', 'light', 'LD', '1盘(约200g)', [
    ['shrimp', 120], ['cucumber', 60], ['oil', 5], ['salt', 1], ['cooking_wine', 5], ['starch', 2], ['ginger', 3],
  ], { tags: ['quick'], aliases: ['黄瓜炒虾仁'] }),
  D('cn_ganjian_daiyu', '干煎带鱼', 'protein', 'cn', 'fried', 'LD', '1盘(约180g)', [
    ['fish_sea', 150], ['oil', 15], ['starch', 8], ['salt', 1.5], ['cooking_wine', 5], ['ginger', 5],
  ], { aliases: ['香煎带鱼', '煎带鱼'] }),
  D('cn_xiaren_chaodan', '虾仁炒蛋', 'protein', 'cn', 'normal', 'LD', '1盘(约180g)', [
    ['shrimp', 60], ['egg', 100], ['oil', 10], ['salt', 1.2], ['scallion', 5], ['cooking_wine', 3],
  ], { tags: ['quick'], aliases: ['滑蛋虾仁'] }),

  // ===== 蛋与豆制品 =====
  D('cn_jiucai_chaodan', '韭菜炒蛋', 'protein', 'cn', 'normal', 'BLD', '1盘(约210g)', [
    ['egg', 100], ['garlic_chives', 100], ['oil', 10], ['salt', 1.5],
  ], { tags: ['quick'], aliases: ['韭菜鸡蛋'] }),
  D('cn_zheng_shuidan', '蒸水蛋', 'protein', 'cn', 'light', 'BLD', '1碗(约260g)', [
    ['egg', 100], ['water', 150], ['soy_sauce', 5], ['sesame_oil', 2], ['salt', 0.5], ['scallion', 3],
  ], { tags: ['quick'], aliases: ['鸡蛋羹', '蒸鸡蛋', '水蒸蛋'] }),
  D('cn_kugua_chaodan', '苦瓜炒蛋', 'protein', 'cn', 'normal', 'LD', '1盘(约265g)', [
    ['egg', 100], ['bitter_melon', 150], ['oil', 10], ['salt', 1.5], ['garlic', 5],
  ], { tags: ['quick'] }),
  D('cn_mapo_doufu', '麻婆豆腐', 'protein', 'cn', 'heavy', 'LD', '1碗(约350g)', [
    ['tofu', 200], ['pork_ground', 30], ['doubanjiang', 8.5], ['chili_oil', 4.5], ['oil', 8], ['sichuan_pepper', 2], ['soy_sauce', 3], ['starch', 5], ['garlic', 5], ['scallion', 5], ['broth', 80],
  ], { tags: ['spicy'] }),
  D('cn_jiachang_doufu', '家常豆腐', 'protein', 'cn', 'normal', 'LD', '1盘(约330g)', [
    ['tofu', 200], ['pork_belly', 30], ['green_pepper', 40], ['wood_ear', 20], ['oil', 15], ['doubanjiang', 7], ['soy_sauce', 5], ['sugar', 2], ['starch', 3], ['garlic', 5],
  ]),
  D('cn_hongshao_doufu', '红烧豆腐', 'protein', 'cn', 'normal', 'LD', '1盘(约280g)', [
    ['tofu', 200], ['oil', 12], ['soy_sauce', 10], ['oyster_sauce', 4], ['sugar', 3], ['starch', 3], ['scallion', 5], ['garlic', 5], ['shiitake', 30],
  ]),
  D('cn_xianggan_qincai', '香干炒芹菜', 'protein', 'cn', 'normal', 'LD', '1盘(约270g)', [
    ['tofu_dried', 100], ['celery', 150], ['oil', 10], ['soy_sauce', 5.5], ['salt', 1], ['garlic', 5],
  ], { tags: ['quick'], aliases: ['芹菜炒香干', '芹菜豆干'] }),
  D('cn_pidan_doufu', '皮蛋豆腐', 'protein', 'cn', 'light', 'LD', '1盘(约290g)', [
    ['tofu_soft', 200], ['century_egg', 60], ['soy_sauce', 12], ['sesame_oil', 4], ['vinegar', 5], ['scallion', 5], ['chili_fresh', 3],
  ], { tags: ['cold', 'quick'], aliases: ['凉拌皮蛋豆腐'] }),
  D('cn_roumo_zheng_doufu', '肉末蒸豆腐', 'protein', 'cn', 'light', 'LD', '1碟(约275g)', [
    ['tofu_soft', 200], ['pork_ground', 50], ['soy_sauce', 10], ['oil', 3], ['sesame_oil', 2], ['starch', 3], ['scallion', 5], ['ginger', 3],
  ], { aliases: ['肉沫豆腐'] }),

  // ===== 素菜 =====
  D('cn_qingchao_xilanhua', '清炒西兰花', 'veg', 'cn', 'light', 'LD', '1盘(约210g)', [
    ['broccoli', 200], ['oil', 5], ['salt', 1.5], ['garlic', 5],
  ], { tags: ['quick'], aliases: ['白灼西兰花'] }),
  D('cn_suanrong_xilanhua', '蒜蓉西兰花', 'veg', 'cn', 'normal', 'LD', '1盘(约230g)', [
    ['broccoli', 200], ['garlic', 15], ['oil', 8], ['salt', 1.5], ['oyster_sauce', 4.5],
  ], { tags: ['quick'] }),
  D('cn_shousi_baocai', '手撕包菜', 'veg', 'cn', 'normal', 'LD', '1盘(约230g)', [
    ['cabbage', 200], ['oil', 10], ['soy_sauce', 5.5], ['vinegar', 5], ['garlic', 8], ['chili_fresh', 5], ['salt', 1],
  ], { tags: ['quick', 'spicy'], aliases: ['炝炒包菜', '干锅包菜'] }),
  D('cn_disanxian', '地三鲜', 'veg', 'cn', 'fried', 'LD', '1盘(约320g)', [
    ['eggplant', 120], ['potato', 100], ['green_pepper', 50], ['oil', 22], ['soy_sauce', 10], ['garlic', 8], ['sugar', 3], ['starch', 4],
  ]),
  D('cn_ganbian_sijidou', '干煸四季豆', 'veg', 'cn', 'heavy', 'LD', '1盘(约250g)', [
    ['green_beans', 200], ['pork_ground', 20], ['oil', 13], ['preserved_veg', 10], ['soy_sauce', 5], ['garlic', 5], ['chili_fresh', 5], ['salt', 0.5],
  ], { tags: ['spicy'], aliases: ['干煸豆角'] }),
  D('cn_culiu_tudousi', '醋溜土豆丝', 'veg', 'cn', 'normal', 'LD', '1盘(约230g)', [
    ['potato', 200], ['oil', 10], ['vinegar', 12], ['salt', 1.5], ['garlic', 5], ['chili_fresh', 5], ['sugar', 2],
  ], { tags: ['quick'], aliases: ['炒土豆丝'] }),
  D('cn_suanla_tudousi', '酸辣土豆丝', 'veg', 'cn', 'normal', 'LD', '1盘(约240g)', [
    ['potato', 200], ['oil', 10], ['vinegar', 12], ['chili_fresh', 10], ['sichuan_pepper', 1], ['salt', 1.5], ['garlic', 5], ['green_pepper', 20],
  ], { tags: ['quick', 'spicy'] }),
  D('cn_suanrong_kongxincai', '蒜蓉空心菜', 'veg', 'cn', 'normal', 'LD', '1盘(约275g)', [
    ['water_spinach', 250], ['garlic', 15], ['oil', 10], ['salt', 1.5],
  ], { tags: ['quick'], aliases: ['炒空心菜', '蒜蓉通菜'] }),
  D('cn_haoyou_shengcai', '蚝油生菜', 'veg', 'cn', 'light', 'LD', '1盘(约275g)', [
    ['lettuce', 250], ['oyster_sauce', 12], ['oil', 5], ['garlic', 8], ['soy_sauce', 3],
  ], { tags: ['quick'], aliases: ['白灼生菜'] }),
  D('cn_shangtang_wawacai', '上汤娃娃菜', 'veg', 'cn', 'light', 'LD', '1碗(约440g)', [
    ['chinese_cabbage', 250], ['broth', 150], ['century_egg', 20], ['garlic', 8], ['oil', 5], ['salt', 0.5], ['dried_shrimp', 3],
  ], { aliases: ['娃娃菜'] }),
  D('cn_qingchao_youmaicai', '清炒油麦菜', 'veg', 'cn', 'light', 'LD', '1盘(约260g)', [
    ['youmaicai', 250], ['oil', 5], ['salt', 1.5], ['garlic', 5],
  ], { tags: ['quick'], aliases: ['蒜蓉油麦菜'] }),
  D('cn_liangban_huanggua', '凉拌黄瓜', 'veg', 'cn', 'light', 'LDS', '1盘(约290g)', [
    ['cucumber', 250], ['garlic', 10], ['vinegar', 10], ['soy_sauce', 8], ['sesame_oil', 4], ['sugar', 2], ['chili_oil', 1], ['salt', 0.5],
  ], { tags: ['cold', 'quick'], aliases: ['拍黄瓜', '蒜泥黄瓜'] }),
  D('cn_liangban_muer', '凉拌木耳', 'veg', 'cn', 'light', 'LD', '1盘(约195g)', [
    ['wood_ear', 150], ['garlic', 8], ['vinegar', 12], ['soy_sauce', 8], ['sesame_oil', 4], ['chili_fresh', 5], ['sugar', 2], ['coriander', 5], ['salt', 0.3],
  ], { tags: ['cold', 'quick'] }),
  D('cn_xiqin_baihe', '西芹百合', 'veg', 'cn', 'light', 'LD', '1盘(约245g)', [
    ['celery', 150], ['lily_bulb', 60], ['oil', 4], ['salt', 1.5], ['starch', 2], ['garlic', 3],
  ], { tags: ['quick'], aliases: ['芹菜百合'] }),
  D('cn_yuxiang_qiezi', '鱼香茄子', 'veg', 'cn', 'heavy', 'LD', '1盘(约320g)', [
    ['eggplant', 250], ['oil', 18], ['doubanjiang', 6.5], ['sugar', 8], ['vinegar', 8], ['soy_sauce', 4.5], ['starch', 4], ['garlic', 8], ['ginger', 3], ['scallion', 5],
  ], { tags: ['spicy', 'sweet'] }),
  D('cn_shao_qiezi', '烧茄子', 'veg', 'cn', 'heavy', 'LD', '1盘(约320g)', [
    ['eggplant', 250], ['oil', 18], ['soy_sauce', 10], ['garlic', 10], ['sugar', 3], ['starch', 4], ['green_pepper', 30],
  ], { aliases: ['红烧茄子', '蒜香茄子'] }),
  D('cn_fanqie_chao_huacai', '番茄炒花菜', 'veg', 'cn', 'normal', 'LD', '1盘(约320g)', [
    ['cauliflower', 200], ['tomato', 100], ['oil', 10], ['salt', 1.5], ['sugar', 2], ['garlic', 5], ['ketchup', 5],
  ], { tags: ['quick'], aliases: ['西红柿炒菜花'] }),
  D('cn_chao_sanding', '炒三丁', 'veg', 'cn', 'normal', 'LD', '1盘(约270g)', [
    ['potato', 100], ['carrot', 60], ['cucumber', 60], ['sweet_corn_kernels', 40], ['oil', 8], ['salt', 1.5], ['garlic', 3],
  ], { tags: ['quick'], aliases: ['土豆胡萝卜丁', '素炒三丁'] }),
  D('cn_xianggu_qingcai', '香菇青菜', 'veg', 'cn', 'light', 'LD', '1盘(约275g)', [
    ['bok_choy', 200], ['shiitake', 60], ['oil', 4], ['oyster_sauce', 6], ['salt', 0.8], ['garlic', 5],
  ], { tags: ['quick'], aliases: ['香菇油菜', '香菇小白菜'] }),
  D('cn_suanrong_tonghao', '蒜蓉茼蒿', 'veg', 'cn', 'light', 'LD', '1盘(约270g)', [
    ['garland_chrysanthemum', 250], ['garlic', 12], ['oil', 4], ['salt', 1.5],
  ], { tags: ['quick'], aliases: ['清炒茼蒿'] }),
  D('cn_jiucai_chao_douya', '韭菜炒豆芽', 'veg', 'cn', 'light', 'LD', '1盘(约270g)', [
    ['bean_sprouts', 200], ['garlic_chives', 60], ['oil', 4], ['salt', 1.5], ['vinegar', 3],
  ], { tags: ['quick'], aliases: ['炒豆芽'] }),
  D('cn_chao_oupian', '清炒藕片', 'veg', 'cn', 'normal', 'LD', '1盘(约240g)', [
    ['lotus_root', 200], ['oil', 8], ['vinegar', 5], ['salt', 1.5], ['garlic', 5], ['green_pepper', 20], ['scallion', 5],
  ], { tags: ['quick'], aliases: ['炒藕片', '醋溜藕片'] }),
  D('cn_qingchao_sigua', '清炒丝瓜', 'veg', 'cn', 'light', 'LD', '1盘(约265g)', [
    ['luffa', 250], ['oil', 4], ['salt', 1.5], ['garlic', 5], ['starch', 2],
  ], { tags: ['quick'], aliases: ['蒜蓉丝瓜'] }),
  D('cn_suanrong_jinzhengu', '蒜蓉金针菇', 'veg', 'cn', 'light', 'LD', '1盘(约240g)', [
    ['enoki', 200], ['garlic', 15], ['soy_sauce', 10], ['oil', 4], ['chili_fresh', 5], ['scallion', 5], ['sugar', 1],
  ], { tags: ['quick'], aliases: ['蒜蓉蒸金针菇'] }),
  D('cn_hongshao_donggua', '红烧冬瓜', 'veg', 'cn', 'light', 'LD', '1盘(约330g)', [
    ['winter_melon', 300], ['oil', 4], ['soy_sauce', 8.5], ['oyster_sauce', 4.5], ['sugar', 2], ['garlic', 5], ['scallion', 5],
  ], { tags: ['quick'], aliases: ['烧冬瓜', '蚝油冬瓜'] }),
  D('cn_liangban_haidai', '凉拌海带丝', 'veg', 'cn', 'light', 'LDS', '1盘(约235g)', [
    ['kelp', 200], ['garlic', 8], ['vinegar', 10], ['soy_sauce', 8], ['sesame_oil', 4], ['chili_oil', 1], ['sugar', 2], ['sesame', 2],
  ], { tags: ['cold', 'quick'] }),
  D('cn_suanla_baicai', '酸辣白菜', 'veg', 'cn', 'normal', 'LD', '1盘(约290g)', [
    ['chinese_cabbage', 250], ['oil', 8], ['vinegar', 12], ['chili_fresh', 10], ['sugar', 3], ['soy_sauce', 5], ['salt', 1], ['starch', 3], ['sichuan_pepper', 1],
  ], { tags: ['quick', 'spicy'], aliases: ['醋溜白菜'] }),
  D('cn_qingchao_nangua', '清炒南瓜', 'veg', 'cn', 'light', 'LD', '1盘(约265g)', [
    ['pumpkin', 250], ['oil', 4], ['salt', 1.5], ['garlic', 5], ['scallion', 3],
  ], { tags: ['quick'], aliases: ['炒南瓜', '蒸南瓜'] }),
  D('cn_qingchao_lusun', '清炒芦笋', 'veg', 'cn', 'light', 'LD', '1盘(约210g)', [
    ['asparagus', 200], ['oil', 4], ['salt', 1.2], ['garlic', 5],
  ], { tags: ['quick'], aliases: ['蒜蓉芦笋'] }),
  D('cn_ganguo_huacai', '干锅花菜', 'veg', 'cn', 'heavy', 'LD', '1盘(约310g)', [
    ['cauliflower', 250], ['pork_belly', 20], ['oil', 12], ['doubanjiang', 7], ['soy_sauce', 4], ['garlic', 8], ['chili_fresh', 8], ['sugar', 2],
  ], { tags: ['spicy'], aliases: ['干锅菜花', '干锅有机花菜'] }),
  D('cn_liangban_bocai', '凉拌菠菜', 'veg', 'cn', 'light', 'LD', '1盘(约240g)', [
    ['spinach', 200], ['peanut', 10], ['garlic', 8], ['vinegar', 10], ['soy_sauce', 8], ['sesame_oil', 4], ['sugar', 1],
  ], { tags: ['cold', 'quick'], aliases: ['花生拌菠菜'] }),
  D('cn_qingchao_helandou', '清炒荷兰豆', 'veg', 'cn', 'light', 'LD', '1盘(约210g)', [
    ['snow_peas', 200], ['oil', 4], ['salt', 1.5], ['garlic', 5],
  ], { tags: ['quick'], aliases: ['蒜蓉荷兰豆'] }),

  // ===== 汤 =====
  D('cn_fanqie_dan_tang', '番茄蛋汤', 'soup', 'cn', 'light', 'LD', '1碗(约510g)', [
    ['tomato', 150], ['egg', 50], ['water', 300], ['oil', 4], ['salt', 1.5], ['scallion', 5], ['sesame_oil', 1],
  ], { tags: ['quick'], aliases: ['西红柿鸡蛋汤'] }),
  D('cn_zicai_danhua_tang', '紫菜蛋花汤', 'soup', 'cn', 'light', 'BLD', '1碗(约415g)', [
    ['nori', 5], ['egg', 50], ['water', 350], ['salt', 1.5], ['sesame_oil', 2], ['scallion', 5], ['dried_shrimp', 3],
  ], { tags: ['quick'], aliases: ['紫菜汤'] }),
  D('cn_donggua_paigu_tang', '冬瓜排骨汤', 'soup', 'cn', 'normal', 'LD', '1碗(约660g)', [
    ['pork_ribs', 100], ['winter_melon', 200], ['water', 350], ['ginger', 5], ['salt', 1.5], ['scallion', 3],
  ], { tags: ['stew'] }),
  D('cn_yumi_paigu_tang', '玉米排骨汤', 'soup', 'cn', 'normal', 'LD', '1碗(约610g)', [
    ['pork_ribs', 100], ['corn', 100], ['carrot', 50], ['water', 350], ['ginger', 5], ['salt', 1.5],
  ], { tags: ['stew'], aliases: ['玉米胡萝卜排骨汤'] }),
  D('cn_lianou_paigu_tang', '莲藕排骨汤', 'soup', 'cn', 'normal', 'LD', '1碗(约610g)', [
    ['pork_ribs', 100], ['lotus_root', 150], ['water', 350], ['ginger', 5], ['salt', 1.5],
  ], { tags: ['stew'] }),
  D('cn_luobo_niunan_tang', '萝卜牛腩汤', 'soup', 'cn', 'normal', 'LD', '1碗(约660g)', [
    ['beef_brisket', 100], ['white_radish', 200], ['water', 350], ['ginger', 5], ['salt', 1.5], ['coriander', 5],
  ], { tags: ['stew'], aliases: ['清炖牛腩'] }),
  D('cn_suanla_tang', '酸辣汤', 'soup', 'cn', 'normal', 'LD', '1碗(约490g)', [
    ['tofu_soft', 60], ['egg', 30], ['wood_ear', 30], ['shiitake', 30], ['carrot', 20], ['vinegar', 15], ['soy_sauce', 5.5], ['starch', 8], ['chili_oil', 2], ['sichuan_pepper', 1], ['water', 300], ['salt', 0.5], ['sesame_oil', 2],
  ], { tags: ['spicy'] }),
  D('cn_jungu_tang', '菌菇汤', 'soup', 'cn', 'light', 'LD', '1碗(约540g)', [
    ['shiitake', 60], ['enoki', 60], ['king_oyster', 60], ['water', 350], ['oil', 3], ['salt', 1.5], ['ginger', 3], ['scallion', 3],
  ], { tags: ['quick'], aliases: ['杂菌汤', '三鲜菌汤'] }),
  D('cn_doufu_jiyu_tang', '豆腐鲫鱼汤', 'soup', 'cn', 'light', 'LD', '1碗(约620g)', [
    ['fish_freshwater', 150], ['tofu', 100], ['water', 350], ['oil', 3], ['ginger', 8], ['salt', 1.5], ['scallion', 5], ['cooking_wine', 5], ['coriander', 3],
  ], { tags: ['stew'], aliases: ['鲫鱼豆腐汤', '鱼头豆腐汤'] }),
  D('cn_qingcai_doufu_tang', '青菜豆腐汤', 'soup', 'cn', 'light', 'LD', '1碗(约505g)', [
    ['bok_choy', 100], ['tofu', 100], ['water', 300], ['oil', 3], ['salt', 1.5], ['sesame_oil', 1],
  ], { tags: ['quick'], aliases: ['小白菜豆腐汤'] }),
  D('cn_sigua_dan_tang', '丝瓜蛋汤', 'soup', 'cn', 'light', 'LD', '1碗(约510g)', [
    ['luffa', 150], ['egg', 50], ['water', 300], ['oil', 4], ['salt', 1.5], ['scallion', 3],
  ], { tags: ['quick'] }),
  D('cn_ji_tang', '清炖鸡汤', 'soup', 'cn', 'light', 'LD', '1碗(约525g)', [
    ['chicken_whole', 120], ['shiitake', 30], ['red_dates', 10], ['ginger', 8], ['water', 350], ['salt', 1.5], ['cooking_wine', 5],
  ], { tags: ['stew'], aliases: ['鸡汤', '香菇鸡汤'] }),
  D('cn_yangrou_tang', '羊肉汤', 'soup', 'cn', 'light', 'LD', '1碗(约575g)', [
    ['lamb', 100], ['white_radish', 100], ['water', 350], ['ginger', 8], ['salt', 1.5], ['coriander', 8], ['scallion', 5], ['sichuan_pepper', 1],
  ], { tags: ['stew'], aliases: ['羊汤', '萝卜羊肉汤'] }),
  D('cn_haidai_doufu_tang', '海带豆腐汤', 'soup', 'cn', 'light', 'LD', '1碗(约510g)', [
    ['kelp', 100], ['tofu', 100], ['water', 300], ['salt', 1.5], ['oil', 3], ['scallion', 3], ['ginger', 3],
  ], { tags: ['quick'] }),
  D('cn_yiner_hongzao_tang', '银耳红枣汤', 'soup', 'cn', 'light', 'LDS', '1碗(约460g)', [
    ['tremella', 80], ['red_dates', 20], ['sugar', 10], ['water', 350],
  ], { tags: ['sweet'], aliases: ['银耳汤', '银耳莲子羹'] }),
  D('cn_luobo_rouwan_tang', '萝卜肉丸汤', 'soup', 'cn', 'light', 'LD', '1碗(约485g)', [
    ['pork_lean', 60], ['white_radish', 100], ['starch', 5], ['egg_white', 10], ['water', 300], ['salt', 1.5], ['scallion', 5], ['ginger', 3], ['sesame_oil', 1],
  ], { aliases: ['肉丸汤', '丸子汤'] }),
]
