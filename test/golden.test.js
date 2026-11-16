// Replays the golden reference: the behaviour the website shipped, day by day.
//
// This is the whole reason the fixtures exist. The core rewrote the same rules
// without Luxon and with the tables moved into JSON; nothing here checks that
// the rewrite is reasonable, only that it answers identically.
import test from 'node:test'
import assert from 'node:assert/strict'
import { requireTimeZone, fixture } from './helpers.js'
import { toHijri } from '../src/hijri.js'
import { holyDaysOn } from '../src/holy-days.js'
import { calculateAlaturka } from '../src/clock.js'

requireTimeZone()

const localDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

test('hijri conversion matches the website for every day 2021–2038', async () => {
  const { days, range } = await fixture('hijri-days.json')
  const wrong = []

  for (const [iso, year, month, day, exact] of days) {
    const h = toHijri(localDate(iso))
    if (h.year !== year || h.month !== month || h.day !== day || h.exact !== Boolean(exact)) {
      wrong.push(`${iso}: expected ${year}/${month}/${day} exact=${Boolean(exact)}, got ${h.year}/${h.month}/${h.day} exact=${h.exact}`)
    }
  }

  assert.equal(wrong.length, 0, `${wrong.length} of ${days.length} days differ (${range.join(' → ')}):\n${wrong.slice(0, 10).join('\n')}`)
})

test('religious days match the website, date for date', async () => {
  const { days: expected, range } = await fixture('holy-days.json')
  const [from, to] = range.map(localDate)

  // Walk the whole range, not just the dates the fixture lists: a rule that
  // fires on a day it should not is as wrong as one that fails to fire.
  const actual = {}
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const list = holyDaysOn(d)
    if (list.length) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      actual[iso] = list
    }
  }

  const dates = new Set([...Object.keys(expected), ...Object.keys(actual)])
  const wrong = []
  for (const iso of [...dates].sort()) {
    const a = JSON.stringify(actual[iso] ?? null)
    const e = JSON.stringify(expected[iso] ?? null)
    if (a !== e) wrong.push(`${iso}:\n  expected ${e}\n  got      ${a}`)
  }

  assert.equal(wrong.length, 0, `${wrong.length} dates differ:\n${wrong.slice(0, 5).join('\n')}`)
})

test('alaturka clock matches the Luxon implementation on real prayer times', async () => {
  const { samples, city } = await fixture('alaturka.json')
  const vakitler = await fixture('vakitler-ankara.json')
  const wrong = []

  for (const [localDateTime, expected] of samples) {
    const [date, time] = localDateTime.split('T')
    const [y, m, d] = date.split('-').map(Number)
    const [hh, mm] = time.split(':').map(Number)
    const got = calculateAlaturka(new Date(y, m - 1, d, hh, mm), vakitler)
    if (got !== expected) wrong.push(`${localDateTime}: expected ${expected}, got ${got}`)
  }

  assert.equal(wrong.length, 0, `${wrong.length} of ${samples.length} samples differ (city ${city}):\n${wrong.slice(0, 10).join('\n')}`)
})
