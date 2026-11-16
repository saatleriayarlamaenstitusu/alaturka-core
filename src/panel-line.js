// The one line that goes in a panel.
//
// Three shells render it: the desktop app's tray label (Mint shows live text
// through `org.x.StatusIcon`'s Label property), the Cinnamon applet, and the
// website's compact widgets. They all expose the same choices — which clock,
// whether to show the countdown, which date — so the formatter lives here
// rather than in any one of them, and all three stay in step by construction.
//
// Date names are built from tables instead of Intl on purpose: the core has to
// behave identically in Node, a browser, GJS and whatever a mobile shell
// brings, and an ICU-dependent result is not something tests can pin down.

import { calculateAlaturka } from './clock.js'
import { createVakitTable, findVakit, nextVakit } from './vakit.js'
import { nowHijri } from './hijri.js'

export const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

export const TR_WEEKDAYS = [
  'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi',
]

/** The tokens a format string may use, in the order a settings UI should list them. */
export const PANEL_TOKENS = [
  { token: 'alaturka', label: 'Alaturka saat', example: '13:42' },
  { token: 'saat', label: 'Saat', example: '17:05' },
  { token: 'vakit', label: 'Bulunulan vakit', example: 'İkindi' },
  { token: 'sonraki', label: 'Sonraki vakit', example: 'Akşam' },
  { token: 'kalan', label: 'Sonraki vakte kalan', example: '00:48' },
  { token: 'hicri', label: 'Hicri tarih', example: '7 Cemaziyelahir 1448' },
  { token: 'miladi', label: 'Miladi tarih', example: '16 Kasım 2026' },
  { token: 'gun', label: 'Gün adı', example: 'Pazartesi' },
]

/** Ready-made format strings, for a settings UI to offer before the free field. */
export const PANEL_PRESETS = [
  { id: 'alaturka', label: 'Yalnızca alaturka saat', format: '{alaturka}' },
  { id: 'alaturka-kalan', label: 'Alaturka saat + geri sayım', format: '{alaturka} · {sonraki} {kalan}' },
  { id: 'saat-vakit', label: 'Saat + vakit', format: '{saat} · {vakit}' },
  { id: 'tam', label: 'Saat, vakit ve hicri tarih', format: '{alaturka} · {vakit} · {hicri}' },
  { id: 'hicri', label: 'Yalnızca hicri tarih', format: '{hicri}' },
]

/** `HH:MM` of a Date, in local time. */
const clockTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/**
 * Everything a panel line can draw on, resolved for one moment.
 * @param {object} o
 * @param {Record<string, Record<string, string>>} o.vakitler raw prayer-time JSON
 * @param {Date} [o.now]
 * @param {boolean} [o.hijriShift] roll the hijri date forward after maghrib
 */
export function buildPanelSnapshot({ vakitler, now = new Date(), hijriShift = false } = {}) {
  const table = createVakitTable(vakitler, now)
  const current = table ? findVakit(table, now) : null
  const next = table ? nextVakit(table, now) : null
  const aksam = hijriShift ? table?.aksam?.time ?? null : null

  return {
    alaturka: calculateAlaturka(now, vakitler),
    saat: clockTime(now),
    vakit: current ? table[current].name : '',
    sonraki: next?.name ?? '',
    kalan: next
      ? `${String(next.hours).padStart(2, '0')}:${String(next.minutes).padStart(2, '0')}`
      : '',
    hicri: nowHijri('string', now, aksam),
    miladi: `${now.getDate()} ${TR_MONTHS[now.getMonth()]} ${now.getFullYear()}`,
    gun: TR_WEEKDAYS[now.getDay()],
  }
}

/**
 * Builds a format string from the structured settings a panel UI exposes.
 * @param {object} o
 * @param {'alaturka'|'normal'|'both'|'none'} [o.clock]
 * @param {boolean} [o.vakitName]
 * @param {boolean} [o.countdown]
 * @param {'none'|'hijri'|'gregorian'|'both'} [o.date]
 * @param {string} [o.separator]
 */
export function formatFromOptions({
  clock = 'alaturka',
  vakitName = false,
  countdown = false,
  date = 'none',
  separator = ' · ',
} = {}) {
  const parts = []
  if (clock === 'alaturka' || clock === 'both') parts.push('{alaturka}')
  if (clock === 'normal' || clock === 'both') parts.push('{saat}')
  if (vakitName) parts.push('{vakit}')
  if (countdown) parts.push('{sonraki} {kalan}')
  if (date === 'hijri' || date === 'both') parts.push('{hicri}')
  if (date === 'gregorian' || date === 'both') parts.push('{miladi}')
  return parts.join(separator)
}

const KNOWN = new Set(PANEL_TOKENS.map((t) => t.token))

/**
 * Renders a format string against a snapshot.
 *
 * A token with no value is dropped along with the separator next to it, so a
 * missing prayer-time file leaves `{alaturka} · {hicri}` as just the date
 * rather than a line that starts with a stray separator.
 *
 * @param {object} snapshot from `buildPanelSnapshot`
 * @param {string|object} spec a format string, or the options for `formatFromOptions`
 */
export function formatPanelLine(snapshot, spec = '{alaturka}') {
  const format = typeof spec === 'string' ? spec : formatFromOptions(spec)

  const filled = format.replace(/\{(\w+)\}/g, (whole, key) => {
    if (!KNOWN.has(key)) return whole
    return snapshot?.[key] ?? ''
  })

  // Collapse the gaps left by dropped tokens: repeated separators, and a
  // separator at either end.
  return filled
    .replace(/[ \t]+/g, ' ')
    .replace(/(?:^|(?<=\s))([·|/\-–—])(?:\s*\1)+/g, '$1')
    .replace(/^[\s·|/\-–—]+/, '')
    .replace(/[\s·|/\-–—]+$/, '')
    .trim()
}
