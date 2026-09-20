// 搜索排序与别名归属。2026-09-20 加别名时用正则批量改，有 4 个别名落到了错的菜上
// （「粽子」「鸡爪」落到泡椒腰花面、「青椒炒肉」落到豉汁蒸排骨），类型检查和 validate 都发现不了，
// 只有跑一次搜索才看得出来。这里把关键别名的归属钉死。
import { describe, expect, it } from 'vitest'
import { DISHES, DISH_MAP } from '../src/data/dishes/index'
import { searchFoods } from '../src/ui/foodSearch'

const top = (q: string) => {
  const r = searchFoods(q, 'all', DISHES, [], [], [], DISH_MAP)
  return r[0] && r[0].kind === 'dish' ? r[0].dish.name : null
}

describe('搜索：别名要落在对的菜上', () => {
  const CASES: Array<[string, string]> = [
    ['粽子', '鲜肉粽'],
    ['鸡爪', '泡椒凤爪'],
    ['青椒炒肉', '青椒肉丝'],
    ['红烧五花肉', '红烧肉'],
    ['辣椒炒肉', '辣椒炒肉(湘)'],
    ['意大利面', '番茄肉酱意面'],
    ['汉堡包', '牛肉汉堡(自制)'],
    ['水煮肉片', '水煮肉片(一人份)'],
    ['水煮鱼', '水煮鱼(一人份)'],
    ['肉沫豇豆', '肉末豇豆'],
  ]
  for (const [q, want] of CASES) {
    it(`搜「${q}」应命中「${want}」`, () => expect(top(q)).toBe(want))
  }
})

describe('搜索：排序口径', () => {
  it('别名完全一致，排在「菜名恰好以查询开头」之前', () => {
    // 「花生」是「炒花生(一小把)」的别名；「花生猪脚汤」只是碰巧以这两个字开头
    expect(top('花生')).toBe('炒花生(一小把)')
    expect(top('茶')).toBe('无糖茶')
  })

  it('菜名完全一致优先级最高', () => {
    for (const n of ['红烧肉', '番茄炒蛋', '宫保鸡丁', '双皮奶', '蛋包饭']) expect(top(n)).toBe(n)
  })

  it('常见食物不应搜不到（曾经的零结果）', () => {
    for (const q of ['双皮奶', '蛋包饭', '辣条', '果冻', '奶酪棒', '雪碧', '玉米片', '红烧带鱼', '泡芙', '萝卜排骨汤']) {
      expect(searchFoods(q, 'all', DISHES, [], [], [], DISH_MAP).length, q).toBeGreaterThan(0)
    }
  })
})

describe('连锁餐饮（2026-09-20 批次）', () => {
  it('品牌名要能搜到对应品类（挂在各自招牌上）', () => {
    const CASES: Array<[string, string]> = [
      ['霸王茶姬', '茉莉奶绿(鲜奶茶)'],
      ['伯牙绝弦', '茉莉奶绿(鲜奶茶)'],
      ['蜜雪冰城', '鲜榨柠檬水(全糖)'],
      ['喜茶', '多肉葡萄(无奶盖)'],
      ['古茗', '奶茶(半糖,无小料)'],
      ['太二酸菜鱼', '酸菜鱼(餐厅一人份)'],
      ['和府捞面', '草本汤面(连锁面馆)'],
      ['西贝莜面', '莜面鱼鱼(一人份)'],
    ]
    for (const [q, want] of CASES) expect(top(q), q).toBe(want)
  })

  it('奶茶甜度轴单调：无糖 < 半糖 < 全糖 < 半糖珍珠 < 全糖珍珠', async () => {
    const { dishNutrients } = await import('../src/core/nutrition')
    const k = (n: string) => dishNutrients(DISHES.find((d) => d.name === n)!).kcal
    const chain = ['无糖奶茶', '奶茶(半糖,无小料)', '奶茶(全糖,无小料)', '珍珠奶茶(半糖)', '珍珠奶茶']
    for (let i = 1; i < chain.length; i++) {
      expect(k(chain[i]), `${chain[i]} 应高于 ${chain[i - 1]}`).toBeGreaterThan(k(chain[i - 1]))
    }
    // 甜度是这里最大的变量：全糖珍珠奶茶应当是无糖奶茶的 5 倍以上
    expect(k('珍珠奶茶') / k('无糖奶茶')).toBeGreaterThan(5)
  })

  it('餐厅版酸菜鱼比家常版油更多', async () => {
    const { dishNutrients } = await import('../src/core/nutrition')
    const home = dishNutrients(DISHES.find((d) => d.name === '酸菜鱼')!)
    const rest = dishNutrients(DISHES.find((d) => d.name === '酸菜鱼(餐厅一人份)')!)
    expect(rest.fat).toBeGreaterThan(home.fat)
  })
})
