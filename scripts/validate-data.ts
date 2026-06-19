/**
 * Build-time data validation script.
 * Run via: npm run validate (or npx tsx scripts/validate-data.ts)
 *
 * Rules:
 *   HARD FAIL (exit 1):
 *     - Any entity with no source_ids
 *     - Any entity referencing a source_id not in sources.json
 *     - Any relationship referencing a person_id not in people.json
 *     - Any event referencing a place_id not in places.json
 *     - Any CitedValue with an empty source_ids array
 *     - Any parent_child relationship missing "line" or "legitimacy"
 *
 *   WARN (exit 0 with warning):
 *     - Any entity or CitedValue with needs_verification: true
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

function load<T>(file: string): T {
  const raw = readFileSync(resolve(ROOT, 'src', 'data', file), 'utf-8');
  return JSON.parse(raw) as T;
}

interface SourceRef {
  source_id: string;
  locator?: string;
}

interface BaseEntity {
  id: string;
  source_ids: SourceRef[];
  needs_verification?: boolean;
}

const sources = load<Array<{ id: string }>>('sources.json');
const sourceIds = new Set(sources.map((s) => s.id));

const people = load<BaseEntity[]>('people.json');
const relationships = load<Array<BaseEntity & { type?: string; from_person_id: string; to_person_id: string; line?: string; legitimacy?: string }>>('relationships.json');
const events = load<Array<BaseEntity & { place_id?: string }>>('events.json');
const places = load<BaseEntity[]>('places.json');
const houses = load<BaseEntity[]>('houses.json');

let errors = 0;
let warnings = 0;

function err(msg: string): void {
  console.error(`  [ERROR] ${msg}`);
  errors++;
}

function warn(msg: string): void {
  console.warn(`  [WARN]  ${msg}`);
  warnings++;
}

function validateSourceRefs(refs: unknown, path: string): void {
  if (!Array.isArray(refs) || refs.length === 0) {
    err(`${path} — source_ids is empty or missing`);
    return;
  }
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i] as SourceRef;
    if (typeof ref !== 'object' || ref === null || typeof ref.source_id !== 'string') {
      err(`${path}[${i}] — SourceRef must be { source_id: string; locator?: string }`);
      continue;
    }
    if (!sourceIds.has(ref.source_id)) {
      err(`${path}[${i}] — unknown source_id "${ref.source_id}"`);
    }
  }
}

function checkTopLevel(entity: BaseEntity, collection: string): void {
  validateSourceRefs(entity.source_ids, `${collection}/${entity.id}.source_ids`);
  if (entity.needs_verification) {
    warn(`${collection}/${entity.id} — flagged needs_verification=true`);
  }
}

/** Recursively check any CitedValue objects nested inside an entity */
function checkCitedValues(obj: unknown, path: string): void {
  if (obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => checkCitedValues(item, `${path}[${i}]`));
    return;
  }
  const record = obj as Record<string, unknown>;

  // Detect a CitedValue: has both 'value' and 'source_ids' keys
  if ('value' in record && 'source_ids' in record) {
    const nv = record['needs_verification'] as boolean | undefined;

    validateSourceRefs(record['source_ids'], `${path}.source_ids`);

    // Check disputed.alternatives — each must have value + non-empty source_ids
    const disputed = record['disputed'] as
      | { alternatives?: Array<{ value: unknown; source_ids?: unknown; note?: string }>; consensus_note?: string }
      | undefined;
    if (disputed !== undefined) {
      if (!disputed.alternatives || disputed.alternatives.length === 0) {
        err(`${path}.disputed — present but has no alternatives`);
      } else {
        disputed.alternatives.forEach((alt, i) => {
          validateSourceRefs(alt.source_ids, `${path}.disputed.alternatives[${i}].source_ids`);
        });
      }
    }

    if (nv === true) {
      warn(`${path} — CitedValue flagged needs_verification=true`);
    }
  }

  // Recurse into all values, skipping leaf keys that are not nested objects
  for (const [key, val] of Object.entries(record)) {
    if (key !== 'source_ids' && key !== 'value') {
      checkCitedValues(val, `${path}.${key}`);
    }
  }
}

console.log('\n── The Realm: Data Validation ──────────────────────────────────\n');

console.log(`Checking sources.json (${sources.length} entries)…`);
// Source IDs must be unique
const seenSourceIds = new Set<string>();
for (const s of sources) {
  if (seenSourceIds.has(s.id)) err(`sources — duplicate id "${s.id}"`);
  seenSourceIds.add(s.id);
}

console.log(`Checking houses.json (${houses.length} entries)…`);
for (const h of houses) {
  checkTopLevel(h, 'houses');
  checkCitedValues(h, `houses/${h.id}`);
}

console.log(`Checking people.json (${people.length} entries)…`);
const personIds = new Set(people.map((p) => p.id));
for (const p of people) {
  checkTopLevel(p, 'people');
  checkCitedValues(p, `people/${p.id}`);
  const personFull = p as BaseEntity & { house_id?: string };
  if (personFull.house_id) {
    const houseIds = new Set(houses.map((h) => h.id));
    if (!houseIds.has(personFull.house_id)) {
      err(`people/${p.id} — unknown house_id "${personFull.house_id}"`);
    }
  }
}

console.log(`Checking relationships.json (${relationships.length} entries)…`);
for (const r of relationships) {
  checkTopLevel(r, 'relationships');
  checkCitedValues(r, `relationships/${r.id}`);
  if (!personIds.has(r.from_person_id)) {
    err(`relationships/${r.id} — from_person_id "${r.from_person_id}" not in people`);
  }
  if (!personIds.has(r.to_person_id)) {
    err(`relationships/${r.id} — to_person_id "${r.to_person_id}" not in people`);
  }
  if (r.type === 'parent_child') {
    if (!r.line || !['male', 'female'].includes(r.line)) {
      err(`relationships/${r.id} — parent_child missing valid "line" ('male'|'female')`);
    }
    if (!r.legitimacy || !['legitimate', 'legitimated', 'illegitimate'].includes(r.legitimacy)) {
      err(`relationships/${r.id} — parent_child missing valid "legitimacy" ('legitimate'|'legitimated'|'illegitimate')`);
    }
  }
}

console.log(`Checking events.json (${events.length} entries)…`);
const placeIds = new Set(places.map((pl) => pl.id));
for (const e of events) {
  checkTopLevel(e, 'events');
  checkCitedValues(e, `events/${e.id}`);
  if (e.place_id && !placeIds.has(e.place_id)) {
    err(`events/${e.id} — place_id "${e.place_id}" not in places`);
  }
}

console.log(`Checking places.json (${places.length} entries)…`);
for (const pl of places) {
  checkTopLevel(pl, 'places');
  checkCitedValues(pl, `places/${pl.id}`);
}

console.log(`\n────────────────────────────────────────────────────────────────`);
console.log(`Result: ${errors} error(s), ${warnings} warning(s)`);

if (errors > 0) {
  console.error('\nBuild ABORTED: fix all errors before proceeding.\n');
  process.exit(1);
} else {
  console.log('\nAll data valid ✓ — proceeding with build.\n');
}
