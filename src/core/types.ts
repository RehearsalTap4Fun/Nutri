// 领域类型：档案、营养、食材、菜品、记录

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'lose' | 'maintain' | 'gain'
export type DietStyle = 'chinese' | 'low_carb' | 'high_protein' | 'mediterranean' | 'vegetarian' | 'vegan' | 'if168'
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type Allergen = 'seafood' | 'peanut' | 'nuts' | 'dairy' | 'gluten' | 'egg' | 'soy'
/** 特殊人群模式：孕期 / 哺乳期 / 高血压 / 糖尿病（2 型或妊娠期）/ 脂肪肝 / 痛风与高尿酸 / 老年人 */
export type Condition = 'pregnancy' | 'lactation' | 'preconception' | 'hypertension' | 'diabetes' | 'fatty_liver' | 'gout' | 'gerd' | 'elderly' | 'training'
export const CONDITIONS: Condition[] = ['pregnancy', 'lactation', 'preconception', 'hypertension', 'diabetes', 'fatty_liver', 'gout', 'gerd', 'elderly', 'training']

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack']

export interface Profile {
  sex: Sex
  birthYear: number
  heightCm: number
  weightKg: number
  bodyFatPct?: number
  activity: ActivityLevel
  goal: Goal
  dietStyle: DietStyle
  /** 3 = 三餐；4 = 三餐 + 加餐 */
  mealsPerDay: 3 | 4
  /** 不想吃的菜品 id */
  dislikedDishes: string[]
  /** 不想吃的食材 id */
  dislikedIngredients: string[]
  allergens: Allergen[]
  /** 特殊人群模式，可多选（孕期与哺乳期互斥） */
  conditions: Condition[]
  /** 孕期时的孕程：1 早期 / 2 中期 / 3 晚期 */
  pregnancyTrimester?: 1 | 2 | 3
}

/** 营养值。kcal 千卡，其余克，sodium 为毫克 */
export interface Nutrients {
  kcal: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  sodium: number
}

export const ZERO: Nutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 }

export type IngredientCategory =
  | 'grain' | 'tuber' | 'vegetable' | 'mushroom' | 'fruit'
  | 'meat' | 'poultry' | 'seafood' | 'egg' | 'dairy' | 'soy' | 'legume' | 'nut'
  | 'oil' | 'sugar' | 'condiment' | 'beverage' | 'processed'

export interface Ingredient {
  id: string
  name: string
  cat: IngredientCategory
  /** 每 100 g 可食部 */
  per100: Nutrients
  allergens?: Allergen[]
  /** 数据来源，如 usda:171705（USDA FoodData Central fdcId）；未标注的是中国食物成分表与常见值的归并 */
  source?: string
}

/**
 * staple 主食 / protein 荤菜与蛋白菜 / veg 素菜 / soup 汤 / breakfast 早餐专属
 * snack 小食与加餐 / drink 饮品 / fruit 水果 / combo 一份即一餐（盖饭、汉堡套餐、面）
 */
export type DishCategory = 'staple' | 'protein' | 'veg' | 'soup' | 'breakfast' | 'snack' | 'drink' | 'fruit' | 'combo'
/** cn 中式家常 / west 西式 / takeout 外卖与餐馆 / convenience 便利店与包装食品 */
export type Cuisine = 'cn' | 'west' | 'takeout' | 'convenience'
/** light 清淡 / normal 常规 / heavy 重油盐 / fried 油炸 */
export type CookStyle = 'light' | 'normal' | 'heavy' | 'fried'

export interface DishPart {
  ing: string
  g: number
}

export interface Dish {
  id: string
  name: string
  cat: DishCategory
  cuisine: Cuisine
  cook: CookStyle
  slots: MealSlot[]
  /** 一份标准份量的食材构成 */
  parts: DishPart[]
  /** 份量描述，如「1碗(约250g)」 */
  serving: string
  tags?: string[]
  aliases?: string[]
}

export interface LogEntry {
  id: string
  /** YYYY-MM-DD */
  date: string
  slot: MealSlot
  /** HH:mm，可选 */
  time?: string
  dishId?: string
  /** 自定义条目：按一份的营养值直接录入；蔬菜/水果/奶类克数可选，用于份数统计 */
  custom?: { name: string; nutrients: Nutrients; vegG?: number; fruitG?: number; dairyG?: number }
  /** 份量倍数，1 = 一份标准份量 */
  portion: number
  /** 少盐做法：调味料带来的钠减半（家常菜适用） */
  lowSalt?: boolean
  /** 少油做法：烹调油带来的脂肪与热量减半（家常菜适用） */
  lowOil?: boolean
  /** 最后修改时间（毫秒），多设备合并时同 id 取新的 */
  updatedAt?: number
}

export interface WeightEntry {
  date: string
  kg: number
  bodyFatPct?: number
  updatedAt?: number
}

/** 一次饮水记录（白水、茶等按 ml 记；含热量饮品走餐食记录） */
export interface WaterEntry {
  id: string
  date: string
  /** HH:mm */
  time?: string
  ml: number
  updatedAt?: number
}

/** 血压 / 血糖记录：高血压、糖尿病模式下的联动记录 */
export interface VitalEntry {
  id: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm，可选 */
  time?: string
  kind: 'bp' | 'glucose'
  /** 收缩压 / 舒张压 mmHg */
  sys?: number
  dia?: number
  /** 血糖 mmol/L */
  mmol?: number
  /** 空腹 / 餐后 2 小时 / 其他 */
  tag?: 'fasting' | 'post2h' | 'other'
  updatedAt?: number
}

export interface Targets {
  method: 'katch' | 'mifflin'
  bmr: number
  tdee: number
  kcal: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  sodiumMax: number
  /** 蔬菜份数，1 份 = 100 g */
  vegServings: number
  /** 水果目标克数 */
  fruitG: number
  /** 奶类目标克数（孕期/哺乳期 500，其他 300） */
  dairyG: number
  /** 饮水目标 ml（不含食物水分；男 1700 / 女 1500，孕产期、痛风、训练日上调） */
  waterMl: number
  /** 糖尿病模式：碳水按餐均分，单餐不超过 碳水目标 × 餐次占比 × 1.15 */
  evenCarbs: boolean
  /** 模式对目标做了哪些调整，给用户看 */
  notes: string[]
  slotShare: Record<MealSlot, number>
}
