# alaturka-core

Shared core for Alaturka Vakitler — the Turkish alaturka clock, prayer times
and hijri calendar project. The website, the Linux desktop app, the Cinnamon
applet and (eventually) the mobile app all read from here.

The split into two layers is deliberate.

## `data/` — language-neutral data

Plain JSON. Nothing about it is tied to a language or a package manager:
vendor this directory as a submodule and read the files directly.

| File | Contents |
|---|---|
| `hijri-months.json` | The Gregorian date each hijri month begins on, covering 2022-07 → 2036-05. Rows taken straight from Diyanet are flagged; the rest were generated from Umm al-Qura and reconciled against Diyanet's 49 published month starts, where 5 differed and were replaced with Diyanet's value. |
| `city-coords.json` | Province centres for all 81 plates, used for qibla bearing. |
| `holy-days.json` | Declarative rule definitions for kandils, eids, arefe and Aşure. |

This is the part that was assembled by hand against Diyanet's published
calendar, and it is the one thing that must never be copied into another
repository.

Conversion is table-based on purpose. Arithmetic (tabular) hijri libraries
apply a fixed rule, while Diyanet uses a calculated calendar: 9 of the 12
month starts in 2026 disagreed, and the drift reached 2 days in Ramadan.
No constant correction factor fixes that, which is why the table exists.

## `src/` — rules (JS/TS)

Roughly 400 lines: hijri conversion, holy-day rules, qibla bearing, the
alaturka clock calculation, and the panel-line formatter. Published as an
npm package. The Vue site, the GJS desktop app and a Capacitor-based mobile
app can all import it unchanged.

### Panel-line formatter

The desktop tray label, the Cinnamon applet and the site's widgets expose
the same options: which clock (alaturka / civil / both), countdown to the
next prayer, date (none / hijri / Gregorian / both), prayer name, plus
ordering and separators through a format string such as
`{alaturka} · {hijri}`.

Because three different shells render the same string, the formatter lives
here rather than in any of them.

## `fixtures/` — golden reference

If the rule layer ever gets ported to another language — native mobile,
Vala, Rust — a second copy becomes unavoidable. A copy is not dangerous in
itself; a *silent* copy is. This directory holds the hijri equivalent of
every day from 2022 to 2036 together with the holy days falling on it, as
JSON, so any port can be run against it in CI and proven correct instead of
trusted.

## Layout

```
data/        canonical JSON — read it from any language
src/         the rule layer (plain ESM, no dependencies)
src/data/    generated mirrors of data/*.json
fixtures/    golden reference, generated from the website
scripts/     extraction, mirroring, fixture generation
test/        replays the fixtures against src/
```

## Usage

```js
import { toHijri, holyDaysOn, calculateAlaturka, formatPanelLine, buildPanelSnapshot }
  from '@alaturkavakitler/core'
```

Non-JavaScript consumers read `data/*.json` directly — vendoring this
repository as a submodule is enough, there is nothing to build.

### Why `src/data/` exists

`data/*.json` is canonical, but JSON import attributes are not available in
every runtime the core must work in — GJS, which the desktop app uses, among
them. The JS layer therefore imports generated mirrors. `npm test` asserts the
two are identical, which is what keeps the copy honest.

## Scripts

| Command | What it does |
|---|---|
| `npm run extract` | Rebuilds `data/*.json` from the website's modules. The tables are never retyped: the script imports the originals and dumps what they export, reading the `// Diyanet` provenance comments out of the source text. |
| `npm run mirror` | Regenerates `src/data/*.js` from `data/*.json`. |
| `npm run fixtures` | Rebuilds the golden reference from the website's implementation. Needs the site checked out alongside with its `node_modules`, since Luxon is imported from there. |
| `npm test` | Replays the fixtures against `src/`, plus unit tests for the parts with no counterpart on the website. |

Everything that touches local calendar days is pinned to `TZ=Europe/Istanbul`:
a fixture generated in another zone would encode different answers, so the
scripts refuse to run outside it.

## Status

The rule layer is complete and verified against the website:

- 6,574 days of hijri conversion, 2021–2038, identical date for date. The
  range overruns the table at both ends on purpose, so the out-of-table
  estimate is pinned down as well (1,524 of those days).
- Religious days compared across the whole range in both directions — a rule
  that fires on a day it should not is as much a failure as one that does not
  fire.
- 2,254 alaturka readings sampled every 23 minutes over real Ankara prayer
  times, matching the Luxon implementation exactly. Luxon is no longer a
  dependency of anything here.

Not yet done: the website still carries its own copy of this logic and has to
be switched over to the package, and the core has only been exercised under
Node. It is written to run unchanged in a browser and in GJS, but that has not
been measured yet.
