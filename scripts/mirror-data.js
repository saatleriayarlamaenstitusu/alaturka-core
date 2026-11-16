// Mirrors data/*.json into src/data/*.js as plain ES modules.
//
// The JSON files are canonical: any language can read them. But JSON import
// attributes are not available in every JavaScript runtime the core has to
// run in — notably GJS, which the desktop app uses — so the JS layer imports
// these mirrors instead. `npm test` asserts the two are identical, which is
// what keeps the copy from drifting.

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DATA = resolve(here, '..', 'data')
const OUT = resolve(here, '..', 'src', 'data')

for (const file of (await readdir(DATA)).filter(f => f.endsWith('.json')).sort()) {
  const json = JSON.parse(await readFile(resolve(DATA, file), 'utf8'))
  const name = basename(file, '.json')
  const body = `// GENERATED from data/${file} by scripts/mirror-data.js — do not edit.\n`
    + `// The JSON file is canonical; run \`npm run mirror\` after changing it.\n`
    + `export default ${JSON.stringify(json, null, 2)}\n`
  await writeFile(resolve(OUT, `${name}.js`), body)
  console.log(`src/data/${name}.js`.padEnd(32), `${body.length} B`)
}
