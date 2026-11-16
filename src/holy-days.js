// Religious days and nights, derived from the hijri calendar by rule.
// No list of fixed Gregorian dates is kept: the rules live in
// data/holy-days.json and are interpreted here.
//
// THE SUBTLETY WITH NIGHTS: a hijri day begins at sunset. "The 27th night of
// Recep" starts on the evening of the 26th and belongs to the 27th, so kandils
// are marked on the hijri day BEFORE the day they are named after. Diyanet's
// published Gregorian dates follow the same convention; all 15 dates in its
// 2026 list match this implementation.

import RULES from './data/holy-days.js'
import { toHijri, fromHijri, hijriMonthLength } from './hijri.js'

export const KINDS = RULES.kinds

const MS_DAY = 86400000
const dayStart = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())

const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')

// Does `date` satisfy a rule's `when` clause? Returns the ordinal within a
// range (used by `{n}` templates) or null when the rule does not apply.
function match(when, date, h) {
  switch (when.type) {
    case 'monthDay':
      return h.month === when.month && h.day === when.day ? 1 : null

    // The first given weekday of a hijri month — Regaip is the first Thursday
    // of Recep, whose night runs into Friday.
    case 'firstWeekdayOfMonth': {
      if (h.month !== when.month || date.getDay() !== when.weekday) return null
      const first = fromHijri(h.year, when.month, 1)
      const diff = Math.round((dayStart(date) - dayStart(first)) / MS_DAY)
      return diff >= 0 && diff < 7 ? 1 : null
    }

    // The eve of a feast is the last day of the preceding month, which is 29
    // or 30 depending on the table.
    case 'lastDayOfMonth':
      return h.month === when.month && h.day === hijriMonthLength(h.year, when.month) ? 1 : null

    case 'monthDayRange':
      return h.month === when.month && h.day >= when.from && h.day <= when.to
        ? h.day - when.from + 1
        : null

    default:
      throw new Error(`unknown rule type: ${when.type}`)
  }
}

/**
 * The religious days falling on a date — usually zero or one entry.
 * @param {Date} date
 * @returns {Array<{id:string, name:string, kind:string, night:boolean, note?:string}>}
 */
export function holyDaysOn(date = new Date()) {
  const h = toHijri(date)
  const out = []

  for (const rule of RULES.rules) {
    const n = match(rule.when, date, h)
    if (n === null) continue

    const vars = { n, year: h.year, day: h.day, month: h.month }
    const entry = {
      id: rule.id,
      name: rule.nameTemplate ? fill(rule.nameTemplate, vars) : rule.name,
      kind: rule.kind,
      night: Boolean(rule.night),
    }
    const note = rule.noteTemplate ? fill(rule.noteTemplate, vars) : rule.note
    if (note) entry.note = note
    out.push(entry)
  }

  return out
}

/** One-line label for a date; empty string when there is nothing. */
export function holyDayLabel(date = new Date()) {
  const d = holyDaysOn(date)
  return d.length ? d.map((x) => x.name).join(' · ') : ''
}

/** Religious days in a range, keyed by ISO date: `{ '2026-03-20': [...] }` */
export function holyDaysBetween(start, end) {
  const map = {}
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (d <= last) {
    const list = holyDaysOn(d)
    if (list.length) map[isoDate(d)] = list
    d.setDate(d.getDate() + 1)
  }
  return map
}

/** Local calendar day as `YYYY-MM-DD`, without a UTC round trip. */
export function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
