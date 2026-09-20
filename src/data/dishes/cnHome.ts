import type { Dish } from '../../core/types'
import { D } from './helper'

// 中式家常补充批次（2026-09-20）：实测 36 个常见家常菜名，24 个搜索零结果，这里补最高频的一批。
// 份量为一人份，含烹调油与盐，口径与 cnMain.ts 一致：
//   清淡 3~5 g 油 / 常规 8~12 g / 重油 15~25 g；一道菜 1~2 g 盐（酱油等按钠折算）
// 刻意不放味精鸡精：现有 569 道菜都没放，新菜单独放会让它们显得系统性偏咸、被推荐器躲开。
// 味精要不要进菜谱是全库层面的决定，不在这一批里夹带。
// 别名按用户实际会打的字加（肉沫/肉末、圆白菜/包菜、青笋/莴笋…）。
//
// npm run validate 下有 4 条 warning 是**有意保留**的，别去压数据：
//   · cnh_suancai_bairou 钠 943 —— 咸味来自酸菜本身(110 g≈880 mg)，未额外加盐；参照既有的酸菜鱼 1639
//   · cnh_duojiao_yutou 钠 1689 —— 剁椒 28 g 即 1540 mg，这道菜本来就咸，高血压模式会正确硬排除
//   · cnh_ganguo_tudoupian 蔬菜 60 g —— 土豆在库里归 tuber 不算蔬菜，与既有的醋溜土豆丝(蔬菜仅 0 g)同因
//   · cnh_ganguo_tudoupian 脂肪 21.4 g —— 干锅本就重油(cook='heavy')，参照既有的地三鲜 22.5 g
export const DISHES_CN_HOME: Dish[] = [
  // ===== 肉末系列 =====
  D('cnh_rousi_jiangdou', '肉末豇豆', 'protein', 'cn', 'normal', 'LD', '1盘(约240g)', [
    ['long_beans', 180], ['pork_ground', 50], ['oil', 12], ['soy_sauce_light', 8], ['garlic', 5], ['chili_fresh', 3], ['salt', 0.5],
  ], { tags: ['quick'], aliases: ['肉沫豇豆', '豇豆炒肉末', '干煸豇豆', '肉末豆角'] }),
  D('cnh_rousi_donggua', '肉末冬瓜', 'veg', 'cn', 'normal', 'LD', '1盘(约250g)', [
    ['winter_melon', 200], ['pork_ground', 40], ['oil', 8], ['soy_sauce_light', 6], ['ginger', 3], ['salt', 0.5],
  ], { aliases: ['肉沫冬瓜', '冬瓜炒肉末'] }),

  // ===== 炖菜 =====
  D('cnh_zhurou_fentiao', '猪肉炖粉条', 'protein', 'cn', 'heavy', 'LD', '1碗(约320g)', [
    ['pork_belly', 80], ['sweet_potato_noodle', 40], ['chinese_cabbage', 120], ['oil', 8], ['soy_sauce_dark', 5], ['soy_sauce_light', 4], ['ginger', 5], ['scallion', 5], ['salt', 0.3],
  ], { tags: ['stew'], aliases: ['东北猪肉炖粉条', '白菜炖粉条'] }),
  D('cnh_xiaoji_donggu', '小鸡炖蘑菇', 'protein', 'cn', 'normal', 'LD', '1碗(约280g)', [
    ['chicken_thigh', 150], ['shiitake_dried', 12], ['sweet_potato_noodle', 25], ['oil', 10], ['soy_sauce_light', 8], ['cooking_wine', 8], ['ginger', 5], ['scallion', 5], ['salt', 0.3],
  ], { tags: ['stew'], aliases: ['小鸡炖榛蘑', '鸡肉炖蘑菇'] }),
  D('cnh_baicai_doufu', '白菜炖豆腐', 'protein', 'cn', 'light', 'LD', '1碗(约300g)', [
    ['chinese_cabbage', 180], ['tofu', 100], ['oil', 8], ['scallion', 5], ['salt', 1.5],
  ], { tags: ['stew'], aliases: ['豆腐炖白菜', '白菜豆腐'] }),
  D('cnh_paigu_doujiao', '排骨炖豆角', 'protein', 'cn', 'normal', 'LD', '1碗(约300g)', [
    ['pork_ribs', 120], ['green_beans', 120], ['potato', 60], ['oil', 8], ['soy_sauce_light', 8], ['ginger', 5], ['salt', 0.3],
  ], { tags: ['stew'], aliases: ['豆角炖排骨', '排骨炖芸豆'] }),
  D('cnh_tudou_jikuai', '土豆炖鸡块', 'protein', 'cn', 'normal', 'LD', '1碗(约320g)', [
    ['chicken_thigh', 130], ['potato', 120], ['carrot', 40], ['oil', 10], ['soy_sauce_light', 8], ['soy_sauce_dark', 3], ['ginger', 5], ['salt', 0.2],
  ], { tags: ['stew'], aliases: ['鸡块炖土豆', '土豆烧鸡'] }),
  D('cnh_suancai_bairou', '酸菜白肉', 'protein', 'cn', 'normal', 'LD', '1碗(约280g)', [
    ['pork_belly', 100], ['sauerkraut', 110], ['glass_noodles_dry', 20], ['oil', 6], ['ginger', 5],
  ], { tags: ['stew'], aliases: ['酸菜炖白肉', '酸菜五花肉'] }),

  // ===== 炒蛋系列 =====
  D('cnh_huanggua_chaodan', '黄瓜炒蛋', 'protein', 'cn', 'normal', 'LD', '1盘(约250g)', [
    ['cucumber', 150], ['egg', 100], ['oil', 12], ['scallion', 3], ['salt', 1.2],
  ], { tags: ['quick'], aliases: ['黄瓜炒鸡蛋'] }),
  D('cnh_muer_chaodan', '木耳炒蛋', 'protein', 'cn', 'normal', 'LD', '1盘(约210g)', [
    ['wood_ear', 100], ['egg', 100], ['oil', 12], ['scallion', 3], ['salt', 1.2],
  ], { tags: ['quick'], aliases: ['木耳炒鸡蛋'] }),
  D('cnh_yangcong_chaodan', '洋葱炒蛋', 'protein', 'cn', 'normal', 'LD', '1盘(约230g)', [
    ['onion', 120], ['egg', 100], ['oil', 12], ['salt', 1.2],
  ], { tags: ['quick'], aliases: ['洋葱炒鸡蛋'] }),
  D('cnh_xihulu_chaodan', '西葫芦炒蛋', 'protein', 'cn', 'normal', 'LD', '1盘(约260g)', [
    ['zucchini', 150], ['egg', 100], ['oil', 12], ['salt', 1.2],
  ], { tags: ['quick'], aliases: ['西葫芦炒鸡蛋'] }),
  D('cnh_sigua_chaodan', '丝瓜炒蛋', 'protein', 'cn', 'normal', 'LD', '1盘(约260g)', [
    ['luffa', 150], ['egg', 100], ['oil', 12], ['salt', 1.2],
  ], { tags: ['quick'], aliases: ['丝瓜炒鸡蛋'] }),
  D('cnh_qingjiao_chaodan', '青椒炒蛋', 'protein', 'cn', 'normal', 'LD', '1盘(约230g)', [
    ['green_pepper', 120], ['egg', 100], ['oil', 12], ['salt', 1.2],
  ], { tags: ['quick'], aliases: ['青椒炒鸡蛋', '尖椒炒蛋'] }),
  D('cnh_xiangchun_chaodan', '香椿炒蛋', 'protein', 'cn', 'normal', 'LD', '1盘(约190g)', [
    ['toon', 80], ['egg', 100], ['oil', 12], ['salt', 1.2],
  ], { tags: ['quick'], aliases: ['香椿炒鸡蛋', '香椿芽炒蛋'] }),

  // ===== 炒肉系列 =====
  D('cnh_baocai_chaorou', '包菜炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约260g)', [
    ['cabbage', 180], ['pork_lean', 70], ['oil', 10], ['soy_sauce_light', 8], ['garlic', 5], ['salt', 0.5],
  ], { tags: ['quick'], aliases: ['圆白菜炒肉', '卷心菜炒肉', '莲花白炒肉'] }),
  D('cnh_baicai_chaorou', '白菜炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约260g)', [
    ['chinese_cabbage', 180], ['pork_lean', 70], ['oil', 10], ['soy_sauce_light', 8], ['garlic', 5], ['salt', 0.3],
  ], { tags: ['quick'], aliases: ['白菜炒肉片', '大白菜炒肉'] }),
  D('cnh_donggua_chaorou', '冬瓜炒肉', 'protein', 'cn', 'light', 'LD', '1盘(约250g)', [
    ['winter_melon', 180], ['pork_lean', 70], ['oil', 9], ['soy_sauce_light', 8], ['garlic', 4], ['salt', 0.5],
  ], { aliases: ['冬瓜炒肉片', '冬瓜烧肉'] }),
  D('cnh_huanggua_chaorou', '黄瓜炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约240g)', [
    ['cucumber', 150], ['pork_lean', 70], ['oil', 10], ['soy_sauce_light', 8], ['garlic', 5], ['salt', 0.5],
  ], { tags: ['quick'], aliases: ['黄瓜炒肉片'] }),
  D('cnh_yangcong_chaorou', '洋葱炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约230g)', [
    ['onion', 130], ['pork_lean', 80], ['oil', 10], ['soy_sauce_light', 8], ['salt', 0.5],
  ], { tags: ['quick'], aliases: ['洋葱炒肉片', '洋葱炒牛肉'] }),
  D('cnh_xingbaogu_chaorou', '杏鲍菇炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约240g)', [
    ['king_oyster', 150], ['pork_lean', 70], ['oil', 10], ['soy_sauce_light', 8], ['garlic', 5], ['salt', 0.5],
  ], { tags: ['quick'], aliases: ['杏鲍菇炒肉片'] }),
  D('cnh_qincai_rousi', '芹菜炒肉丝', 'protein', 'cn', 'normal', 'LD', '1盘(约240g)', [
    ['celery', 150], ['pork_lean', 70], ['oil', 10], ['soy_sauce_light', 7], ['salt', 0.2],
  ], { tags: ['quick'], aliases: ['芹菜炒肉', '西芹炒肉丝'] }),
  D('cnh_jiaobai_chaorou', '茭白炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约240g)', [
    ['water_bamboo', 150], ['pork_lean', 70], ['oil', 10], ['soy_sauce_light', 8], ['salt', 0.5],
  ], { aliases: ['茭白炒肉丝', '茭白肉丝'] }),
  D('cnh_suanmiao_chaorou', '蒜苗炒肉', 'protein', 'cn', 'normal', 'LD', '1盘(约220g)', [
    ['garlic_sprout', 120], ['pork_lean', 80], ['oil', 10], ['soy_sauce_light', 8], ['salt', 0.5],
  ], { tags: ['quick'], aliases: ['青蒜炒肉', '蒜苗炒肉丝'] }),

  // ===== 素菜 =====
  D('cnh_qingjiao_tudousi', '青椒土豆丝', 'veg', 'cn', 'normal', 'LD', '1盘(约250g)', [
    ['potato', 170], ['green_pepper', 80], ['oil', 10], ['vinegar', 6], ['salt', 1.2],
  ], { tags: ['quick'], aliases: ['尖椒土豆丝', '青椒炒土豆丝'] }),
  D('cnh_culiu_baicai', '醋溜白菜', 'veg', 'cn', 'normal', 'LD', '1盘(约220g)', [
    ['chinese_cabbage', 200], ['oil', 10], ['vinegar', 10], ['sugar', 4], ['sichuan_pepper', 1], ['salt', 1.2],
  ], { aliases: ['酸辣白菜片', '醋溜大白菜'] }),
  D('cnh_jianjiao_gandoufu', '尖椒干豆腐', 'veg', 'cn', 'normal', 'LD', '1盘(约210g)', [
    ['tofu_sheet', 78], ['green_pepper', 100], ['oil', 7], ['soy_sauce_light', 8], ['salt', 0.4],
  ], { aliases: ['尖椒干豆腐丝', '青椒千张'] }),
  D('cnh_hupi_qingjiao', '虎皮青椒', 'veg', 'cn', 'normal', 'LD', '1盘(约200g)', [
    ['green_pepper', 180], ['oil', 14], ['soy_sauce_light', 8], ['vinegar', 5], ['sugar', 3], ['garlic', 5],
  ], { aliases: ['煎青椒', '虎皮尖椒'] }),
  D('cnh_ganguo_tudoupian', '干锅土豆片', 'veg', 'cn', 'heavy', 'LD', '1盘(约250g)', [
    ['potato', 170], ['pork_belly', 25], ['green_pepper', 60], ['oil', 13], ['doubanjiang', 6], ['garlic', 5], ['salt', 0.3],
  ], { tags: ['spicy'], aliases: ['干锅土豆', '干煸土豆片'] }),
  D('cnh_suanrong_qiezi', '蒜蓉茄子', 'veg', 'cn', 'normal', 'LD', '1盘(约210g)', [
    ['eggplant', 180], ['garlic', 12], ['oil', 14], ['soy_sauce_light', 8], ['salt', 0.6],
  ], { aliases: ['蒜香茄子', '凉拌蒸茄子'] }),
  D('cnh_shangtang_bocai', '上汤菠菜', 'veg', 'cn', 'light', 'LD', '1碗(约250g)', [
    ['spinach', 180], ['egg', 30], ['broth', 150], ['oil', 5], ['garlic', 5], ['salt', 1],
  ], { aliases: ['上汤娃娃菜', '高汤菠菜'] }),
  D('cnh_xiandanhuang_nangua', '咸蛋黄炒南瓜', 'veg', 'cn', 'normal', 'LD', '1盘(约220g)', [
    ['pumpkin', 180], ['egg_yolk', 25], ['oil', 12], ['starch', 5], ['salt', 0.8],
  ], { aliases: ['蛋黄焗南瓜', '金沙南瓜'] }),
  D('cnh_shanyao_muer', '山药炒木耳', 'veg', 'cn', 'light', 'LD', '1盘(约220g)', [
    ['yam', 120], ['wood_ear', 80], ['oil', 8], ['garlic', 3], ['salt', 1],
  ], { aliases: ['木耳炒山药', '山药木耳'] }),

  // ===== 禽 / 鱼 =====
  D('cnh_hongshao_jichi', '红烧鸡翅', 'protein', 'cn', 'normal', 'LD', '1盘(约170g)', [
    ['chicken_wing', 150], ['oil', 8], ['soy_sauce_light', 7], ['soy_sauce_dark', 3], ['sugar', 6], ['cooking_wine', 8], ['ginger', 5],
  ], { tags: ['sweet'], aliases: ['酱烧鸡翅', '红烧鸡翅中'] }),
  D('cnh_gali_jikuai', '咖喱鸡块', 'protein', 'cn', 'normal', 'LD', '1碗(约300g)', [
    ['chicken_thigh', 130], ['potato', 100], ['carrot', 50], ['onion', 40], ['curry_block', 15], ['oil', 8],
  ], { aliases: ['咖喱鸡', '日式咖喱鸡'] }),
  D('cnh_duojiao_yutou', '剁椒鱼头', 'protein', 'cn', 'heavy', 'LD', '1份(约250g)', [
    ['fish_freshwater', 200], ['chopped_chili', 28], ['oil', 12], ['ginger', 5], ['scallion', 8], ['cooking_wine', 8],
  ], { tags: ['spicy'], aliases: ['湘式剁椒鱼头', '剁椒蒸鱼'] }),
  D('cnh_tangcu_yukuai', '糖醋鱼块', 'protein', 'cn', 'fried', 'LD', '1盘(约200g)', [
    ['fish_freshwater', 150], ['starch', 15], ['oil', 18], ['sugar', 15], ['vinegar', 12], ['ketchup', 10], ['salt', 0.8],
  ], { tags: ['sweet'], aliases: ['糖醋鱼', '糖醋脆皮鱼'] }),
  D('cnh_shousi_ji', '手撕鸡', 'protein', 'cn', 'light', 'LD', '1盘(约220g)', [
    ['chicken_breast', 120], ['cucumber', 80], ['sesame_paste', 8], ['soy_sauce_light', 8], ['chili_oil', 6], ['vinegar', 5], ['garlic', 5],
  ], { tags: ['cold'], aliases: ['凉拌鸡丝', '麻酱鸡丝'] }),

  // ===== 汤 =====
  D('cnh_donggua_wanzi_tang', '冬瓜丸子汤', 'soup', 'cn', 'normal', 'LD', '1碗(约350g)', [
    ['winter_melon', 150], ['pork_ground', 45], ['broth', 300], ['oil', 3], ['ginger', 3], ['scallion', 3], ['salt', 1.2],
  ], { aliases: ['冬瓜肉丸汤', '冬瓜丸子'] }),
  D('cnh_shanyao_paigu_tang', '山药排骨汤', 'soup', 'cn', 'normal', 'LD', '1碗(约400g)', [
    ['pork_ribs', 90], ['yam', 120], ['broth', 350], ['ginger', 5], ['salt', 1.2],
  ], { tags: ['stew'], aliases: ['排骨山药汤', '山药炖排骨'] }),
  D('cnh_huanghuacai_shourou_tang', '黄花菜瘦肉汤', 'soup', 'cn', 'light', 'LD', '1碗(约400g)', [
    ['daylily_dried', 15], ['pork_lean', 60], ['broth', 350], ['salt', 1.2],
  ], { aliases: ['金针菜瘦肉汤', '黄花菜汤'] }),
  D('cnh_pinggu_dan_tang', '平菇蛋汤', 'soup', 'cn', 'light', 'LD', '1碗(约350g)', [
    ['oyster_mushroom', 100], ['egg', 50], ['broth', 300], ['oil', 3], ['salt', 1.2],
  ], { aliases: ['蘑菇蛋汤', '平菇鸡蛋汤'] }),

  // ===== 主食 =====
  // 下面三道粥蛋白极低（紫薯粥/黑米粥几乎只有碳水）。它们曾把老年人模式的早餐蛋白
  // 从「最低 16.0 g」拖到「7 个 seed 不足 15 g、最低 10.2 g」——根因不在这些菜，而在
  // balanceDay 全程只按全天预算压份量、没有任何按餐次的约束。该缺陷已在 planner.ts 的
  // D2 段修复（早餐蛋白下限 ELDERLY_BREAKFAST_PROTEIN），实测 200 个 seed 零失败，故放回。
  // 干米煮粥要按库里惯例补 water 把成品重量做平（见 staplesAndMore.ts 的燕麦粥/南瓜粥），
  // 否则「1 碗约 350 g」与食材合计 40 g 对不上，portion.test.ts 会拦。
  D('cnh_nangua_xiaomizhou', '南瓜小米粥', 'staple', 'cn', 'light', 'BS', '1碗(约350g)', [
    ['millet_raw', 40], ['pumpkin', 100], ['water', 210],
  ], { aliases: ['小米南瓜粥'] }),
  D('cnh_heimi_zhou', '黑米粥', 'staple', 'cn', 'light', 'BS', '1碗(约350g)', [
    ['black_rice', 40], ['water', 310],
  ], { aliases: ['黑米稀饭', '杂粮粥'] }),
  D('cnh_zishu_zhou', '紫薯粥', 'staple', 'cn', 'light', 'BS', '1碗(约350g)', [
    ['purple_sweet_potato', 100], ['rice_raw', 30], ['water', 220],
  ], { aliases: ['紫薯稀饭'] }),
  D('cnh_jiangdou_menmian', '豇豆焖面', 'staple', 'cn', 'normal', 'LD', '1碗(约320g)', [
    ['noodles_raw', 100], ['long_beans', 120], ['pork_belly', 40], ['oil', 10], ['soy_sauce_light', 10], ['garlic', 5],
  ], { aliases: ['豆角焖面', '焖面'] }),
]
