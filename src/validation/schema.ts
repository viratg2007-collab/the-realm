import type { CitedValue, HistoricalDate, SourceRef } from '../types';

/** Returns true if a CitedValue has at least one source */
export function isSourced<T>(v: CitedValue<T>): boolean {
  return Array.isArray(v.source_ids) && v.source_ids.length > 0;
}

/** Returns true if a CitedValue has recorded alternatives */
export function isDisputed<T>(v: CitedValue<T>): boolean {
  return v.disputed !== undefined && v.disputed.alternatives.length > 0;
}

/** Return all alternative values for a disputed CitedValue, or [] if not disputed */
export function getAlternatives<T>(
  v: CitedValue<T>
): Array<{ value: T; source_ids: SourceRef[]; note?: string }> {
  return v.disputed?.alternatives ?? [];
}

/** Extract all source_id strings from a SourceRef array (for display or lookup) */
export function sourceIdStrings(refs: SourceRef[]): string[] {
  return refs.map((r) => r.source_id);
}

/** Returns true if a CitedValue needs further verification */
export function needsVerification<T>(v: CitedValue<T>): boolean {
  return v.needs_verification === true;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Format a HistoricalDate for display */
export function formatDate(d: HistoricalDate): string {
  if (d.date_range && d.approximate) {
    return `c. ${d.date_range.earliest}–${d.date_range.latest}`;
  }
  if (d.date_range) {
    return `${d.date_range.earliest}–${d.date_range.latest}`;
  }
  const prefix = d.approximate ? 'c. ' : '';
  if (d.day !== undefined && d.month !== undefined) {
    return `${prefix}${d.day} ${MONTH_NAMES[d.month - 1]} ${d.year}`;
  }
  if (d.month !== undefined) {
    return `${prefix}${MONTH_NAMES[d.month - 1]} ${d.year}`;
  }
  return `${prefix}${d.year}`;
}

/** Return just the year as a number, using earliest if a range */
export function dateYear(d: HistoricalDate): number {
  if (d.date_range) return d.date_range.earliest;
  return d.year;
}
