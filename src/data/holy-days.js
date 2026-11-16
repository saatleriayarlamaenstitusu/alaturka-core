// GENERATED from data/holy-days.json by scripts/mirror-data.js — do not edit.
// The JSON file is canonical; run `npm run mirror` after changing it.
export default {
  "comment": [
    "Religious days and nights, expressed as rules over the hijri calendar rather than a list of dates.",
    "A hijri day begins at sunset, so 'the 27th night of Recep' starts on the evening of the 26th and belongs to the 27th. Kandils are therefore marked on the hijri day BEFORE the day they are named after, which is also how Diyanet publishes their Gregorian dates.",
    "Weekday numbers follow JavaScript's getDay(): Sunday 0 … Thursday 4.",
    "{n} in a template is the ordinal within a range; {year} is the hijri year."
  ],
  "kinds": {
    "kandil": "Kandil",
    "bayram": "Bayram",
    "arefe": "Arefe",
    "gun": "Dinî gün"
  },
  "rules": [
    {
      "id": "regaip",
      "name": "Regaip Kandili",
      "kind": "kandil",
      "night": true,
      "note": "Recep ayının ilk cuma gecesi",
      "when": {
        "type": "firstWeekdayOfMonth",
        "month": 7,
        "weekday": 4
      }
    },
    {
      "id": "mirac",
      "name": "Miraç Kandili",
      "kind": "kandil",
      "night": true,
      "note": "Recep ayının 27. gecesi",
      "when": {
        "type": "monthDay",
        "month": 7,
        "day": 26
      }
    },
    {
      "id": "berat",
      "name": "Berat Kandili",
      "kind": "kandil",
      "night": true,
      "note": "Şaban ayının 15. gecesi",
      "when": {
        "type": "monthDay",
        "month": 8,
        "day": 14
      }
    },
    {
      "id": "kadir",
      "name": "Kadir Gecesi",
      "kind": "kandil",
      "night": true,
      "note": "Ramazan'ın 27. gecesi",
      "sourceNote": "Kadir Gecesi is known to be hidden in the last ten days of Ramadan; the 27th night is the one widely observed. This is recorded as common acceptance, not as a determination.",
      "when": {
        "type": "monthDay",
        "month": 9,
        "day": 26
      }
    },
    {
      "id": "mevlid",
      "name": "Mevlid Kandili",
      "kind": "kandil",
      "night": true,
      "note": "Rebiülevvel ayının 12. gecesi",
      "when": {
        "type": "monthDay",
        "month": 3,
        "day": 11
      }
    },
    {
      "id": "ramazan-arefe",
      "name": "Ramazan Bayramı Arefesi",
      "kind": "arefe",
      "night": false,
      "when": {
        "type": "lastDayOfMonth",
        "month": 9
      }
    },
    {
      "id": "ramazan-bayram",
      "nameTemplate": "Ramazan Bayramı {n}. gün",
      "kind": "bayram",
      "night": false,
      "when": {
        "type": "monthDayRange",
        "month": 10,
        "from": 1,
        "to": 3
      }
    },
    {
      "id": "kurban-arefe",
      "name": "Kurban Bayramı Arefesi",
      "kind": "arefe",
      "night": false,
      "note": "Arefe günü",
      "when": {
        "type": "monthDay",
        "month": 12,
        "day": 9
      }
    },
    {
      "id": "kurban-bayram",
      "nameTemplate": "Kurban Bayramı {n}. gün",
      "kind": "bayram",
      "night": false,
      "when": {
        "type": "monthDayRange",
        "month": 12,
        "from": 10,
        "to": 13
      }
    },
    {
      "id": "hicri-yilbasi",
      "name": "Hicri Yılbaşı",
      "kind": "gun",
      "night": false,
      "noteTemplate": "{year} yılı başlangıcı",
      "when": {
        "type": "monthDay",
        "month": 1,
        "day": 1
      }
    },
    {
      "id": "asure",
      "name": "Aşure Günü",
      "kind": "gun",
      "night": false,
      "note": "Muharrem ayının 10. günü",
      "when": {
        "type": "monthDay",
        "month": 1,
        "day": 10
      }
    }
  ]
}
