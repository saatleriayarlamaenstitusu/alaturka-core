// The JSON files under data/ are canonical; src/data/*.js are generated
// mirrors, because JSON import attributes are not available in every runtime
// the core has to work in. This test is what stops the copy from drifting.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { dirname, resolve, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dataFile } from './helpers.js'

const here = dirname(fileURLToPath(import.meta.url))

test('src/data mirrors match data/*.json exactly', async () => {
  const dir = resolve(here, '..', 'data')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'))
  assert.ok(files.length >= 3, 'expected at least three data files')

  for (const file of files) {
    const canonical = await dataFile(file)
    const mirrorPath = resolve(here, '..', 'src', 'data', `${basename(file, '.json')}.js`)
    const mirror = (await import(pathToFileURL(mirrorPath).href)).default
    assert.deepEqual(mirror, canonical, `${file} and its mirror differ — run \`npm run mirror\``)
  }
})

test('hijri month rows are consecutive and 29 or 30 days apart', async () => {
  const { months } = await dataFile('hijri-months.json')
  const DAY = 86400000
  const utc = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) }

  for (let i = 1; i < months.length; i++) {
    const n = Math.round((utc(months[i].start) - utc(months[i - 1].start)) / DAY)
    assert.ok(n === 29 || n === 30, `${months[i - 1].start} → ${months[i].start} is ${n} days`)

    const prev = months[i - 1]
    const expected = prev.hijriMonth === 12
      ? { y: prev.hijriYear + 1, m: 1 }
      : { y: prev.hijriYear, m: prev.hijriMonth + 1 }
    assert.deepEqual({ y: months[i].hijriYear, m: months[i].hijriMonth }, expected,
      `month numbering jumps at ${months[i].start}`)
  }
})

test('every city has a name and coordinates', async () => {
  const cities = await dataFile('cities.json')
  assert.equal(Object.keys(cities).length, 81)
  for (const [plate, c] of Object.entries(cities)) {
    assert.ok(c.name, `${plate} has no name`)
    assert.ok(typeof c.lat === 'number' && typeof c.lon === 'number', `${plate} has no coordinates`)
    assert.ok(c.lat > 35 && c.lat < 43, `${plate} latitude out of Turkey: ${c.lat}`)
    assert.ok(c.lon > 25 && c.lon < 45, `${plate} longitude out of Turkey: ${c.lon}`)
  }
})
