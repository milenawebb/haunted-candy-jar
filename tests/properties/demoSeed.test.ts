import { describe, it, expect } from 'vitest'
import { buildDemoTasks, parseDemoCount } from '../../src/dev/demoSeed'
import { JAR_CAPACITY } from '../../src/features/jar/jarGeometry'
import { partitionTasks } from '../../src/features/jar/jarPileLayout'
import { decayFunction } from '../../src/features/tasks/decayFunction'
import { DECAY_STAGE_ORDER } from '../../src/features/tasks/taskTypes'
import { MONSTER_KINDS } from '../../src/utils/monsterKind'

const NOW = 1_700_000_000_000

describe('demoSeed (temporary dev helper)', () => {
  it('default set has 8 candies, all monsters, all stages, both decay paths', () => {
    const tasks = buildDemoTasks(8, NOW)
    expect(tasks).toHaveLength(8)
    expect(new Set(tasks.map((t) => t.monster))).toEqual(new Set(MONSTER_KINDS))
    const stages = new Set(tasks.map((t) => decayFunction(t, NOW)))
    expect(stages).toEqual(new Set(DECAY_STAGE_ORDER))
    expect(tasks.some((t) => t.dueDate === null)).toBe(true)
    expect(tasks.some((t) => t.dueDate !== null)).toBe(true)
    expect(tasks.map((t) => t.id)).toEqual(Array.from({ length: 8 }, (_, i) => `demo-${i + 1}`))
    expect(tasks.some((t) => t.title.length > 18)).toBe(true)
  })

  it('generates N candies with unique ids and no em dashes', () => {
    for (const n of [9, 24, 40, 45, 60]) {
      const tasks = buildDemoTasks(n, NOW)
      expect(tasks).toHaveLength(n)
      expect(new Set(tasks.map((t) => t.id)).size).toBe(n)
      expect(tasks.every((t) => !t.title.includes('\u2014'))).toBe(true)
    }
  })

  it('parses the demo query', () => {
    expect(parseDemoCount('')).toBeNull()
    expect(parseDemoCount('?demo=1')).toBe(8)
    expect(parseDemoCount('?demo=30')).toBe(30)
    expect(parseDemoCount('?demo=45')).toBe(45)
    expect(parseDemoCount('?demo=99')).toBe(60)
  })

  it('?demo=45 gives 3 escaped Cursed candies, a full jar of 40 and 2 overflow on the desk', () => {
    const tasks = buildDemoTasks(parseDemoCount('?demo=45')!, NOW)
    const { inJar, escaped, overflow, spilled } = partitionTasks(tasks, JAR_CAPACITY, NOW)
    expect(escaped).toHaveLength(3)
    expect(tasks.filter((t) => decayFunction(t, NOW) !== 'Cursed')).toHaveLength(42)
    expect(inJar).toHaveLength(JAR_CAPACITY)
    expect(overflow).toHaveLength(2)
    expect(spilled).toHaveLength(5)
    // Cursed candies never sit in the jar.
    expect(inJar.every((t) => decayFunction(t, NOW) !== 'Cursed')).toBe(true)
  })

  it('every size from 8 up keeps all five stages and at least two Cursed candies', () => {
    for (const n of [8, 9, 24, 40, 60]) {
      const tasks = buildDemoTasks(n, NOW)
      const stages = tasks.map((t) => decayFunction(t, NOW))
      expect(new Set(stages)).toEqual(new Set(DECAY_STAGE_ORDER))
      expect(stages.filter((s) => s === 'Cursed').length).toBeGreaterThanOrEqual(2)
    }
  })
})
