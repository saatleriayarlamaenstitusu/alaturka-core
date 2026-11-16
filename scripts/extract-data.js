// Turns the website's data modules into language-neutral JSON.
//
// The tables were assembled by hand against Diyanet's published calendar, so
// they are never retyped: this script imports the original modules and dumps
// what they actually export. Provenance comments (`// Diyanet`) are read from
// the source text, since they do not survive as values.
//
//   node scripts/extract-data.js [path-to-website-src]

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(here, '..', process.argv[2] ?? '../alaturkavakitler/src')
const OUT = resolve(here, '..', 'data')

const load = (rel) => import(pathToFileURL(resolve(WEB, rel)).href)
const write = async (name, value) => {
  await writeFile(resolve(OUT, name), JSON.stringify(value, null, 2) + '\n')
  const bytes = JSON.stringify(value).length
  console.log(`${name.padEnd(22)} ${String(bytes).padStart(7)} B`)
}

// ── Hijri month starts ────────────────────────────────────────────────
// Each row is the Gregorian day the hijri month begins on. `source` records
// where the row came from: rows marked `// Diyanet` in the source are taken
// straight from Diyanet's published list, the rest were generated from
// Umm al-Qura and reconciled against it.
async function hijriMonths() {
  const { FIRST_MONTH, MONTH_STARTS, HIJRI_MONTHS } = await load('data/hijriMonths.js')
  const src = await readFile(resolve(WEB, 'data/hijriMonths.js'), 'utf8')

  // Map each ISO date in the source text to whether its line is flagged.
  const flagged = new Map()
  for (const line of src.split('\n')) {
    const m = line.match(/'(\d{4}-\d{2}-\d{2})'/)
    if (m) flagged.set(m[1], /\/\/\s*Diyanet/.test(line))
  }

  const months = MONTH_STARTS.map((start, i) => {
    const n = FIRST_MONTH.month - 1 + i
    const month = ((n % 12) + 12) % 12 + 1
    return {
      hijriYear: FIRST_MONTH.year + Math.floor(n / 12),
      hijriMonth: month,
      start,
      source: flagged.get(start) ? 'diyanet' : 'umm-al-qura',
    }
  })

  // Rows must be consecutive: 29 or 30 days apart. A hand edit that slips a
  // row would otherwise shift every later conversion silently.
  const DAY = 86400000
  const utc = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }
  for (let i = 1; i < months.length; i++) {
    const n = Math.round((utc(months[i].start) - utc(months[i - 1].start)) / DAY)
    if (n !== 29 && n !== 30) {
      throw new Error(`hijri months: ${months[i - 1].start} → ${months[i].start} is ${n} days`)
    }
  }

  await write('hijri-months.json', { monthNames: HIJRI_MONTHS, months })
  return months
}

// ── Cities ────────────────────────────────────────────────────────────
// Name, slug and Diyanet id come from the city list; the coordinates come
// from the qibla table. One file, because every consumer needs both.
async function cities() {
  const { CITIES } = await load('data/cities.js')
  const { CITY_COORDS } = await load('data/cityCoords.js')

  const out = {}
  const missing = []
  for (const [plate, c] of Object.entries(CITIES)) {
    const coords = CITY_COORDS[Number(plate)]
    if (!coords) missing.push(plate)
    out[plate] = {
      plate: c.plate,
      name: c.name,
      slug: c.slug,
      diyanetId: c.diyanetId,
      lat: coords?.[0] ?? null,
      lon: coords?.[1] ?? null,
    }
  }
  if (missing.length) throw new Error(`cities without coordinates: ${missing.join(', ')}`)

  await write('cities.json', out)
  return out
}

const months = await hijriMonths()
const cityList = await cities()
console.log(`\n${months.length} hijri months (${months[0].start} → ${months.at(-1).start}), ` +
  `${months.filter(m => m.source === 'diyanet').length} from Diyanet`)
console.log(`${Object.keys(cityList).length} cities`)
