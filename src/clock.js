// The alaturka clock: time elapsed since the last evening (maghrib) adhan.
//
// This module is deliberately free of any date library. The web app used Luxon
// here, but the core has to run inside GJS and a future native shell as well,
// so everything is plain `Date` arithmetic.

/** Local calendar day as `YYYY-MM-DD`. */
export function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** `YYYY-MM-DD` + `HH:MM` → a local Date. */
export function atTime(iso, hhmm) {
  const [y, m, d] = iso.split('-').map(Number)
  const [h, min] = hhmm.split(':').map(Number)
  return new Date(y, m - 1, d, h, min, 0, 0)
}

/** Milliseconds → `HH:MM`, hours not wrapped at 12 or 24. */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * The alaturka time at `now`: how long since the most recent maghrib.
 * Before today's maghrib the reference is yesterday's.
 * @param {Date} now
 * @param {Record<string, Record<string, string>>} vakitler raw prayer-time JSON
 * @returns {string} `HH:MM`, or `--:--` when the needed days are missing
 */
export function calculateAlaturka(now, vakitler) {
  if (!vakitler) return '--:--'

  const todayISO = isoDate(now)
  const yesterdayISO = isoDate(new Date(now.getTime() - 86400000))

  const todayAksam = vakitler[todayISO]?.aksam
  const yesterdayAksam = vakitler[yesterdayISO]?.aksam
  if (!todayAksam || !yesterdayAksam) return '--:--'

  const aksam = atTime(todayISO, todayAksam)
  if (now < aksam) return formatDuration(now - atTime(yesterdayISO, yesterdayAksam))
  return formatDuration(now - aksam)
}
