import type { Allergen, Ingredient, IngredientCategory } from '../core/types'
import { INGREDIENTS_USDA } from './ingredientsUsda'

// 每 100 g 可食部：[千卡, 蛋白 g, 脂肪 g, 碳水 g, 膳食纤维 g, 钠 mg]
// 数据来源：中国食物成分表(第6版) 与 USDA FoodData Central 的常见值，取整并做了合理归并，属估算级精度
type Row = [number, number, number, number, number, number]

function I(id: string, name: string, cat: IngredientCategory, r: Row, allergens?: Allergen[]): Ingredient {
  const [kcal, protein, fat, carbs, fiber, sodium] = r
  const ing: Ingredient = { id, name, cat, per100: { kcal, protein, fat, carbs, fiber, sodium } }
  if (allergens) ing.allergens = allergens
  return ing
}
/**
 * 带明确来源的条目：
 * - tfda:<整合編號>  台湾食药署「食品營養成分資料集」实测值（政府資料開放授權條款第 1 版，需注明出处）
 * - cfct6            中国食物成分表(第 6 版) 的公开常见值，人工核对录入
 * - mext:<食品番号>   日本食品標準成分表 2020（八訂）
 */
function S(id: string, name: string, cat: IngredientCategory, source: string, r: Row, allergens?: Allergen[]): Ingredient {
  return { ...I(id, name, cat, r, allergens), source }
}

export const INGREDIENTS: Ingredient[] = [
  // ===== 谷物 / 主食原料 =====
  I('rice_cooked', '米饭', 'grain', [116, 2.6, 0.3, 25.9, 0.3, 2]),
  I('rice_raw', '大米(生)', 'grain', [346, 7.4, 0.8, 77.9, 0.7, 4]),
  I('brown_rice_cooked', '糙米饭', 'grain', [112, 2.6, 0.9, 24, 1.8, 5]),
  I('glutinous_rice_raw', '糯米(生)', 'grain', [350, 7.3, 1, 78.3, 0.8, 2]),
  I('congee', '白粥', 'grain', [46, 1.1, 0.3, 9.9, 0.1, 2]),
  I('millet_porridge', '小米粥', 'grain', [46, 1.4, 0.7, 8.4, 0.5, 2]),
  I('oats', '燕麦片(干)', 'grain', [375, 15, 6.7, 66.9, 10.6, 4], ['gluten']),
  I('noodles_raw', '面条/挂面(生)', 'grain', [348, 10, 0.7, 75, 1.5, 150], ['gluten']),
  I('noodles_cooked', '面条(煮熟)', 'grain', [137, 4.5, 0.5, 28, 1, 60], ['gluten']),
  I('rice_noodles_cooked', '米粉/米线(煮熟)', 'grain', [109, 1.8, 0.2, 25, 0.5, 20]),
  I('glass_noodles_dry', '粉丝(干)', 'grain', [338, 0.8, 0.2, 83.7, 1.1, 10]),
  I('flour', '面粉', 'grain', [350, 11, 1.5, 73, 2.1, 3], ['gluten']),
  I('dumpling_wrapper', '饺子皮', 'grain', [253, 7.5, 1, 53, 1.8, 130], ['gluten']),
  I('steamed_bun', '馒头', 'grain', [223, 7, 1.1, 47, 1.5, 165], ['gluten']),
  I('bread_white', '白吐司', 'grain', [265, 8.5, 3.5, 49, 2.5, 470], ['gluten']),
  I('bread_whole', '全麦面包', 'grain', [250, 12, 3.5, 42, 6.5, 450], ['gluten']),
  I('burger_bun', '汉堡胚', 'grain', [280, 9, 4, 52, 2, 450], ['gluten']),
  I('croissant', '可颂', 'grain', [406, 8, 21, 46, 2.6, 470], ['gluten', 'dairy']),
  I('tortilla', '卷饼皮', 'grain', [300, 8, 7.5, 50, 3, 600], ['gluten']),
  I('pasta_cooked', '意面(煮熟)', 'grain', [158, 5.8, 0.9, 31, 1.8, 1], ['gluten']),
  I('quinoa_cooked', '藜麦(煮熟)', 'grain', [120, 4.4, 1.9, 21.3, 2.8, 7]),
  I('rice_cake', '年糕', 'grain', [154, 3.3, 0.6, 34.7, 0.8, 30]),
  I('youtiao', '油条', 'grain', [388, 6.9, 17.6, 51, 0.9, 585], ['gluten']),
  I('cereal_flakes', '即食玉米片', 'grain', [380, 7, 1.5, 84, 3, 500]),
  I('granola', '格兰诺拉麦片', 'grain', [450, 10, 18, 62, 7, 20], ['gluten', 'nuts']),
  I('corn', '玉米(鲜)', 'grain', [112, 4, 1.2, 22.8, 2.9, 1]),
  I('starch', '淀粉', 'grain', [350, 0.2, 0.1, 87, 0, 5]),
  I('tapioca_pearls', '珍珠(煮熟)', 'grain', [250, 0, 0, 62, 0, 10]),

  // ===== 薯类 =====
  I('potato', '土豆', 'tuber', [77, 2, 0.1, 17.5, 1.2, 6]),
  I('sweet_potato', '红薯', 'tuber', [90, 1.1, 0.2, 21, 1.6, 28]),
  I('taro', '芋头', 'tuber', [81, 2.2, 0.2, 18.1, 2.6, 33]), // 纤维: 台湾食药署,
  I('yam', '山药', 'tuber', [57, 1.9, 0.2, 12.4, 0.8, 19]),
  I('konjac', '魔芋', 'tuber', [12, 0.1, 0, 3, 3, 10]),

  // ===== 蔬菜 =====
  I('bok_choy', '小白菜/青菜', 'vegetable', [15, 1.5, 0.3, 2.7, 1.1, 73]),
  I('chinese_cabbage', '大白菜', 'vegetable', [17, 1.5, 0.1, 3.2, 0.8, 57]),
  I('cabbage', '包菜/圆白菜', 'vegetable', [22, 1.5, 0.2, 4.6, 1, 27]),
  I('spinach', '菠菜', 'vegetable', [24, 2.6, 0.3, 4.5, 1.7, 85]),
  I('broccoli', '西兰花', 'vegetable', [33, 4.1, 0.6, 4.3, 1.6, 19]),
  I('cauliflower', '花菜', 'vegetable', [24, 2.1, 0.2, 4.6, 1.2, 31]),
  I('tomato', '番茄', 'vegetable', [19, 0.9, 0.2, 4, 0.5, 5]),
  I('cherry_tomato', '圣女果', 'vegetable', [25, 1, 0.2, 5.8, 0.9, 2]),
  I('cucumber', '黄瓜', 'vegetable', [15, 0.8, 0.2, 2.9, 0.5, 5]),
  I('eggplant', '茄子', 'vegetable', [21, 1.1, 0.2, 4.9, 1.3, 5]),
  I('green_pepper', '青椒', 'vegetable', [22, 1.4, 0.3, 5.4, 3.3, 3]), // 纤维: 台湾食药署 青辣椒,
  I('chili_fresh', '小米辣/鲜辣椒', 'vegetable', [40, 1.9, 0.4, 8.8, 1.5, 9]),
  I('carrot', '胡萝卜', 'vegetable', [37, 1, 0.2, 8.8, 1.1, 71]),
  I('white_radish', '白萝卜', 'vegetable', [21, 0.9, 0.1, 5, 1, 61]),
  I('onion', '洋葱', 'vegetable', [39, 1.1, 0.2, 9, 0.9, 4]),
  I('celery', '芹菜', 'vegetable', [20, 1.2, 0.2, 4.5, 1.2, 159]),
  I('lettuce', '生菜', 'vegetable', [15, 1.3, 0.3, 2, 0.7, 32]),
  I('youmaicai', '油麦菜', 'vegetable', [15, 1.4, 0.4, 2.1, 0.6, 80]),
  I('garlic_chives', '韭菜', 'vegetable', [26, 2.4, 0.4, 4.6, 1.4, 8]),
  I('choy_sum', '菜心/芥蓝', 'vegetable', [22, 2.8, 0.4, 3.5, 1.6, 50]),
  I('water_spinach', '空心菜', 'vegetable', [20, 2.2, 0.3, 3.6, 1.4, 94]),
  I('bean_sprouts', '绿豆芽', 'vegetable', [18, 2.1, 0.1, 2.9, 0.8, 4]),
  I('soy_sprouts', '黄豆芽', 'vegetable', [47, 4.5, 1.6, 4.5, 1.5, 7]),
  I('green_beans', '四季豆', 'vegetable', [31, 2, 0.4, 5.7, 1.5, 9]),
  I('long_beans', '豇豆/豆角', 'vegetable', [32, 2.9, 0.3, 5.8, 1.8, 5]),
  I('snow_peas', '荷兰豆', 'vegetable', [42, 2.8, 0.2, 7.6, 2.6, 4]), // USDA 荷兰豆(生) 近似,
  I('peas', '豌豆(鲜)', 'vegetable', [111, 7.4, 0.3, 21.2, 7.5, 1]), // 纤维: 台湾食药署 豌豆仁,
  I('edamame', '毛豆', 'vegetable', [131, 13.1, 5, 10.5, 4, 4], ['soy']),
  I('bamboo_shoot', '竹笋', 'vegetable', [23, 2.6, 0.2, 3.6, 1.8, 0]),
  I('sour_bamboo', '酸笋', 'vegetable', [20, 2, 0.2, 3.5, 1.8, 600]),
  I('lotus_root', '莲藕', 'vegetable', [73, 1.9, 0.2, 16.4, 3.3, 44]), // 纤维: 台湾食药署,
  I('winter_melon', '冬瓜', 'vegetable', [12, 0.4, 0.2, 2.6, 0.7, 2]),
  I('bitter_melon', '苦瓜', 'vegetable', [22, 1, 0.1, 4.9, 3.2, 3]), // 纤维: 台湾食药署,
  I('zucchini', '西葫芦', 'vegetable', [19, 0.8, 0.2, 3.8, 0.6, 5]),
  I('luffa', '丝瓜', 'vegetable', [20, 1, 0.2, 4.2, 0.6, 3]),
  I('pumpkin', '南瓜', 'vegetable', [23, 0.7, 0.1, 5.3, 0.8, 1]),
  I('asparagus', '芦笋', 'vegetable', [22, 1.4, 0.1, 4.9, 1.9, 3]),
  I('garlic', '大蒜', 'vegetable', [128, 4.5, 0.2, 27.6, 4.2, 19]), // 纤维: 台湾食药署,
  I('ginger', '姜', 'vegetable', [46, 1.3, 0.6, 10.3, 2.7, 15]),
  I('scallion', '葱', 'vegetable', [30, 1.7, 0.3, 6.5, 1.3, 5]),
  I('kelp', '海带(鲜/水发)', 'vegetable', [13, 1.2, 0.1, 2.1, 2.8, 9]), // 纤维: 台湾食药署 海帶,
  I('nori', '紫菜(干)', 'vegetable', [250, 26.7, 1.1, 44.1, 21.6, 710]),
  I('pickled_mustard', '榨菜', 'vegetable', [29, 2.2, 0.3, 6.1, 2.1, 4250]),
  I('sauerkraut', '酸菜', 'vegetable', [14, 1.1, 0.2, 2.3, 1.1, 800]),
  I('kimchi', '辣白菜', 'vegetable', [20, 1.5, 0.3, 3.5, 1.5, 700]),
  S('preserved_veg', '梅干菜', 'vegetable', 'tfda:E07101', [105, 5.5, 1.1, 20.8, 12.8, 2500]), // 钠取泡洗后的常见值，原始干品钠极高,
  I('coriander', '香菜', 'vegetable', [33, 1.8, 0.4, 6.2, 3.2, 49]), // 纤维: 台湾食药署 芫荽,
  I('sweet_corn_kernels', '玉米粒(甜)', 'vegetable', [86, 3.2, 1.2, 19, 2.7, 15]),

  // ===== 菌菇 =====
  I('shiitake', '香菇(鲜)', 'mushroom', [26, 2.2, 0.3, 5.2, 3.3, 1]),
  I('enoki', '金针菇', 'mushroom', [32, 2.4, 0.4, 6, 2.7, 4]),
  I('king_oyster', '杏鲍菇', 'mushroom', [35, 1.3, 0.1, 8.3, 2.1, 3]),
  I('button_mushroom', '口蘑/白蘑菇', 'mushroom', [24, 2.7, 0.1, 4.1, 1.7, 5]),
  S('wood_ear', '木耳(水发)', 'mushroom', 'tfda:G00101', [38, 0.9, 0.1, 8.8, 7.4, 12]),

  // ===== 水果 =====
  I('apple', '苹果', 'fruit', [53, 0.4, 0.2, 13.7, 1.7, 1]),
  I('banana', '香蕉', 'fruit', [93, 1.4, 0.2, 22, 1.2, 1]),
  I('orange', '橙子', 'fruit', [48, 0.8, 0.2, 11.1, 0.6, 1]),
  I('grape', '葡萄', 'fruit', [45, 0.4, 0.3, 10.3, 1, 2]),
  I('watermelon', '西瓜', 'fruit', [31, 0.5, 0.3, 6.8, 0.2, 3]),
  I('strawberry', '草莓', 'fruit', [32, 1, 0.2, 7.1, 1.1, 4]),
  I('blueberry', '蓝莓', 'fruit', [57, 0.7, 0.3, 14.5, 2.4, 1]),
  I('kiwi', '猕猴桃', 'fruit', [61, 0.8, 0.6, 14.5, 2.6, 10]),
  I('pear', '梨', 'fruit', [51, 0.3, 0.1, 13.1, 2.6, 2]),
  I('peach', '桃', 'fruit', [51, 0.9, 0.1, 12.2, 1.3, 6]),
  I('mango', '芒果', 'fruit', [35, 0.6, 0.2, 8.3, 1.3, 3]),
  I('pomelo', '柚子', 'fruit', [42, 0.8, 0.2, 9.5, 0.4, 3]),
  I('dragon_fruit', '火龙果', 'fruit', [55, 1.1, 0.2, 13.3, 1.6, 3]),
  I('avocado', '牛油果', 'fruit', [161, 2, 15.3, 7.4, 6.7, 7]),
  I('red_dates', '红枣(干)', 'fruit', [276, 3.2, 0.5, 67.8, 6.2, 6]),
  I('lemon', '柠檬', 'fruit', [37, 1.1, 1.2, 6.2, 1.3, 1]),
  I('raisins', '葡萄干', 'fruit', [344, 2.5, 0.4, 83.4, 3.7, 19]), // 纤维: USDA 葡萄干 3.7,

  // ===== 畜肉 =====
  I('pork_lean', '猪瘦肉', 'meat', [137, 20.3, 6.2, 0, 0, 58]), // 碳水残差归零,
  I('pork_belly', '五花肉', 'meat', [340, 13.6, 30.6, 0, 0, 60]), // 碳水残差归零
  I('pork_ribs', '排骨(可食部)', 'meat', [264, 18.3, 20.4, 0.7, 0, 62]),
  I('pork_ground', '猪肉馅(肥瘦)', 'meat', [300, 15, 26, 1, 0, 65]),
  I('pork_liver', '猪肝', 'meat', [121, 19.3, 3.5, 2.9, 0, 69]), // 碳水按台湾 豬肝 2.9,
  I('pork_trotter', '猪蹄(可食部)', 'meat', [260, 22.6, 18.8, 0, 0, 101]),
  I('beef_lean', '牛瘦肉', 'meat', [106, 20.2, 2.3, 1.2, 0, 54]),
  I('beef_brisket', '牛腩', 'meat', [250, 18, 20, 0, 0, 58]),
  I('beef_shank', '牛腱', 'meat', [113, 21, 3, 0.5, 0, 60]),
  I('beef_ground', '牛肉馅', 'meat', [250, 17, 20, 0, 0, 66]),
  I('beef_steak', '牛排(西冷)', 'meat', [210, 20, 14, 0, 0, 55]),
  I('lamb', '羊肉', 'meat', [203, 19, 14.1, 0, 0, 81]),
  I('chinese_sausage', '腊肠/香肠', 'meat', [508, 24.1, 40.7, 11.2, 0, 2300]),
  I('ham_deli', '火腿片', 'meat', [110, 17, 3, 2, 0, 1100]),
  S('bacon', '培根', 'meat', 'tfda:R09001', [372, 13.5, 35.6, 0, 0, 610]),
  I('luncheon_meat', '午餐肉', 'meat', [229, 9.4, 15.9, 12.3, 0, 980]),
  S('hot_dog', '火腿肠/热狗肠', 'meat', 'tfda:R09201', [257, 13.3, 18.1, 10.2, 0, 607]),
  I('beef_jerky', '牛肉干', 'meat', [300, 45, 8, 12, 0, 1500]),
  I('beef_balls', '牛肉丸', 'meat', [190, 12, 12, 8, 0, 600]),

  // ===== 禽肉 =====
  I('chicken_breast', '鸡胸肉', 'poultry', [123, 19.4, 5, 0, 0, 34]), // 碳水残差归零,
  I('chicken_thigh', '鸡腿(带皮)', 'poultry', [181, 16, 13, 0, 0, 64]),
  I('chicken_wing', '鸡翅', 'poultry', [176, 17.4, 11.8, 0, 0, 51]), // 碳水残差归零,
  I('chicken_whole', '鸡(整鸡可食部)', 'poultry', [162, 19.3, 9.4, 0, 0, 63]), // 碳水残差归零,
  I('duck', '鸭肉', 'poultry', [240, 15.5, 19.7, 0.2, 0, 69]),
  I('roast_duck', '烤鸭', 'poultry', [436, 16.6, 38.4, 6, 0, 83]),
  I('duck_neck_braised', '卤鸭脖(可食部)', 'poultry', [250, 25, 15, 5, 0, 1500]),
  I('fried_chicken', '炸鸡(裹粉带皮)', 'poultry', [260, 18, 15, 12, 0.5, 500], ['gluten']),

  // ===== 水产 =====
  I('fish_freshwater', '淡水鱼(草鱼/鲤鱼)', 'seafood', [109, 17.6, 4.1, 0.5, 0, 54], ['seafood']),
  I('fish_bass', '鲈鱼', 'seafood', [105, 18.6, 3.4, 0, 0, 144], ['seafood']),
  I('fish_sea', '海鱼(带鱼/黄鱼)', 'seafood', [115, 17.7, 4.9, 0, 0, 150], ['seafood']), // 碳水残差归零,
  I('salmon', '三文鱼', 'seafood', [208, 20, 13.4, 0, 0, 59], ['seafood']),
  I('tuna_canned', '金枪鱼罐头(水浸)', 'seafood', [116, 25.5, 0.8, 0, 0, 320], ['seafood']),
  I('shrimp', '虾(去壳)', 'seafood', [89, 18.2, 1.4, 0.9, 0, 172], ['seafood']), // 碳水残差按 USDA 虾 0.9,
  I('dried_shrimp', '虾皮/虾米', 'seafood', [153, 30.7, 2.2, 2.5, 0, 5000], ['seafood']),
  I('squid', '鱿鱼', 'seafood', [75, 17, 0.8, 0, 0, 110], ['seafood']),
  I('clam', '蛤蜊(可食部)', 'seafood', [62, 10.1, 1.1, 2.8, 0, 425], ['seafood']),
  I('crab', '蟹(可食部)', 'seafood', [81, 13.8, 2.3, 1.3, 0, 260], ['seafood']), // 碳水按台湾 蟹腳肉 1.3,
  I('crayfish', '小龙虾(可食部)', 'seafood', [93, 18, 1, 1.5, 0, 200], ['seafood']),
  I('fish_balls', '鱼丸', 'seafood', [100, 11, 2, 8, 0, 600], ['seafood']),

  // ===== 蛋 =====
  I('egg', '鸡蛋', 'egg', [144, 13.3, 8.8, 2.8, 0, 132], ['egg']),
  I('egg_white', '蛋白', 'egg', [50, 10.5, 0.1, 1.3, 0, 160], ['egg']),
  I('salted_duck_egg', '咸鸭蛋', 'egg', [171, 12.7, 12.7, 1.5, 0, 2700], ['egg']), // 碳水残差按台湾 鴨鹹蛋 1.1 取 1.5,
  I('century_egg', '皮蛋', 'egg', [171, 14.2, 10.7, 4.5, 0, 542], ['egg']),

  // ===== 奶制品 =====
  I('milk', '牛奶(全脂)', 'dairy', [63, 3.2, 3.6, 4.9, 0, 40], ['dairy']),
  I('milk_skim', '脱脂牛奶', 'dairy', [35, 3.4, 0.2, 5, 0, 42], ['dairy']),
  I('yogurt', '酸奶(含糖)', 'dairy', [72, 2.5, 2.7, 9.3, 0, 40], ['dairy']),
  I('greek_yogurt', '希腊酸奶(无糖)', 'dairy', [60, 10, 0.4, 3.6, 0, 36], ['dairy']),
  I('cheese', '奶酪(切达/马苏里拉)', 'dairy', [350, 24, 27, 2, 0, 600], ['dairy']),
  I('butter', '黄油', 'dairy', [717, 0.9, 81, 0.1, 0, 100], ['dairy']),
  I('cream', '淡奶油', 'dairy', [340, 2.1, 36, 2.8, 0, 27], ['dairy']),
  I('ice_cream', '冰淇淋', 'dairy', [207, 3.5, 11, 24, 0.7, 80], ['dairy']),
  I('whey_protein', '乳清蛋白粉', 'dairy', [400, 78, 5, 7, 0, 200], ['dairy']),
  I('creamer', '植脂末', 'dairy', [540, 3, 35, 57, 0, 200]),

  // ===== 豆制品 / 豆类 =====
  I('tofu', '北豆腐', 'soy', [98, 12.2, 4.8, 3, 0.5, 7], ['soy']),
  I('tofu_soft', '南豆腐/嫩豆腐', 'soy', [57, 6.2, 2.5, 2.4, 0.2, 4], ['soy']),
  S('tofu_dried', '豆腐干/香干', 'soy', 'tfda:R06803', [161, 17.4, 8.6, 3.5, 3.3, 116], ['soy']),
  I('tofu_sheet', '千张/豆皮', 'soy', [262, 24.5, 16, 5.5, 0.5, 20], ['soy']),
  I('yuba', '腐竹(干)', 'soy', [461, 44.6, 21.7, 22.3, 1, 27], ['soy']),
  I('soy_milk', '豆浆(无糖)', 'soy', [31, 3, 1.6, 1.2, 1.1, 3], ['soy']),
  I('soybeans_dry', '黄豆(干)', 'legume', [390, 35, 16, 34.2, 15.5, 2], ['soy']),
  I('red_beans_dry', '红豆(干)', 'legume', [324, 20.2, 0.6, 63.4, 18.5, 2]), // 纤维: 台湾食药署 紅豆,
  I('mung_beans_dry', '绿豆(干)', 'legume', [329, 21.6, 0.8, 62, 15.8, 3]), // 纤维: 台湾食药署 綠豆,
  I('chickpeas_cooked', '鹰嘴豆(煮熟)', 'legume', [164, 8.9, 2.6, 27.4, 7.6, 7]),
  I('lentils_cooked', '小扁豆(煮熟)', 'legume', [116, 9, 0.4, 20, 7.9, 2]),

  // ===== 坚果 / 种子 =====
  I('peanut', '花生(炒)', 'nut', [601, 21.7, 48, 17.3, 6.3, 34], ['peanut']),
  I('walnut', '核桃仁', 'nut', [654, 15, 65, 14, 6.7, 2], ['nuts']),
  I('almond', '杏仁/巴旦木', 'nut', [579, 21, 50, 21.6, 12.5, 1], ['nuts']),
  I('cashew', '腰果', 'nut', [553, 17.3, 36.7, 41.6, 3.6, 12], ['nuts']),
  I('sesame', '芝麻', 'nut', [559, 19.1, 46.1, 24, 14, 8]),
  I('sunflower_seeds', '瓜子仁', 'nut', [610, 22.6, 52.8, 17.3, 6, 6]),
  I('chia', '奇亚籽', 'nut', [486, 16.5, 30.7, 42, 34, 16]),
  I('peanut_butter', '花生酱', 'nut', [588, 25, 50, 20, 6, 430], ['peanut']),
  I('sesame_paste', '芝麻酱', 'nut', [630, 19.2, 52.7, 22.7, 5.9, 39]),

  // ===== 油脂 / 糖 =====
  I('oil', '植物油', 'oil', [899, 0, 99.9, 0, 0, 0]),
  I('lard', '猪油', 'oil', [897, 0, 99.6, 0, 0, 0]),
  I('olive_oil', '橄榄油', 'oil', [899, 0, 99.9, 0, 0, 0]),
  I('sesame_oil', '香油', 'oil', [898, 0, 99.7, 0, 0, 0]),
  I('chili_oil', '辣椒油/红油', 'oil', [800, 1, 88, 2, 1, 200]),
  I('sugar', '白糖', 'sugar', [400, 0, 0, 99.9, 0, 0]),
  I('brown_sugar', '红糖', 'sugar', [389, 0.7, 0, 96.6, 0, 18]),
  I('honey', '蜂蜜', 'sugar', [321, 0.4, 1.9, 75.6, 0, 0]),
  I('syrup', '糖浆/果糖', 'sugar', [300, 0, 0, 75, 0, 5]),

  // ===== 调味 =====
  I('salt', '盐', 'condiment', [0, 0, 0, 0, 0, 39300]),
  I('soy_sauce', '酱油', 'condiment', [63, 5.6, 0.1, 10.1, 0.2, 5750], ['soy', 'gluten']),
  I('oyster_sauce', '蚝油', 'condiment', [114, 5.1, 0.6, 21.6, 0, 3400], ['seafood']),
  I('vinegar', '醋', 'condiment', [31, 2.1, 0.3, 4.9, 0, 262]),
  S('cooking_wine', '料酒', 'condiment', 'tfda:O06101', [133, 1.8, 0, 19.1, 0, 500]), // 按绍兴酒计，酒精热量不按 4/9/4；钠保留料酒加盐值,
  I('doubanjiang', '豆瓣酱', 'condiment', [178, 13.6, 6.8, 17.1, 1.5, 6000], ['soy']),
  I('chili_sauce', '辣椒酱(油制)', 'condiment', [340, 7, 30, 12, 3, 2700]),
  I('sweet_bean_sauce', '甜面酱', 'condiment', [139, 5.5, 0.6, 28.5, 0.4, 2200], ['gluten']),
  I('ketchup', '番茄酱', 'condiment', [100, 1.2, 0.2, 24, 0.3, 900]),
  I('mayonnaise', '蛋黄酱/沙拉酱', 'condiment', [680, 1, 75, 1, 0, 600], ['egg']),
  I('thousand_island', '千岛酱', 'condiment', [380, 1, 36, 15, 0, 800], ['egg']),
  I('vinaigrette', '油醋汁', 'condiment', [400, 0.2, 42, 6, 0, 900]),
  I('curry_block', '咖喱块', 'condiment', [450, 6, 30, 40, 3, 4500], ['gluten']),
  I('hotpot_base', '火锅底料(牛油)', 'condiment', [500, 3, 50, 8, 2, 4000]),
  I('broth', '高汤/清汤(家庭无盐)', 'condiment', [8, 0.8, 0.3, 0.3, 0, 80]),
  I('coconut_milk', '椰浆', 'condiment', [230, 2.3, 24, 3.3, 0, 15]),
  I('black_pepper_sauce', '黑椒汁', 'condiment', [120, 2, 5, 18, 0.5, 2500], ['gluten']),
  I('sichuan_pepper', '花椒/干辣椒(香料)', 'condiment', [258, 6.7, 8.9, 66.5, 28.7, 47]),
  I('fermented_bean_curd', '腐乳', 'condiment', [133, 12, 8.1, 4.6, 0.9, 3000], ['soy']),

  // ===== 饮品 =====
  I('water', '白水', 'beverage', [0, 0, 0, 0, 0, 0]),
  I('black_coffee', '黑咖啡/美式', 'beverage', [2, 0.1, 0, 0, 0, 2]),
  I('tea', '茶(无糖)', 'beverage', [1, 0, 0, 0.2, 0, 1]),
  I('cola', '可乐', 'beverage', [43, 0, 0, 10.6, 0, 4]),
  I('cola_zero', '无糖可乐', 'beverage', [0, 0, 0, 0, 0, 10]),
  I('orange_juice', '橙汁', 'beverage', [45, 0.7, 0.2, 10.4, 0.2, 1]),
  I('beer', '啤酒', 'beverage', [43, 0.5, 0, 3.6, 0, 4]),
  I('baijiu', '白酒(52度)', 'beverage', [300, 0, 0, 0, 0, 0]),
  I('red_wine', '红酒', 'beverage', [85, 0.1, 0, 2.6, 0, 4]),
  I('sports_drink', '运动饮料', 'beverage', [25, 0, 0, 6, 0, 45]),
  I('oat_milk', '燕麦奶', 'beverage', [45, 1, 1.5, 7, 0.8, 40], ['gluten']),
  I('sweet_soy_milk', '甜豆浆', 'beverage', [50, 2.5, 1.2, 7.5, 0.8, 5], ['soy']),
  I('yakult', '乳酸菌饮料', 'beverage', [67, 1.1, 0.1, 15.6, 0, 20], ['dairy']),

  // ===== 加工食品 =====
  I('instant_noodles', '方便面(干,含料包)', 'processed', [473, 9.5, 21.1, 61.6, 0.9, 1140], ['gluten']),
  I('potato_chips', '薯片', 'processed', [536, 6.5, 35, 51, 4, 550]),
  I('biscuits', '饼干(酥性)', 'processed', [502, 8, 22, 68, 1.5, 300], ['gluten']),
  I('soda_crackers', '苏打饼干', 'processed', [430, 9, 14, 68, 2.5, 800], ['gluten']),
  I('chocolate', '巧克力', 'processed', [546, 4.9, 31, 61, 7, 24], ['dairy']),
  I('cake', '奶油蛋糕', 'processed', [350, 5, 18, 43, 0.8, 250], ['gluten', 'egg', 'dairy']),
  I('fries', '炸薯条', 'processed', [312, 3.4, 15, 41, 3.8, 210]),
  I('pizza', '披萨(芝士)', 'processed', [266, 11, 10, 33, 2.3, 600], ['gluten', 'dairy']),
  I('protein_bar', '蛋白棒', 'processed', [380, 30, 12, 40, 6, 200], ['dairy']),
  I('latiao', '辣条', 'processed', [480, 12, 26, 48, 2, 2500], ['gluten']),
  I('popcorn', '爆米花(焦糖)', 'processed', [420, 5, 14, 70, 5, 300]),
  I('mooncake', '月饼', 'processed', [400, 6, 16, 58, 1.5, 150], ['gluten', 'egg']),
  I('egg_tart', '蛋挞', 'processed', [340, 6, 20, 34, 0.8, 200], ['gluten', 'egg', 'dairy']),
  I('nuts_mixed', '混合坚果', 'processed', [600, 18, 52, 20, 7, 100], ['nuts', 'peanut']),
  I('seaweed_snack', '海苔(即食)', 'processed', [420, 30, 20, 30, 20, 1800]),
  I('jelly', '果冻', 'processed', [60, 0, 0, 15, 0, 20]),
  I('candy', '糖果', 'processed', [390, 0, 0, 97, 0, 30]),
  // ===== USDA SR Legacy 提取的补充食材（见 ingredientsUsda.ts） =====
  // ---- 台湾食药署 / 中国食物成分表 / 日本八訂 来源的条目（多为替换 USDA「近似」替代或补库里没有的食材）
  S('leek', '大葱', 'vegetable', 'tfda:E03502', [31, 1.3, 0.1, 6.7, 1.3, 8]),
  S('water_chestnut', '荸荠/马蹄', 'vegetable', 'tfda:B01701', [67, 1.7, 0.1, 14.5, 2.1, 21]),
  S('garlic_scapes', '蒜苔', 'vegetable', 'cfct6', [61, 2.0, 0.1, 15.4, 2.5, 3]),
  S('lily_bulb', '百合(鲜)', 'vegetable', 'tfda:E01001', [137, 3.8, 0.1, 32.3, 2.7, 4]),
  S('shiitake_dried', '香菇(干)', 'mushroom', 'tfda:G016', [321, 20.9, 1.6, 64.9, 37.1, 9]),
  S('tremella', '银耳(水发)', 'mushroom', 'tfda:G00401', [22, 0.5, 0.2, 4.8, 5.1, 5]),
  S('job_tears', '薏米(生)', 'grain', 'tfda:A05601', [378, 14.1, 6.0, 66.2, 1.8, 2]),
  S('rice_pressed', '饭团/寿司米饭(压实)', 'grain', 'mext:01088', [156, 2.5, 0.3, 37.1, 1.5, 1]),
  S('pork_tenderloin', '猪里脊', 'meat', 'cfct6', [155, 20.2, 7.9, 0.7, 0, 43]),
  S('pork_shoulder', '梅花肉(肩胛)', 'meat', 'tfda:I02701', [295, 16.5, 24.8, 0, 0, 53]),
  S('beef_ribeye', '肥牛(牛五花片)', 'meat', 'tfda:I01301', [430, 15.7, 40.3, 0, 0, 45]),
  S('oyster', '生蚝/牡蛎', 'seafood', 'tfda:J223', [54, 9.4, 1.6, 4.2, 0, 148], ['seafood']),
  S('eel', '鳗鱼', 'seafood', 'tfda:J00501', [254, 18.1, 19.6, 0, 0, 47], ['seafood']),
  S('saury', '秋刀鱼', 'seafood', 'tfda:J16801', [314, 18.8, 25.9, 0, 0, 55], ['seafood']),
  ...INGREDIENTS_USDA,
]

export const INGREDIENT_MAP: Map<string, Ingredient> = new Map(INGREDIENTS.map((i) => [i.id, i]))

export function getIngredient(id: string): Ingredient {
  const ing = INGREDIENT_MAP.get(id)
  if (!ing) throw new Error(`unknown ingredient: ${id}`)
  return ing
}
