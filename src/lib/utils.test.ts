import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  formatTime,
  formatDuration,
  getGreeting,
  calculateWeeksToComplete,
  getDateString,
  isToday,
  isYesterday,
  generateId,
  debounce,
  throttle,
  lerp,
  clamp,
  randomBetween,
  shuffleArray,
  pluralize,
  getRelativeTimeString,
} from './utils'

describe('cn (classnames merge)', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'disabled')).toBe('base active')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles arrays and objects', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
    expect(cn({ foo: true, bar: false })).toBe('foo')
  })
})

describe('formatTime', () => {
  it('formats seconds correctly', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(30)).toBe('0:30')
    expect(formatTime(60)).toBe('1:00')
    expect(formatTime(90)).toBe('1:30')
    expect(formatTime(125)).toBe('2:05')
    expect(formatTime(3661)).toBe('61:01')
  })

  it('pads single digit seconds', () => {
    expect(formatTime(5)).toBe('0:05')
    expect(formatTime(65)).toBe('1:05')
  })
})

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(15)).toBe('15 min')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(59)).toBe('59 min')
  })

  it('formats hours only', () => {
    expect(formatDuration(60)).toBe('1 hr')
    expect(formatDuration(120)).toBe('2 hr')
    expect(formatDuration(180)).toBe('3 hr')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(75)).toBe('1 hr 15 min')
    expect(formatDuration(150)).toBe('2 hr 30 min')
    expect(formatDuration(195)).toBe('3 hr 15 min')
  })
})

describe('getGreeting', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns morning greeting before noon', () => {
    vi.setSystemTime(new Date('2024-01-01T09:00:00'))
    expect(getGreeting()).toBe('Good morning')
  })

  it('returns afternoon greeting between noon and 5pm', () => {
    vi.setSystemTime(new Date('2024-01-01T14:00:00'))
    expect(getGreeting()).toBe('Good afternoon')
  })

  it('returns evening greeting after 5pm', () => {
    vi.setSystemTime(new Date('2024-01-01T19:00:00'))
    expect(getGreeting()).toBe('Good evening')
  })
})

describe('calculateWeeksToComplete', () => {
  it('calculates weeks correctly', () => {
    expect(calculateWeeksToComplete(100, 10)).toBe(2) // 10 days = 2 weeks
    expect(calculateWeeksToComplete(70, 10)).toBe(1) // 7 days = 1 week
    expect(calculateWeeksToComplete(140, 10)).toBe(2) // 14 days = 2 weeks
    expect(calculateWeeksToComplete(150, 10)).toBe(3) // 15 days = 3 weeks
  })

  it('rounds up partial weeks', () => {
    expect(calculateWeeksToComplete(80, 10)).toBe(2) // 8 days rounds to 2 weeks
  })
})

describe('getDateString', () => {
  it('returns ISO date string', () => {
    const date = new Date('2024-06-15T12:00:00Z')
    expect(getDateString(date)).toBe('2024-06-15')
  })

  it('uses current date when no argument', () => {
    const result = getDateString()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isToday', () => {
  it('returns true for today', () => {
    const today = getDateString()
    expect(isToday(today)).toBe(true)
  })

  it('returns false for other dates', () => {
    expect(isToday('2020-01-01')).toBe(false)
    expect(isToday('9999-12-31')).toBe(false)
  })
})

describe('isYesterday', () => {
  it('returns true for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isYesterday(getDateString(yesterday))).toBe(true)
  })

  it('returns false for other dates', () => {
    expect(isYesterday('2020-01-01')).toBe(false)
    expect(isYesterday(getDateString())).toBe(false) // today is not yesterday
  })
})

describe('generateId', () => {
  it('generates a string id', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
    expect(id.length).toBe(7)
  })

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('delays function execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('resets timer on subsequent calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(50)
    debounced()
    vi.advanceTimersByTime(50)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('executes immediately on first call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ignores calls within throttle period', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    throttled()
    throttled()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('allows calls after throttle period', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    vi.advanceTimersByTime(100)
    throttled()
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('lerp', () => {
  it('interpolates between values', () => {
    expect(lerp(0, 100, 0)).toBe(0)
    expect(lerp(0, 100, 0.5)).toBe(50)
    expect(lerp(0, 100, 1)).toBe(100)
    expect(lerp(10, 20, 0.5)).toBe(15)
  })

  it('handles negative values', () => {
    expect(lerp(-100, 100, 0.5)).toBe(0)
  })
})

describe('clamp', () => {
  it('clamps value to range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('handles edge cases', () => {
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })
})

describe('randomBetween', () => {
  it('returns value within range', () => {
    for (let i = 0; i < 100; i++) {
      const result = randomBetween(5, 10)
      expect(result).toBeGreaterThanOrEqual(5)
      expect(result).toBeLessThan(10)
    }
  })
})

describe('shuffleArray', () => {
  it('returns array of same length', () => {
    const arr = [1, 2, 3, 4, 5]
    const shuffled = shuffleArray(arr)
    expect(shuffled.length).toBe(arr.length)
  })

  it('contains all original elements', () => {
    const arr = [1, 2, 3, 4, 5]
    const shuffled = shuffleArray(arr)
    expect(shuffled.sort()).toEqual(arr.sort())
  })

  it('does not mutate original array', () => {
    const arr = [1, 2, 3, 4, 5]
    const original = [...arr]
    shuffleArray(arr)
    expect(arr).toEqual(original)
  })
})

describe('pluralize', () => {
  it('returns singular for count of 1', () => {
    expect(pluralize(1, 'day')).toBe('day')
    expect(pluralize(1, 'lesson')).toBe('lesson')
  })

  it('returns plural for count not 1', () => {
    expect(pluralize(0, 'day')).toBe('days')
    expect(pluralize(2, 'day')).toBe('days')
    expect(pluralize(100, 'lesson')).toBe('lessons')
  })

  it('uses custom plural when provided', () => {
    expect(pluralize(2, 'person', 'people')).toBe('people')
    expect(pluralize(0, 'child', 'children')).toBe('children')
  })
})

describe('getRelativeTimeString', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for recent times', () => {
    const date = new Date('2024-01-15T11:59:30Z')
    expect(getRelativeTimeString(date)).toBe('just now')
  })

  it('returns minutes ago', () => {
    const date = new Date('2024-01-15T11:45:00Z')
    expect(getRelativeTimeString(date)).toBe('15 min ago')
  })

  it('returns hours ago', () => {
    const date = new Date('2024-01-15T09:00:00Z')
    expect(getRelativeTimeString(date)).toBe('3 hr ago')
  })

  it('returns days ago', () => {
    const date = new Date('2024-01-13T12:00:00Z')
    expect(getRelativeTimeString(date)).toBe('2 days ago')
  })
})
