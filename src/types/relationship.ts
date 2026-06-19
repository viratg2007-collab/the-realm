import type { CitedValue, HistoricalDate, SourceRef } from './index';

export type RelationshipType = 'parent_child' | 'marriage' | 'betrothal';

interface BaseRelationship {
  id: string;
  /** The parent (parent_child) or first spouse (marriage/betrothal) */
  from_person_id: string;
  /** The child (parent_child) or second spouse (marriage/betrothal) */
  to_person_id: string;
  source_ids: SourceRef[];
  needs_verification?: boolean;
  notes?: string;
}

/**
 * A directed parent → child edge. `from_person_id` is ALWAYS the parent.
 * Never reversed.
 *
 * `line` and `legitimacy` are required (not optional) on parent_child edges.
 * TypeScript enforces this via the discriminated union; the validator enforces
 * it at build time so malformed records fail before they can reach the UI.
 */
export interface ParentChildRelationship extends BaseRelationship {
  type: 'parent_child';
  /**
   * 'male'   → from_person_id is the father; descent is patrilineal for this step.
   * 'female' → from_person_id is the mother; descent is matrilineal for this step.
   *
   * Required because the male/female distinction is the entire basis of the
   * Wars of the Roses succession dispute: the Yorkist claim ran through Lionel
   * of Antwerp via his daughter (female line); the Lancastrian claim ran through
   * John of Gaunt in the male line. Getting this wrong produces wrong results.
   */
  line: 'male' | 'female';
  /**
   * 'legitimate'  — born within a lawful marriage recognised by the Church.
   * 'legitimated' — born outside lawful marriage but subsequently legitimated
   *                 by an act of Parliament, papal bull, or royal letters patent.
   *                 Example: the Beaufort children of John of Gaunt and Katherine
   *                 Swynford, legitimated by Parliament in 1397 (confirmed 1407),
   *                 but with a clause in Henry IV's letters patent excluding them
   *                 from the succession — a clause whose legal force was itself
   *                 disputed in the fifteenth century.
   * 'illegitimate' — born outside lawful marriage and never formally legitimated.
   */
  legitimacy: 'legitimate' | 'legitimated' | 'illegitimate';
}

export interface MarriageRelationship extends BaseRelationship {
  type: 'marriage';
  married?: CitedValue<HistoricalDate>;
  marriage_ended?: CitedValue<HistoricalDate>;
  marriage_end_reason?: CitedValue<'death_of_spouse' | 'annulment' | 'divorce'>;
}

export interface BetrothalRelationship extends BaseRelationship {
  type: 'betrothal';
  betrothed?: CitedValue<HistoricalDate>;
  betrothal_broken?: CitedValue<HistoricalDate>;
  betrothal_end_reason?: CitedValue<'proceeded_to_marriage' | 'broken' | 'death'>;
}

/**
 * Discriminated union — TypeScript uses `type` to narrow to the correct variant,
 * enforcing that `line` and `legitimacy` are present on parent_child edges and
 * absent (or irrelevant) on marriage/betrothal edges.
 */
export type Relationship =
  | ParentChildRelationship
  | MarriageRelationship
  | BetrothalRelationship;
