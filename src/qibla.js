// Qibla direction: the great-circle bearing from a point to the Kaaba.
//
// The flat-map intuition of "draw a line towards Mecca" is misleading, since
// the shortest path on a sphere is a great-circle arc. From Turkey the qibla
// therefore falls south-southeast rather than southeast (about 151° from
// İstanbul, about 181° from Diyarbakır).
const KAABA = { lat: 21.4224779, lon: 39.8251832 }

const toRad = (d) => (d * Math.PI) / 180
const toDeg = (r) => (r * 180) / Math.PI

/**
 * Bearing to the Kaaba, clockwise from true north (0–360).
 * @param {number} lat
 * @param {number} lon
 */
export function qiblaBearing(lat, lon) {
  const f1 = toRad(lat)
  const f2 = toRad(KAABA.lat)
  const dl = toRad(KAABA.lon - lon)

  const y = Math.sin(dl)
  const x = Math.cos(f1) * Math.tan(f2) - Math.sin(f1) * Math.cos(dl)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/** 151.3 → "151°" */
export const formatBearing = (deg) => `${Math.round(deg)}°`

// Reduced to the eight principal directions; the number alone stays abstract.
const DIRS = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB']
export const compassName = (deg) => DIRS[Math.round((deg % 360) / 45) % 8]
