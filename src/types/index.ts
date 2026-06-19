/**
 * Shared primitive types used across all entity types.
 */

/**
 * A reference to a Source.id, with an optional page/folio locator.
 * Use `locator` to record exactly where in the source the claim appears.
 * Examples: { source_id: "MCKISACK-14C", locator: "pp. 142–3" }
 *           { source_id: "ODNB-lionel-clarence" }
 */
export type SourceRef = { source_id: string; locator?: string };

/**
 * A value that must be backed by at least one source.
 * Every factual claim in the data layer must be wrapped in this type.
 */
export interface CitedValue<T> {
  value: T;
  /** Must contain at least one SourceRef. Include a locator when you can. */
  source_ids: SourceRef[];
  /**
   * Present when historians or primary sources disagree.
   * Each alternative carries its own competing value AND its own source_ids —
   * never a bare boolean flag. The UI must render all alternatives, not just
   * the primary `value`. `value` should be the most defensible current reading
   * (e.g. the ODNB position); alternatives capture what other sources say.
   */
  disputed?: {
    alternatives: Array<{
      value: T;
      source_ids: SourceRef[];
      /** Short note explaining this particular position */
      note?: string;
    }>;
    /** What modern scholarly consensus says, if one exists */
    consensus_note?: string;
  };
  /**
   * Set true when this value has not yet been verified against a reliable
   * source. The build validator will WARN (not fail) on these, but the UI
   * must render them with a visible "needs verification" badge.
   */
  needs_verification?: boolean;
}

/**
 * A historical date. Only `year` is required.
 * Use `approximate: true` and/or `date_range` when the exact date is unknown.
 */
export interface HistoricalDate {
  year: number;
  /** 1–12 */
  month?: number;
  /** 1–31 */
  day?: number;
  /** true → render as "c. YEAR" */
  approximate?: boolean;
  /** Use when only a range is known, e.g. { earliest: 1310, latest: 1315 } */
  date_range?: {
    earliest: number;
    latest: number;
  };
  /** Any additional scholarly note on the date */
  notes?: string;
}

export type { Source, SourceType } from './source';
export type { Person, Sex, Title, TitleType, Reign } from './person';
export type {
  Relationship,
  RelationshipType,
  ParentChildRelationship,
  MarriageRelationship,
  BetrothalRelationship,
} from './relationship';
export type { Event, EventType, EventTheme, PersonRole } from './event';
export type { Place, PlaceType, PlaceCountry, Coordinates } from './place';
export type { House } from './house';
export type {
  SuccessionClaim,
  Claimant,
  ContestedQuestion,
  ClaimBasis,
} from './succession';
