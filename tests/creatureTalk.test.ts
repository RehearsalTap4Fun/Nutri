import { describe, expect, it } from 'vitest'
import { creatureLine, creatureMood } from '../src/core/creatureTalk'
import { ZERO } from '../src/core/types'
import type { Targets } from '../src/core/types'

const targets: Targets = {
  method: 'mifflin', bmr: 1400, tdee: 1800, kcal: 1800, protein: 90, fat: 55, carbs: 220, fiber: 25,
  sodiumMax: 2000, vegServings: 4, fruitG: 200, dairyG: 300, waterMl: 1500, evenCarbs: false,
  slotShare: { breakfast: 0.25, lunch: 0.4, dinner: 0.35, snack: 0 }, notes: [],
}
const meal = (slot: 'breakfast' | 'lunch' | 'dinner') => ({ id: slot, date: '2026-09-11', slot, portion: 1, dishId: 'x' })
const allMealsLogged = [meal('breakfast'), meal('lunch'), meal('dinner')]
const base = { isToday: true, now: '08:00', date: '2026-09-11', entries: [], n: { ...ZERO }, targets, waterMl: 0, showSodium: false, focus: [] }

describe('creatureLine：按优先级挑一句最要紧的话', () => {
  it('看别的日期只给轻松话，不提醒任何进度', () => {
    const line = creatureLine({ ...base, isToday: false, now: '23:00' })
    expect(line.length).toBeGreaterThan(0)
  })

  it('喝水明显落后（差 2 杯以上）优先提醒', () => {
    const line = creatureLine({ ...base, now: '15:00', waterMl: 0 })
    expect(line).toContain('喝')
  })

  it('喝水只差 1 杯时不念叨，看别的信号', () => {
    // 8~22 点排 6 杯，15:00 时应喝到的杯数与只差 1 杯时不该触发喝水提醒
    const line = creatureLine({ ...base, now: '10:00', waterMl: 250 })
    expect(line).not.toContain('喝')
  })

  it('到了饭点但那一餐没记，按早中晚顺序提醒', () => {
    const lunchLine = creatureLine({ ...base, now: '14:00', waterMl: 2000, entries: [meal('breakfast')] })
    expect(lunchLine).toContain('午饭')
    const dinnerLine = creatureLine({ ...base, now: '20:30', waterMl: 2000, entries: [meal('breakfast'), meal('lunch')] })
    expect(dinnerLine).toContain('晚饭')
  })

  it('那一餐已经记过就不会再提醒', () => {
    const line = creatureLine({ ...base, now: '14:00', waterMl: 2000, entries: [meal('breakfast'), meal('lunch')] })
    expect(line).not.toContain('午饭')
  })

  it('高血压模式钠超标会提醒', () => {
    const line = creatureLine({ ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, showSodium: true, n: { ...ZERO, sodium: 2500 }, fruitG: 200 })
    expect(line).toContain('钠')
  })

  it('没开高血压模式时钠超标不提（看不到这个指标）', () => {
    const line = creatureLine({ ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, showSodium: false, n: { ...ZERO, sodium: 2500 }, fruitG: 200 })
    expect(line).not.toContain('钠')
  })

  it('营养超额比缺口优先提', () => {
    const line = creatureLine({
      ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, fruitG: 200,
      focus: [{ key: 'fat', kind: 'over', amount: 12, label: '脂肪已超 12 g' }, { key: 'fiber', kind: 'gap', amount: 5, label: '还差纤维 5 g' }],
    })
    expect(line).toContain('脂肪已超 12 g')
  })

  it('只有缺口信号时提缺口', () => {
    const line = creatureLine({
      ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, fruitG: 200,
      focus: [{ key: 'fiber', kind: 'gap', amount: 5, label: '还差纤维 5 g' }],
    })
    expect(line).toContain('还差纤维 5 g')
  })

  it('什么都正常时给一句轻松话，同一天结果稳定', () => {
    const a = creatureLine({ ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged })
    const b = creatureLine({ ...base, now: '21:05', waterMl: 2000, entries: allMealsLogged })
    expect(a).toBe(b)
    expect(a.length).toBeGreaterThan(0)
  })

  it('蛋刚孵化完，优先打招呼，盖过其他所有提醒', () => {
    const line = creatureLine({ ...base, now: '15:00', waterMl: 0, justHatched: true })
    expect(line).toContain('孵出来')
  })

  it('异变过至少一次后就不再打招呼，回到正常提醒', () => {
    const line = creatureLine({ ...base, now: '15:00', waterMl: 0, justHatched: false })
    expect(line).not.toContain('孵出来')
    expect(line).toContain('喝')
  })

  it('下午了还没吃水果会提醒', () => {
    const line = creatureLine({ ...base, now: '16:00', waterMl: 2000, entries: allMealsLogged, fruitG: 0 })
    expect(line).toContain('水果')
  })

  it('上午还没吃水果不提醒，太早念叨没意义', () => {
    const line = creatureLine({ ...base, now: '10:00', waterMl: 1000, fruitG: 0 })
    expect(line).not.toContain('水果')
  })

  it('已经吃过水果就不提醒', () => {
    const line = creatureLine({ ...base, now: '16:00', waterMl: 2000, entries: allMealsLogged, fruitG: 150 })
    expect(line).not.toContain('水果')
  })

  it('存在饮食习惯类提醒时讲出来，优先于超额/缺口', () => {
    const habitFinding = { key: 'skip_breakfast', severity: 'warn' as const, title: '常漏早餐', detail: '近 7 天有 3 天没吃早餐。', action: '试着早起十分钟。' }
    const line = creatureLine({
      ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, fruitG: 150, habitFinding,
      focus: [{ key: 'fat', kind: 'over', amount: 12, label: '脂肪已超 12 g' }],
    })
    expect(line).toContain('常漏早餐')
  })
})

describe('creatureLine：性格只改语气，不改要提醒的内容', () => {
  it('不传性格时按温柔处理', () => {
    const line = creatureLine({ ...base, now: '15:00', waterMl: 0 })
    expect(line).toContain('喝一口呗')
  })

  it('四种性格喝水提醒的杯数信息都在，只是措辞不同', () => {
    const lines = (['energetic', 'gentle', 'bossy', 'cool'] as const).map((personality) =>
      creatureLine({ ...base, now: '15:00', waterMl: 0, personality }),
    )
    for (const line of lines) { expect(line).toContain('3'); expect(line).toContain('杯') }
    expect(new Set(lines).size).toBe(4) // 四句话应该互不相同
  })

  it('元气性格喝水提醒语气热烈', () => {
    const line = creatureLine({ ...base, now: '15:00', waterMl: 0, personality: 'energetic' })
    expect(line).toContain('冲')
  })

  it('傲娇性格提醒带刺但仍传达信息', () => {
    const line = creatureLine({ ...base, now: '15:00', waterMl: 0, personality: 'bossy' })
    expect(line).toContain('磨蹭')
  })

  it('高冷性格说话简短', () => {
    const line = creatureLine({ ...base, now: '15:00', waterMl: 0, personality: 'cool' })
    expect(line.length).toBeLessThan(20)
  })

  it('孵化招呼语也跟着性格变', () => {
    const gentle = creatureLine({ ...base, now: '15:00', waterMl: 0, justHatched: true, personality: 'gentle' })
    const cool = creatureLine({ ...base, now: '15:00', waterMl: 0, justHatched: true, personality: 'cool' })
    expect(gentle).not.toBe(cool)
    expect(gentle).toContain('孵出来')
    expect(cool).toContain('孵化完成')
  })

  it('性格不影响优先级链，只影响措辞：钠超标该提醒时四种性格都会提', () => {
    for (const personality of ['energetic', 'gentle', 'bossy', 'cool'] as const) {
      const line = creatureLine({ ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, showSodium: true, n: { ...ZERO, sodium: 2500 }, fruitG: 200, personality })
      expect(line).toContain('钠')
    }
  })
})

describe('creatureMood：表情/待机动画用的心情档位，跟 creatureLine 走同一条优先级链', () => {
  it('蛋刚孵化完是兴奋', () => {
    expect(creatureMood({ ...base, now: '15:00', waterMl: 0, justHatched: true })).toBe('excited')
  })

  it('看别的日期或什么都正常，是开心', () => {
    expect(creatureMood({ ...base, isToday: false, now: '23:00' })).toBe('happy')
    expect(creatureMood({ ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, fruitG: 200 })).toBe('happy')
  })

  it('喝水落后 / 餐次未记 / 水果未吃 / 只有缺口信号，是中性提醒', () => {
    expect(creatureMood({ ...base, now: '15:00', waterMl: 0 })).toBe('neutral')
    expect(creatureMood({ ...base, now: '14:00', waterMl: 2000, entries: [meal('breakfast')] })).toBe('neutral')
    expect(creatureMood({ ...base, now: '16:00', waterMl: 2000, entries: allMealsLogged, fruitG: 0 })).toBe('neutral')
    expect(creatureMood({
      ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, fruitG: 200,
      focus: [{ key: 'fiber', kind: 'gap', amount: 5, label: '还差纤维 5 g' }],
    })).toBe('neutral')
  })

  it('钠超标 / 饮食习惯提醒 / 营养超额，是担心', () => {
    expect(creatureMood({ ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, fruitG: 200, showSodium: true, n: { ...ZERO, sodium: 2500 } })).toBe('concerned')
    const habitFinding = { key: 'skip_breakfast', severity: 'warn' as const, title: '常漏早餐', detail: '近 7 天有 3 天没吃早餐。', action: '试着早起十分钟。' }
    expect(creatureMood({ ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, fruitG: 200, habitFinding })).toBe('concerned')
    expect(creatureMood({
      ...base, now: '21:00', waterMl: 2000, entries: allMealsLogged, fruitG: 200,
      focus: [{ key: 'fat', kind: 'over', amount: 12, label: '脂肪已超 12 g' }],
    })).toBe('concerned')
  })

  it('心情跟台词共用同一条优先级链，不会各判各的', () => {
    const input = { ...base, now: '15:00', waterMl: 0 }
    const line = creatureLine(input)
    const mood = creatureMood(input)
    expect(line).toContain('喝')
    expect(mood).toBe('neutral')
  })
})
