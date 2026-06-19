# Contributing Historical Content to The Realm

This document defines the sourcing standard that all historical data in this project must meet.
It exists to maintain a single, non-negotiable rule: **no historical claim ships without a
verifiable citation to a reliable source.**

---

## The Non-Negotiable Rule

Every person, date, event, relationship, and place must carry one or more `source_ids` pointing
to entries in `src/data/sources.json`. The build will fail (`npm run validate`) if any entity
lacks sources or references an unknown `source_id`.

This is not optional. If you cannot find a source for something, do not add it. If you suspect
something is correct but cannot verify it, add it with `needs_verification: true` — it will be
displayed with a warning badge in the UI rather than presented as settled fact.

---

## Acceptable Sources

**Highest tier (preferred for all factual claims):**
- Oxford Dictionary of National Biography (ODNB) — the authoritative reference for English biography
- Complete Peerage (Cockayne et al.) — authoritative for English peerage genealogy and dates
- Handbook of British Chronology (Fryde et al., Royal Historical Society) — definitive for regnal dates
- Primary source editions (Rolls Series, Selden Society, Records of Social and Economic History, etc.)
- Royal Historical Society publications
- Peer-reviewed monographs from university presses (Oxford, Cambridge, Yale, Chicago, etc.)

**Second tier (acceptable with care):**
- Reputable institutional websites: The National Archives, British Library, English Heritage,
  Historic England, Royal Collection Trust, Historic Royal Palaces
- Museum scholarly publications
- Peer-reviewed journal articles (English Historical Review, Journal of Medieval History,
  Historical Research, Speculum, etc.)
- Established encyclopaedias (Britannica; Oxford Reference Online entries)

**Unacceptable as primary citations:**
- Wikipedia articles alone (Wikipedia may be used as a starting point to locate underlying
  sources; the citation stored must point to the reliable source, not Wikipedia)
- AI-generated content of any kind
- Unsourced websites, genealogy databases without primary source attribution, or personal blogs
- Secondary popularisations without footnoting
- Anything the contributor cannot personally verify

---

## How Sourcing Works in the Data

Every factual claim uses the `CitedValue<T>` TypeScript wrapper:

```typescript
type SourceRef = { source_id: string; locator?: string };

interface CitedValue<T> {
  value: T;
  source_ids: SourceRef[];     // ← at least one entry required
  disputed?: { ... };          // ← structured alternatives; see Disputed Facts below
  needs_verification?: boolean; // ← true if unverified
}
```

Each `source_ids` entry is a `SourceRef` object, not a bare string:

```json
"born": {
  "value": { "year": 1338, "month": 11, "day": 29 },
  "source_ids": [
    { "source_id": "ODNB-lionel-clarence" },
    { "source_id": "COMPLETE-PEERAGE-CLARENCE", "locator": "vol. 3, pp. 242–245" }
  ]
}
```

The optional `locator` field records exactly where in the source the claim appears
(page range, folio, section number). Include it whenever you can — it makes
fact-checking significantly faster for future contributors.

When you add a date, a summary paragraph, or a title:
1. Wrap it in `CitedValue`
2. Add at least one `SourceRef` from `sources.json`, with a `locator` if available
3. Run `npm run validate` — it will catch missing or broken references

---

## The `needs_verification` Flag

Use `needs_verification: true` on a `CitedValue` when:
- You believe the information is correct but have not yet checked it against a reliable source
- The figure is in the dataset but you only have a secondary reference, not a primary one
- The date or fact is standard in general works but you want a specialist to verify it

The UI renders `needs_verification` items with a distinct warning badge.
The build validator emits a warning (not an error) for these items.
Never leave `needs_verification: true` in a record indefinitely — treat it as a task marker.

---

## Disputed Facts

Where historians genuinely disagree, the `disputed` object records every alternative with
its own sources — never a bare boolean flag:

```json
{
  "value": { "year": 1313, "approximate": true },
  "source_ids": [{ "source_id": "ODNB-philippa-hainault" }],
  "disputed": {
    "alternatives": [
      {
        "value": { "year": 1310, "approximate": true },
        "source_ids": [{ "source_id": "ODNB-philippa-hainault" }],
        "note": "Some calculations based on betrothal age suggest c. 1310."
      },
      {
        "value": { "year": 1315, "approximate": true },
        "source_ids": [{ "source_id": "ODNB-philippa-hainault" }],
        "note": "Other interpretations of the same evidence place her birth as late as c. 1315."
      }
    ],
    "consensus_note": "The ODNB (Bothwell) gives 1310x15 as the accepted range."
  }
}
```

Rules:
- `value` at the top level should be the most defensible current reading (usually the ODNB position)
- Every alternative must have its own `source_ids` — never an unsourced counter-claim
- `consensus_note` records what modern scholarship says, if a consensus exists
- The UI renders all alternatives, not just the primary value

In `SuccessionClaim.contested_questions`, present every scholarly position with its own
`source_ids`. **Do not pick one and state it as fact.**

Examples of genuinely disputed questions that must be handled this way:
- The fate of the Princes in the Tower (Richard III vs. other actors)
- Whether Philippa of Hainault's birth year was 1310, 1313, or 1315
- The exact basis and enforceability of the 1399 Lancastrian claim
- Whether the Tripartite Indenture (1405) was ever formally concluded
- The Yorkist vs. Lancastrian claim to genealogical seniority

---

## Date Conventions

Use the `HistoricalDate` type:

```typescript
interface HistoricalDate {
  year: number;         // always required
  month?: number;       // 1–12
  day?: number;         // 1–31
  approximate?: boolean; // renders as "c. 1332"
  date_range?: { earliest: number; latest: number }; // "c. 1310–1315"
  notes?: string;       // scholarly note on the date
}
```

Rules:
- Never invent a precise date. If only the year is certain, omit month and day.
- If the year itself is uncertain, use `approximate: true` and/or `date_range`.
- Medieval dates before the Gregorian calendar reform (1582) are Old Style unless noted.
- If a secondary source gives a precise date but you cannot trace it to a primary source,
  set `needs_verification: true` on that `CitedValue`.
- Use the `notes` field to record caveats (e.g. "date given by Froissart; disputed by x").

---

## Adding a Person — Checklist

1. **Check the ODNB first.** Most figures of any significance have an entry.
   Copy the ODNB author's name and article title exactly.
2. **For peers**, check the Complete Peerage.
3. **For dates**, cross-reference with Fryde's Handbook of British Chronology.
4. **Write the summary in neutral prose.** No invented motivations, no unattributed
   quotes, no dramatic embellishment.
5. **Add the source entry to `sources.json`** if it is not already there.
6. **Add `parent_child` relationships** with `legitimacy` and `line` fields filled.
7. **Run `npm run validate`** — fix all errors before committing.

---

## Adding a Source — Required Fields

```json
{
  "id": "ACRONYM-subject",
  "type": "book | journal_article | primary_source | institutional | reference_work | edited_volume",
  "title": "Full title of the work",
  "author": "Surname, Forename",
  "publisher": "Publisher name",
  "place_of_publication": "City",
  "year": 1974
}
```

For online sources, also add:
```json
  "url": "https://...",
  "accessed": "YYYY-MM-DD"
```

Source IDs follow the convention `ACRONYM-subject`, e.g.:
- `ODNB-richard-iii` — ODNB article on Richard III
- `COMPLETE-PEERAGE-YORK` — Complete Peerage entry for the dukes of York
- `ROSS-EDWARD-IV` — Ross's monograph on Edward IV
- `NATIONAL-ARCHIVES-PATENT-ROLLS` — TNA patent rolls reference

---

## Genealogy Rules (Critical)

**Parent-child edges are directed: `from_person_id` is always the PARENT, `to_person_id` is always the CHILD. Never reverse this.**

Every `parent_child` relationship must specify both fields — they are required, not optional:

- `line`: `"male"` if the parent is the father (patrilineal step); `"female"` if the parent is the mother (matrilineal step)
- `legitimacy`: one of:
  - `"legitimate"` — born within a lawful marriage recognised by the Church
  - `"legitimated"` — born outside marriage but subsequently legitimated by act of Parliament,
    papal bull, or royal letters patent (e.g. the Beaufort children, legitimated 1397)
  - `"illegitimate"` — born outside marriage and never formally legitimated

Example: Lionel of Antwerp is the father of Philippa of Clarence. The edge is:

```json
{
  "type": "parent_child",
  "from_person_id": "lionel-of-antwerp",
  "to_person_id": "philippa-of-clarence",
  "line": "male",
  "legitimacy": "legitimate",
  "source_ids": [
    { "source_id": "ODNB-lionel-clarence" },
    { "source_id": "COMPLETE-PEERAGE-CLARENCE", "locator": "vol. 3, pp. 242–245" }
  ]
}
```

This `line` field is required for succession calculations. The Wars of the Roses
turned on whether female-line descent through Lionel of Antwerp (Yorkist claim)
outranked male-line descent from John of Gaunt (Lancastrian claim). Getting this
field wrong produces historically wrong succession results.

**Never compute genealogical relationships as shortest undirected path.** That
approach cannot distinguish between "X is descended from Y" and "X and Y share
an ancestor." All genealogy logic must traverse directed parent→child edges only.
