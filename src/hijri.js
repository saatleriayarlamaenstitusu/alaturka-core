// Hijri ↔ Gregorian conversion, driven by the table in data/hijri-months.json.
//
// The table exists because arithmetic (tabular) hijri libraries apply a fixed
// rule while Diyanet uses a calculated calendar. The two drift: 9 of the 12
// month starts in 2026 disagreed, and the gap reached 2 days in Ramadan. No
// constant correction factor fixes that.
//
// Outside the table's range the month length falls back to the mean synodic
// month and the result is flagged `exact: false`.

import TABLE from './data/hijri-months.js'

export const HIJRI_MONTHS = TABLE.monthNames

const MS_DAY = 86400000
const MEAN_MONTH = 29.530588

// Comparisons are done on whole days so that a timezone offset cannot shift a
// conversion by one day.
const dayStart = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
const isoToUTC = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

const STARTS = TABLE.months.map((m) => isoToUTC(m.start))
const FIRST = { year: TABLE.months[0].hijriYear, month: TABLE.months[0].hijriMonth }

// Row index → hijri year/month. JavaScript's `%` returns a negative remainder
// for negative input; for dates BEFORE the table that drove the month number
// to zero and below, and `HIJRI_MONTHS[month - 1]` came out undefined. The
// remainder is pulled back into range.
const indexToYM = (i) => {
  const n = FIRST.month - 1 + i
  const m = ((n % 12) + 12) % 12
  return { year: FIRST.year + Math.floor(n / 12), month: m + 1 }
}
const ymToIndex = (year, month) => (year - FIRST.year) * 12 + (month - FIRST.month)

/** The Gregorian range the table covers, as ISO dates. */
export const TABLE_RANGE = {
  start: TABLE.months[0].start,
  end: TABLE.months[TABLE.months.length - 1].start,
}

/** Is this date inside the table? Outside it, conversion is an estimate. */
export function inTable(date = new Date()) {
  const t = dayStart(date)
  return t >= STARTS[0] && t < STARTS[STARTS.length - 1]
}

/**
 * Gregorian → hijri.
 * @returns {{year:number, month:number, day:number, monthName:string, exact:boolean}}
 *   `exact: false` means the date fell outside the table and was estimated
 *   from the mean month length.
 */
export function toHijri(date = new Date()) {
  const t = dayStart(date)

  if (t < STARTS[0] || t >= STARTS[STARTS.length - 1]) {
    const edge = t < STARTS[0] ? 0 : STARTS.length - 1
    const months = Math.floor((t - STARTS[edge]) / MS_DAY / MEAN_MONTH)
    const { year, month } = indexToYM(edge + months)
    const approxStart = STARTS[edge] + Math.round(months * MEAN_MONTH) * MS_DAY
    const day = Math.floor((t - approxStart) / MS_DAY) + 1
    return { year, month, day, monthName: HIJRI_MONTHS[month - 1], exact: false }
  }

  // Binary search for the month containing t.
  let lo = 0
  let hi = STARTS.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (STARTS[mid] <= t) lo = mid
    else hi = mid
  }
  const { year, month } = indexToYM(lo)
  return {
    year,
    month,
    day: Math.round((t - STARTS[lo]) / MS_DAY) + 1,
    monthName: HIJRI_MONTHS[month - 1],
    exact: true,
  }
}

/** Hijri → Gregorian: the Gregorian day that hijri day begins on. */
export function fromHijri(year, month, day = 1) {
  const i = ymToIndex(year, month)
  const base = i >= 0 && i < STARTS.length
    ? STARTS[i]
    : STARTS[0] + Math.round(i * MEAN_MONTH) * MS_DAY
  const utc = base + (day - 1) * MS_DAY
  const d = new Date(utc)
  // UTC day → the same calendar day in local time.
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Length of a hijri month in days (29 or 30). */
export function hijriMonthLength(year, month) {
  const i = ymToIndex(year, month)
  if (i < 0 || i + 1 >= STARTS.length) return 30
  return Math.round((STARTS[i + 1] - STARTS[i]) / MS_DAY)
}

/**
 * A hijri day begins at sunset. When `aksam` is given and that time has
 * passed, the date rolls forward by one day — this is what the "shift with the
 * evening adhan" setting uses.
 * @param {Date} now
 * @param {Date|null} aksam today's maghrib time
 */
export function hijriNow(now = new Date(), aksam = null) {
  const shifted = aksam && now >= aksam ? new Date(now.getTime() + MS_DAY) : now
  return toHijri(shifted)
}

export function nowHijri(format = 'string', now = new Date(), aksam = null) {
  const h = hijriNow(now, aksam)
  const obj = { date: h.day, month: h.month, monthName: h.monthName, year: h.year }
  if (format === 'object') return obj
  return `${obj.date} ${obj.monthName} ${obj.year}`
}

/**
 * Grid information for the hijri month a date falls in.
 * `startOffset` is the weekday slot of the 1st, with Monday as 0.
 */
export function hijriMonth(baseDate = new Date(), aksam = null) {
  const h = hijriNow(baseDate, aksam)
  const firstGreg = fromHijri(h.year, h.month, 1)
  return {
    year: h.year,
    month: h.month,
    monthName: h.monthName,
    todayDate: h.day,
    daysInMonth: hijriMonthLength(h.year, h.month),
    startOffset: (firstGreg.getDay() + 6) % 7,
    firstGregorian: firstGreg,
  }
}

/** Row provenance, for showing how reliable a date is. */
export function monthSource(year, month) {
  const i = ymToIndex(year, month)
  return TABLE.months[i]?.source ?? null
}
