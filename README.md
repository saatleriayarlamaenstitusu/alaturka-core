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

## Status

Empty. The decisions above are settled; no code has been written yet.
