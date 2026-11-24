import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  loadTasks,
  saveTasks,
  loadSoundEnabled,
  saveSoundEnabled,
} from '../../src/utils/persistence'
import type { Task } from '../../src/features/tasks/taskTypes'

const sample: Task = {
  id: 'a1',
  title: 'Brew potion',
  dueDate: null,
  monster: 'bat',
  isSample: false,
  createdAt: 1_700_000_000_000,
  completedAt: null,
}

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns [] when the key is missing. Validates: Requirement 2.2', () => {
    expect(loadTasks()).toEqual([])
  })

  it('returns [] and warns on corrupt JSON. Validates: Requirement 2.3', () => {
    localStorage.setItem('hcj_tasks', '{not json')
    expect(loadTasks()).toEqual([])
    expect(console.warn).toHaveBeenCalled()
  })

  it('returns [] on schema mismatch. Validates: Requirement 2.3', () => {
    localStorage.setItem('hcj_tasks', JSON.stringify([{ id: 1 }]))
    expect(loadTasks()).toEqual([])
    expect(console.warn).toHaveBeenCalled()
  })

  it('round-trips save then load. Validates: Requirement 2.1', () => {
    saveTasks([sample])
    expect(loadTasks()).toEqual([sample])
  })

  it('does not throw when setItem throws. Validates: Requirement 17.5', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => saveTasks([sample])).not.toThrow()
    expect(() => saveSoundEnabled(true)).not.toThrow()
    expect(console.error).toHaveBeenCalled()
  })

  it('sound defaults to false and round-trips', () => {
    expect(loadSoundEnabled()).toBe(false)
    saveSoundEnabled(true)
    expect(loadSoundEnabled()).toBe(true)
    saveSoundEnabled(false)
    expect(loadSoundEnabled()).toBe(false)
  })
})
