// Unit tests for the parts that have no counterpart on the website: the panel
// formatter is new, and the qibla and prayer-table helpers changed shape when
// Luxon came out.
import test from 'node:test'
import assert from 'node:assert/strict'
import { requireTimeZone } from './helpers.js'
import { qiblaBearing, compassName, formatBearing } from '../src/qibla.js'
import { formatDuration, atTime, isoDate } from '../src/clock.js'
import { createVakitTable, findVakit, nextVakit, isKerahat } from '../src/vakit.js'
import { buildPanelSnapshot, formatPanelLine, formatFromOptions } from '../src/panel-line.js'
import CITIES from '../src/data/cities.js'

requireTimeZone()

// A day of real Ankara times plus its neighbours, so countdowns can cross
// midnight and the alaturka reading has a previous maghrib to lean on.
const VAKITLER = {
  '2026-11-15': { imsak: '05:59', gunes: '07:26', ogle: '12:38', ikindi: '15:17', aksam: '17:42', yatsi: '19:03' },
  '2026-11-16': { imsak: '06:00', gunes: '07:27', ogle: '12:38', ikindi: '15:16', aksam: '17:41', yatsi: '19:02' },
  '2026-11-17': { imsak: '06:01', gunes: '07:28', ogle: '12:39', ikindi: '15:16', aksam: '17:41', yatsi: '19:02' },
}
const at = (h, m) => new Date(2026, 10, 16, h, m)

test('qibla bearing is south-southeast from Turkey', () => {
  // The flat-map intuition says southeast; the great circle says otherwise.
  const ist = qiblaBearing(41.0082, 28.9784)
  const diy = qiblaBearing(37.9144, 40.2306)
  assert.ok(Math.abs(ist - 151) < 1.5, `İstanbul ${ist.toFixed(1)}°`)
  assert.ok(Math.abs(diy - 181) < 1.5, `Diyarbakır ${diy.toFixed(1)}°`)
  assert.equal(compassName(ist), 'GD')
  assert.equal(compassName(diy), 'G')
  assert.equal(formatBearing(151.3), '151°')
})

test('qibla uses every city in the table without producing nonsense', () => {
  for (const [plate, c] of Object.entries(CITIES)) {
    const b = qiblaBearing(c.lat, c.lon)
    assert.ok(b >= 0 && b < 360, `${plate} ${c.name}: ${b}`)
    // Turkey lies north-west of Mecca, so the bearing is always southerly.
    assert.ok(b > 110 && b < 230, `${plate} ${c.name}: ${b.toFixed(1)}° is not southerly`)
  }
})

test('durations are not wrapped at 12 or 24 hours', () => {
  assert.equal(formatDuration(0), '00:00')
  assert.equal(formatDuration(65 * 60000), '01:05')
  assert.equal(formatDuration((13 * 60 + 45) * 60000), '13:45')
  assert.equal(formatDuration(25 * 3600000), '25:00')
  assert.equal(formatDuration(-5000), '00:00')
})

test('local times are parsed and printed without a UTC round trip', () => {
  const d = atTime('2026-11-16', '17:41')
  assert.equal(d.getHours(), 17)
  assert.equal(d.getMinutes(), 41)
  assert.equal(isoDate(d), '2026-11-16')
})

test('the current prayer time is the most recent one that has passed', () => {
  const table = createVakitTable(VAKITLER, at(16, 0))
  assert.equal(findVakit(table, at(5, 0)), 'yatsi')   // before imsak, still last night
  assert.equal(findVakit(table, at(6, 30)), 'imsak')
  assert.equal(findVakit(table, at(13, 0)), 'ogle')
  assert.equal(findVakit(table, at(16, 0)), 'ikindi')
  assert.equal(findVakit(table, at(18, 0)), 'aksam')
  assert.equal(findVakit(table, at(20, 0)), 'yatsi')
})

test('the countdown crosses midnight into tomorrow’s imsak', () => {
  const table = createVakitTable(VAKITLER, at(23, 30))
  const next = table && nextVakit(table, at(23, 30))
  assert.equal(next.key, 'imsak')
  assert.equal(isoDate(next.at), '2026-11-17')
  assert.equal(next.hours, 6)
  assert.equal(next.minutes, 31)
})

test('kerahat covers the 45 minutes after sunrise and before maghrib', () => {
  const table = createVakitTable(VAKITLER, at(8, 0))
  assert.equal(isKerahat({ hours: 0, minutes: 20 }, 'ikindi', table, at(17, 21)), true)
  assert.equal(isKerahat({ hours: 1, minutes: 20 }, 'ikindi', table, at(16, 21)), false)
  assert.equal(isKerahat({ hours: 4, minutes: 0 }, 'gunes', table, at(7, 50)), true)
  assert.equal(isKerahat({ hours: 4, minutes: 0 }, 'gunes', table, at(8, 30)), false)
  assert.equal(isKerahat({ hours: 0, minutes: 10 }, 'ogle', table, at(12, 30)), false)
})

test('missing days yield no table rather than a broken one', () => {
  assert.equal(createVakitTable(VAKITLER, new Date(2030, 0, 1)), null)
  assert.equal(createVakitTable(null, at(12, 0)), null)
  assert.equal(findVakit(null, at(12, 0)), 'yatsi')
})

test('the panel line renders the chosen tokens', () => {
  const s = buildPanelSnapshot({ vakitler: VAKITLER, now: at(16, 52) })
  assert.equal(s.vakit, 'İkindi')
  assert.equal(s.sonraki, 'Akşam')
  assert.equal(s.kalan, '00:49')
  assert.equal(s.miladi, '16 Kasım 2026')
  assert.equal(s.gun, 'Pazartesi')
  assert.equal(formatPanelLine(s, '{saat} · {vakit}'), '16:52 · İkindi')
  assert.equal(formatPanelLine(s, '{alaturka} · {sonraki} {kalan}'), `${s.alaturka} · Akşam 00:49`)
})

test('the hijri date can be shifted by the evening adhan', () => {
  const before = buildPanelSnapshot({ vakitler: VAKITLER, now: at(17, 0), hijriShift: true })
  const after = buildPanelSnapshot({ vakitler: VAKITLER, now: at(18, 0), hijriShift: true })
  assert.notEqual(before.hicri, after.hicri, 'the hijri day should roll over after maghrib')

  const unshifted = buildPanelSnapshot({ vakitler: VAKITLER, now: at(18, 0) })
  assert.equal(unshifted.hicri, before.hicri)
})

test('a token with no value takes its separator with it', () => {
  const partial = { hicri: '7 Cemaziyelahir 1448' }
  assert.equal(formatPanelLine(partial, '{alaturka} · {vakit} · {hicri}'), '7 Cemaziyelahir 1448')
  assert.equal(formatPanelLine(partial, '{hicri} · {vakit}'), '7 Cemaziyelahir 1448')
  assert.equal(formatPanelLine({}, '{alaturka} · {vakit}'), '')
  // Unknown tokens are left alone rather than silently swallowed.
  assert.equal(formatPanelLine(partial, '{hicri} {yok}'), '7 Cemaziyelahir 1448 {yok}')
})

test('structured settings produce a format string', () => {
  assert.equal(formatFromOptions({ clock: 'alaturka' }), '{alaturka}')
  assert.equal(formatFromOptions({ clock: 'both', date: 'both' }),
    '{alaturka} · {saat} · {hicri} · {miladi}')
  assert.equal(formatFromOptions({ clock: 'normal', vakitName: true, countdown: true, separator: ' | ' }),
    '{saat} | {vakit} | {sonraki} {kalan}')
  assert.equal(formatFromOptions({ clock: 'none' }), '')
})
