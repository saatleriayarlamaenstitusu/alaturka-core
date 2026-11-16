import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const TZ = 'Europe/Istanbul'

// Every conversion in the core is decided on local calendar days, so the
// fixtures only mean anything in the zone they were generated in.
export function requireTimeZone() {
  if (process.env.TZ !== TZ) {
    throw new Error(`these tests must run with TZ=${TZ} (got ${process.env.TZ ?? 'unset'}); use \`npm test\``)
  }
}

export const fixture = async (name) =>
  JSON.parse(await readFile(resolve(here, '..', 'fixtures', name), 'utf8'))

export const dataFile = async (name) =>
  JSON.parse(await readFile(resolve(here, '..', 'data', name), 'utf8'))
