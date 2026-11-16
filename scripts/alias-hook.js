// Node resolver hook that understands the website's `@/` alias, so the
// original modules can be imported for fixture generation without touching
// them. Vite resolves `@/` to the site's `src/`; this does the same, and adds
// the `.js` extension Vite allows to be left off.
import { resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'

let base = ''
export async function initialize(data) { base = data.base }

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    let rel = specifier.slice(2)
    if (!/\.[a-z]+$/.test(rel)) rel += '.js'
    return next(pathToFileURL(resolvePath(base, rel)).href, context)
  }
  return next(specifier, context)
}
