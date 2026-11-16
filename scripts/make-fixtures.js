// Generates the golden reference from the WEBSITE's implementation.
//
// The point is to pin down the behaviour that is already trusted in
// production, before the logic is rewritten here without Luxon and with the
// tables moved out to JSON. The test suite then replays these files against
// the core: if a single day's hijri date, religious day or alaturka reading
// differs, the test fails and names the day.
//
// Needs the website checked out next to this repo and its node_modules
// installed (Luxon is imported from there). Run it again only when the
// website's own behaviour is deliberately changed.
//
//   TZ=Europe/Istanbul node scripts/make-fixtures.js [path-to-website]

import { register } from 'node:module'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(here, '..', process.argv[2] ?? '../alaturkavakitler')
const SRC = resolve(WEB, 'src')
const OUT = resolve(here, '..', 'fixtures')
const TZ = 'Europe/Istanbul'

if (process.env.TZ !== TZ) {
  console.error(`refusing to run outside ${TZ}: local calendar days decide every\n` +
    `conversion, so a fixture generated elsewhere would encode a different\n` +
    `answer. Re-run with TZ=${TZ}.`)
  process.exit(1)
}

register(pathToFileURL(resolve(here, 'alias-hook.js')).href, { parentURL: import.meta.url, data: { base: SRC } })

const sha = execFileSync('git', ['-C', WEB, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
const stamp = { generatedFrom: `alaturkavakitler@${sha}`, timeZone: TZ }

const { toHijri } = await import(resolve(SRC, 'utils/hijri.js'))
const { holyDaysOn } = await import(resolve(SRC, 'data/holyDays.js'))
const { calculateAlaturka } = await import(resolve(SRC, 'utils/clock.js'))
const { DateTime } = await import(resolve(WEB, 'node_modules/luxon/src/luxon.js'))

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const save = async (name, value) => {
  const text = JSON.stringify(value)
  await writeFile(resolve(OUT, name), text + '\n')
  console.log(`${name.padEnd(24)} ${(text.length / 1024).toFixed(0).padStart(5)} KB`)
}

// ── Hijri conversion and religious days, day by day ───────────────────
// The range deliberately overflows the table (2022-07 → 2036-05) at both
// ends, so the out-of-table estimate is pinned down too.
async function days() {
  const from = new Date(2021, 0, 1)
  const to = new Date(2038, 11, 31)
  const rows = []
  const holy = {}

  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const h = toHijri(d)
    rows.push([iso(d), h.year, h.month, h.day, h.exact ? 1 : 0])
    const list = holyDaysOn(d)
    if (list.length) holy[iso(d)] = list
  }

  await save('hijri-days.json', {
    ...stamp,
    note: 'Every day converted by the website implementation. Columns: iso, hijriYear, hijriMonth, hijriDay, exact.',
    range: [iso(from), iso(to)],
    columns: ['iso', 'hijriYear', 'hijriMonth', 'hijriDay', 'exact'],
    days: rows,
  })
  await save('holy-days.json', {
    ...stamp,
    note: 'Religious days per date, as the website derives them. Sparse: only dates that have one.',
    range: [iso(from), iso(to)],
    days: holy,
  })
  return { total: rows.length, estimated: rows.filter(r => r[4] === 0).length, holy: Object.keys(holy).length }
}

// ── The alaturka clock, sampled against real prayer times ─────────────
// Captured from the Luxon implementation so the rewrite can be shown to be
// behaviour-preserving without Luxon being a dependency of the test suite.
async function alaturka() {
  const vakitler = JSON.parse(await readFile(resolve(OUT, 'vakitler-ankara.json'), 'utf8'))
  const dates = Object.keys(vakitler).sort()
  const start = new Date(`${dates[0]}T00:00:00`)
  const end = new Date(`${dates.at(-1)}T23:59:00`)

  const samples = []
  const STEP = 23 * 60000 // every 23 minutes: lands on varied offsets either side of maghrib
  for (let t = start.getTime(); t <= end.getTime(); t += STEP) {
    const d = new Date(t)
    samples.push([`${iso(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      calculateAlaturka(DateTime.fromJSDate(d), vakitler)])
  }

  await save('alaturka.json', {
    ...stamp,
    note: 'calculateAlaturka sampled every 23 minutes over the bundled Ankara prayer times, as produced by the Luxon implementation.',
    city: '6',
    stepMinutes: 23,
    columns: ['localDateTime', 'alaturka'],
    samples,
  })
  return { samples: samples.length, unknown: samples.filter(s => s[1] === '--:--').length }
}

const d = await days()
const a = await alaturka()
console.log(`\n${d.total} days, ${d.estimated} outside the table, ${d.holy} with a religious day`)
console.log(`${a.samples} alaturka samples, ${a.unknown} without data (the first day has no previous maghrib)`)
