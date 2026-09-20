// 补录候选清单：对照《中国食物成分表》第 6 版的分类结构，逐条盘出「中餐高频但库里没有」的食材。
//
// 状态（2026-09-20）：45 条候选已全部落库，食材 372 → 419，清单当前为空。
// 下一轮要补时，往 CANDIDATES 里加条目即可；tests/conditionSets.test.ts 会校验
// 「已落库的候选，其声明的 sets 必须真的登记了」，所以 sets 字段务必填准。
// 这份清单是给人看、给人改的——补完一条就把它从这里删掉，再跑 npm run gaps 看剩余缺口。
//
// prio 的含义（按「补了会不会改变 App 的结论」排，不是按常见度排）：
//   0 = 现在只能用近似条目顶替，且营养值差得远 → 不补就是算错
//   1 = 中餐高频，库里完全没有，得靠用户手输
//   2 = 补了能让特殊人群模式（痛风/高血压/孕期…）判得更准
//   3 = 长尾，有则更好
//
// sets 列出补录后需要同步登记进 core/conditions.ts 的集合，漏登记 = 该食材对特殊人群模式隐形。
// src 是建议的取值来源：cfct6=中国食物成分表第6版 / tfda=台湾食药署 / mext=日本八訂 / usda=USDA

import type { IngredientCategory } from '../../src/core/types'

export interface Candidate {
  /** 建议 id，沿用现有命名风格 */
  id: string
  name: string
  cat: IngredientCategory
  prio: 0 | 1 | 2 | 3
  /** 为什么要补 */
  why: string
  /** 现在被什么条目顶替（有的话） */
  standin?: string
  /** 补录后需登记进 conditions.ts 的集合名 */
  sets?: string[]
  src: string
}

export const CANDIDATES: Candidate[] = [
  // ============ P0：现有近似条目在算错账 ============
  { id: 'egg_yolk', name: '蛋黄', cat: 'egg', prio: 0,
    why: '库里有「蛋白」没「蛋黄」。蛋黄 ~322kcal/28g脂肪 vs 蛋白 ~48kcal/0g脂肪，差一个数量级；蛋黄酥、蛋黄焗南瓜、咸蛋黄类菜现在只能拿整蛋硬凑',
    standin: 'egg(整蛋)', sets: ['SOFT_PROTEIN'], src: 'cfct6' },
  { id: 'fish_crucian', name: '鲫鱼', cat: 'seafood', prio: 0,
    why: '中餐最高频的淡水鱼之一（鲫鱼汤、红烧鲫鱼），现在被笼统的「淡水鱼(草鱼/鲤鱼)」吞掉；鲫鱼汤还是产后/哺乳期高频菜，哺乳模式下值得单列',
    standin: 'fish_freshwater', sets: ['PURINE_MEDIUM', 'LEAN_PROTEIN', 'SOFT_PROTEIN'], src: 'cfct6' },
  { id: 'pork_blood', name: '猪血', cat: 'meat', prio: 0,
    why: '毛血旺、血旺豆腐汤的主料，热量极低(~55kcal)但铁极高，拿任何现有猪肉条目顶替都会把热量放大 3~5 倍',
    standin: '无，只能手输', sets: ['LEAN_PROTEIN'], src: 'cfct6' },
  { id: 'duck_blood', name: '鸭血', cat: 'poultry', prio: 0,
    why: '同上，鸭血粉丝汤、毛血旺主料', standin: '无', sets: ['LEAN_PROTEIN'], src: 'cfct6' },
  { id: 'tofu_puff', name: '油豆腐/豆泡', cat: 'soy', prio: 0,
    why: '过油后脂肪 ~17g/100g、热量 ~245kcal，是北豆腐(~116kcal)的两倍多；酿豆腐、砂锅、关东煮里全是它',
    standin: 'tofu(北豆腐)', sets: [], src: 'cfct6' },
  { id: 'soy_sauce_light', name: '生抽', cat: 'condiment', prio: 0,
    why: '现在只有笼统「酱油」。生抽钠 ~6000mg/100g、老抽 ~7500mg，两者用量和场景都不同；钠是高血压模式的核心指标，笼统条目会让钠估算系统性偏移',
    standin: 'soy_sauce', sets: [], src: 'cfct6' },
  { id: 'soy_sauce_dark', name: '老抽', cat: 'condiment', prio: 0,
    why: '同上，红烧类菜用量大', standin: 'soy_sauce', sets: [], src: 'cfct6' },
  // 「鸡精/味精」已于 2026-09-20 补录，并按「不重犯笼统条目」拆成 msg(味精, 钠 8160) 与
  // chicken_bouillon(鸡精, 含盐 40~50%, 钠 19000) 两条——两者钠差一倍多，合成一条会重蹈覆辙。

  // ============ P1：中餐高频，库里完全没有 ============
  { id: 'wheat_gluten', name: '面筋/烤麸', cat: 'grain', prio: 1,
    why: '四喜烤麸、面筋塞肉、凉皮配面筋；蛋白 ~21g/100g，是素菜里少见的高蛋白源', src: 'cfct6' },
  { id: 'rice_noodle_flat', name: '河粉(煮熟)', cat: 'grain', prio: 1,
    why: '干炒牛河、汤河粉；和已有的「米粉/米线」不是一回事（宽窄、含水量不同）', src: 'cfct6' },
  { id: 'millet_raw', name: '小米(生)', cat: 'grain', prio: 1,
    why: '库里只有「小米粥」这个煮熟态，没有生小米，自建菜没法按生重配', src: 'cfct6' },
  { id: 'black_rice', name: '黑米', cat: 'grain', prio: 1,
    why: '杂粮饭高频，纤维和花青素都高于白米', src: 'cfct6' },
  { id: 'huajuan', name: '花卷', cat: 'grain', prio: 1, why: '北方主食高频，现在只有馒头', src: 'cfct6' },
  { id: 'purple_sweet_potato', name: '紫薯', cat: 'tuber', prio: 1,
    why: '薯类整个分类只有 5 条，是全库最薄的一类；紫薯是代餐/减脂高频', src: 'cfct6' },
  { id: 'sweet_potato_noodle', name: '红薯粉条(干)', cat: 'tuber', prio: 1,
    why: '蚂蚁上树、酸辣粉、猪肉炖粉条；~340kcal/100g 干重，按「粉丝」顶替会偏', standin: 'glass_noodles_dry', src: 'cfct6' },
  { id: 'water_bamboo', name: '茭白', cat: 'vegetable', prio: 1, why: '江浙沪高频时令菜，无任何近似条目', src: 'cfct6' },
  { id: 'baby_cabbage', name: '娃娃菜', cat: 'vegetable', prio: 1, why: '火锅、上汤娃娃菜高频；和大白菜营养接近但份量场景不同', src: 'cfct6' },
  { id: 'pea_shoots', name: '豌豆尖/豆苗', cat: 'vegetable', prio: 1, why: '川渝、江浙高频叶菜', sets: ['LEAFY_GREENS'], src: 'cfct6' },
  { id: 'garlic_sprout', name: '蒜苗/青蒜', cat: 'vegetable', prio: 1, why: '回锅肉的标配配菜，库里有蒜苔没蒜苗', src: 'cfct6' },
  { id: 'toon', name: '香椿', cat: 'vegetable', prio: 1, why: '香椿炒蛋，春季高频；蛋白含量在叶菜里偏高', sets: ['LEAFY_GREENS'], src: 'cfct6' },
  { id: 'daylily_dried', name: '黄花菜(干)', cat: 'vegetable', prio: 1, why: '小鸡炖蘑菇、黄花菜木耳；干货热量密度高，按鲜菜估会差很多', src: 'cfct6' },
  { id: 'shimeji', name: '蟹味菇/海鲜菇', cat: 'mushroom', prio: 1, why: '菌菇只有 8 条；这个是超市最常见的盒装菇之一', src: 'mext' },
  { id: 'tea_tree_mushroom', name: '茶树菇', cat: 'mushroom', prio: 1, why: '茶树菇老鸭汤、干锅茶树菇', src: 'cfct6' },
  { id: 'straw_mushroom', name: '草菇', cat: 'mushroom', prio: 1, why: '粤菜高频', src: 'cfct6' },
  { id: 'wood_ear_dried', name: '木耳(干)', cat: 'mushroom', prio: 1,
    why: '库里只有水发态。干木耳 ~205kcal/100g、纤维 ~30g，按水发态(~21kcal)记会把纤维严重低估', standin: 'wood_ear(水发)', src: 'cfct6' },
  { id: 'eel_rice_field', name: '鳝鱼', cat: 'seafood', prio: 1, why: '响油鳝丝、鳝段；无近似条目', sets: ['PURINE_MEDIUM'], src: 'cfct6' },
  { id: 'snakehead', name: '黑鱼', cat: 'seafood', prio: 1, why: '酸菜鱼、水煮鱼最常用的鱼，现在只能用「淡水鱼」顶', standin: 'fish_freshwater', sets: ['PURINE_MEDIUM', 'LEAN_PROTEIN'], src: 'cfct6' },
  { id: 'cuttlefish', name: '墨鱼', cat: 'seafood', prio: 1, why: '和鱿鱼是两种，墨鱼炖排骨高频', sets: ['PURINE_HIGH'], src: 'cfct6' },
  { id: 'pork_tripe', name: '猪肚', cat: 'meat', prio: 1, why: '猪肚鸡、爆炒肚丝；内脏类嘌呤高，对痛风模式有意义', sets: ['PURINE_HIGH'], src: 'cfct6' },
  { id: 'lamb_ribs', name: '羊排', cat: 'meat', prio: 1, why: '羊肉只有笼统一条，羊排脂肪明显更高', standin: 'lamb', sets: ['FATTY_MEAT', 'PURINE_MEDIUM'], src: 'cfct6' },
  { id: 'cured_pork', name: '腊肉', cat: 'meat', prio: 1,
    why: '腊肉炒蒜苗等；钠极高(~2500mg/100g)且脂肪高，属腌制品，对高血压模式关键',
    sets: ['PICKLED_OR_CURED', 'FATTY_MEAT', 'PURINE_MEDIUM'], src: 'cfct6' },
  { id: 'duck_leg', name: '鸭腿', cat: 'poultry', prio: 1, why: '禽类有鸡腿没鸭腿；卤味、啤酒鸭高频', sets: ['PURINE_MEDIUM'], src: 'cfct6' },
  { id: 'tofu_pudding', name: '豆腐脑/豆花', cat: 'soy', prio: 1, why: '早餐高频，含水量远高于嫩豆腐', standin: 'tofu_soft', src: 'cfct6' },
  { id: 'tofu_skin_fresh', name: '素鸡', cat: 'soy', prio: 1, why: '卤味、凉菜高频，蛋白密度高', src: 'cfct6' },
  { id: 'milk_powder_whole', name: '全脂奶粉', cat: 'dairy', prio: 1, why: '冲调场景常见，~490kcal/100g，按液态奶估会差 7 倍', sets: ['DAIRY'], src: 'cfct6' },
  { id: 'hawthorn', name: '山楂', cat: 'fruit', prio: 1, why: '鲜果和山楂制品都高频，纤维很高', src: 'cfct6' },
  { id: 'mulberry', name: '桑葚', cat: 'fruit', prio: 1, why: '时令水果，库里无', src: 'cfct6' },

  // ============ P2：让特殊人群模式判得更准 ============
  // 2026-09-20 已完成的集合复核（保留结论，避免以后重复推敲）：
  //   · 内脏与贝类头足已补进 PURINE_HIGH，普通畜禽鱼肉补进 PURINE_MEDIUM，畜禽鱼贝现零遗漏
  //   · 血制品属低嘌呤，另建 PURINE_LOW 白名单豁免，不按肉降权
  //   · LEAFY_GREENS 补 8 种深色叶菜；大白菜/包菜/紫甘蓝(浅色结球)与莴笋(茎)有意不收
  //   · DAIRY 补低脂奶与无糖酸奶（原先含糖酸奶计入、低脂奶不计入，方向是反的）；炼乳等糖脂载体不收
  //   · FATTY_MEAT 补肉馅与雪花部位；LEAN_PROTEIN 选择性补，内脏与高钠加工品不收
  //   · WHOLE_GRAIN 补全谷原料与杂豆；HARD_TO_CHEW 按「入口时硬度」重订；ACIDIC 补菠萝西柚油醋汁
  //   · PICKLED_OR_CURED 有意不动：高血压模式对它是硬排除，把天然高钠的紫菜/裙带菜归进去
  //     会禁掉本该推荐的海藻；这类高钠靠单菜钠阈值拦截即可
  //   · REFINED_STAPLE 有意不加米饭：conditions.ts 已为 rice_cooked 单列 0.6 降权，
  //     再进集合会叠成 0.15×0.6=0.09，等于禁掉米饭。但由此导致 findings 里
  //     「精制主食多于粗粮」的计数漏掉所有米饭菜——要修得把「加权」与「计数」拆开，属设计改动。
  { id: 'radish_dried', name: '萝卜干', cat: 'vegetable', prio: 2, why: '高钠腌菜，早餐粥配菜高频', sets: ['PICKLED_OR_CURED'], src: 'cfct6' },
  { id: 'preserved_mustard', name: '雪里蕻/雪菜', cat: 'vegetable', prio: 2, why: '雪菜肉丝、雪菜黄鱼；高钠腌菜', sets: ['PICKLED_OR_CURED'], src: 'cfct6' },
  { id: 'vinegar_black', name: '陈醋/香醋', cat: 'condiment', prio: 2,
    why: '库里「醋」是笼统条目；陈醋钠含量明显高于白醋，且是 GERD 模式的刺激项', sets: ['ACIDIC'], src: 'cfct6' },
  { id: 'chopped_chili', name: '剁椒', cat: 'condiment', prio: 2, why: '剁椒鱼头等；高钠 + 辛辣，对高血压和 GERD 模式都有意义', sets: ['PICKLED_OR_CURED'], src: 'cfct6' },

  // ============ P3：长尾 ============
  { id: 'hazelnut', name: '榛子', cat: 'nut', prio: 3, why: '坚果类补全', src: 'usda' },
  { id: 'ginkgo', name: '白果/银杏', cat: 'nut', prio: 3, why: '白果炖鸡等', src: 'cfct6' },
  { id: 'peanut_oil', name: '花生油', cat: 'oil', prio: 3,
    why: '中国家庭最常用的油，但就 App 现有的 6 个营养维度（热量/蛋白/脂肪/碳水/纤维/钠）而言，各种植物油几乎完全一致(~900kcal, 100g脂肪) → 补了不改任何结论，除非将来引入脂肪酸构成', src: 'cfct6' },
  { id: 'rapeseed_oil', name: '菜籽油', cat: 'oil', prio: 3, why: '同上，现阶段收益极低', src: 'cfct6' },
  { id: 'water_caltrop', name: '菱角', cat: 'vegetable', prio: 3, why: '时令，库里有荸荠无菱角', src: 'cfct6' },
]
