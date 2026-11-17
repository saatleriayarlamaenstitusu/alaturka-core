// The six daily prayer times as a usable table, plus which one we are in.
//
// Differences from the web app's original `utils/vakit.js`: no Luxon, `now` is
// injected rather than read from the clock (which makes it testable), and the
// parsed times are called `time` / `timeTomorrow` instead of `valueDateObj` /
// `valueDateObj2` — they are plain `Date` objects now, and a renamed field
// fails loudly at the call site instead of silently losing Luxon methods.

import { isoDate, atTime } from './clock.js'

export const VAKIT_KEYS = ['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi']

export const VAKIT_COLORS = {
  imsak: '#00b7ff',
  gunes: '#ffbd33',
  ogle: '#ffd733',
  ikindi: '#ff8c33',
  aksam: '#0491fb',
  yatsi: '#2e3b83',
}

const META = {
  imsak: { name: 'İmsak', label: 'İmsak\'a', next: 'gunes' },
  gunes: { name: 'Güneş', label: 'Güneş\'e', next: 'ogle' },
  ogle: { name: 'Öğle', label: 'Öğle\'ye', next: 'ikindi' },
  ikindi: { name: 'İkindi', label: 'İkindi\'ye', next: 'aksam' },
  aksam: { name: 'Akşam', label: 'Akşam\'a', next: 'yatsi' },
  yatsi: { name: 'Yatsı', label: 'Yatsı\'ya', next: 'imsak' },
}

/**
 * Builds the table for `now`'s day, carrying tomorrow's times as well so that
 * a countdown can cross midnight.
 * @returns {Record<string, object>|null} null when the day is missing
 */
export function createVakitTable(vakitler, now = new Date()) {
  if (!vakitler) return null

  const todayISO = isoDate(now)
  const tomorrowISO = isoDate(new Date(now.getTime() + 86400000))
  const today = vakitler[todayISO]
  const tomorrow = vakitler[tomorrowISO]
  if (!today) return null

  const table = {}
  for (const key of VAKIT_KEYS) {
    table[key] = {
      key,
      ...META[key],
      color: VAKIT_COLORS[key],
      value: today[key] ?? null,
      time: today[key] ? atTime(todayISO, today[key]) : null,
      valueTomorrow: tomorrow?.[key] ?? null,
      timeTomorrow: tomorrow?.[key] ? atTime(tomorrowISO, tomorrow[key]) : null,
    }
  }
  return table
}

/** Which prayer time we are currently in: the most recent one that has passed. */
export function findVakit(table, now = new Date()) {
  if (!table) return 'yatsi'
  let maxPast = -Infinity
  let current = 'yatsi'

  for (const key of VAKIT_KEYS) {
    const t = table[key]?.time
    if (!t) continue
    const diff = t - now
    if (diff < 0 && diff > maxPast) {
      maxPast = diff
      current = key
    }
  }
  return current
}

/**
 * Time remaining until the next prayer, crossing midnight when needed.
 *
 * This looks for the earliest time still ahead rather than stepping forward
 * from the current prayer, because between midnight and imsak there is no
 * current prayer on today's table: every one of today's six times is still
 * in the future, `findVakit` falls back to `yatsi` (correct — it is
 * yesterday's yatsi we are in), and stepping to its successor would reach
 * TOMORROW's imsak and report a countdown of twenty-seven hours. Measured on
 * the desktop app at 02:21 before the fix.
 */
export function nextVakit(table, now = new Date()) {
  if (!table) return null

  let key = null
  let target = null
  for (const k of VAKIT_KEYS) {
    const t = table[k]?.time
    if (!t || t <= now) continue
    if (!target || t < target) {
      target = t
      key = k
    }
  }
  // After yatsi there is nothing left today, so the next one is tomorrow's
  // imsak — the only time the countdown spans a date change.
  if (!target) {
    key = 'imsak'
    target = table.imsak?.timeTomorrow ?? null
  }
  if (!target) return null

  const ms = target - now
  return {
    key,
    name: META[key].name,
    label: META[key].label,
    at: target,
    ms,
    hours: Math.floor(ms / 3600000),
    minutes: Math.floor(ms / 60000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
  }
}

/**
 * Is `now` inside a kerahat window — the 45 minutes before a prayer ends after
 * ikindi, and the 45 minutes after sunrise.
 * @param {{hours:number, minutes:number}} counter time left to the next prayer
 */
export function isKerahat(counter, currentVakit, table, now = new Date()) {
  if (currentVakit === 'ikindi') {
    return counter.hours === 0 && counter.minutes < 45
  }
  if (currentVakit === 'gunes') {
    const gunesPlus45 = new Date(table.gunes.time.getTime() + 45 * 60000)
    return (counter.hours === 0 && counter.minutes < 45) || gunesPlus45 > now
  }
  return false
}
