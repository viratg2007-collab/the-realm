import type { CitedValue, HistoricalDate, SourceRef } from './index';

export type GeneaRight = 'stronger' | 'weaker' | 'disputed';
export type ConflictOutcome = 'challenger_prevailed' | 'defender_prevailed' | 'compromise';

export interface ConflictSide {
  person_id: string;
  /** Short contextual role, e.g. "Reigning King", "Lord Protector", "Duke of Normandy" */
  role: string;
  /** 1–2 sentence summary of this side's claim basis */
  claim_summary: string;
  /** Strength of this side's genealogical / legal right */
  genealogical_right: GeneaRight;
}

export interface ThroneConflict {
  id: string;
  title: string;
  year_start: number;
  year_end?: number;
  /** What triggered the confrontation and what was at stake */
  why_fought: string;
  /** Note on a complicating third-party claim or historical irony */
  note?: string;
  defender: ConflictSide;
  challenger: ConflictSide;
  outcome: ConflictOutcome;
  /** One sentence on how it ended */
  outcome_description: string;
  /** Link to a SuccessionClaim entry for deeper interactive analysis */
  succession_claim_id?: string;
  source_ids: string[];
}

export interface ClaimBasis {
  /** Sourced statement of the legal or dynastic basis of the claim */
  description: CitedValue<string>;
  /** Prose tracing the line of descent step by step */
  line_of_descent?: string;
  /** How contemporary actors and writers argued this claim */
  contemporary_argument?: CitedValue<string>;
}

export interface ContestedQuestion {
  /** The specific question on which historians or contemporaries disagree */
  question: string;
  /**
   * One entry per scholarly position. Must include sources on EACH side.
   * Never pick one and state it as fact.
   */
  positions: Array<{
    position: string;
    source_ids: SourceRef[];
  }>;
}

export interface Claimant {
  person_id: string;
  claim_basis: ClaimBasis;
  succeeded: boolean;
  /** Maps assumption id → how toggling that assumption ON affects this claimant */
  assumption_effects?: Record<string, 'strengthens' | 'weakens'>;
}

export interface SuccessionClaim {
  /** Slug-style unique identifier, e.g. "succession-1399" */
  id: string;
  /** Display title, e.g. "The Succession Crisis of 1399" */
  title: string;
  year: CitedValue<HistoricalDate>;
  /** What throne or title was at stake */
  throne: string;
  description: CitedValue<string>;
  claimants: Claimant[];
  contested_questions: ContestedQuestion[];
  /**
   * Toggleable assumptions for the Claim Explorer UI.
   * Each assumption, if toggled, can change which claimant is "rightful".
   * Examples: "Does female-line descent count for the English crown?",
   * "Does conquest legitimise a claim?"
   */
  assumptions: Array<{
    id: string;
    label: string;
    description: string;
    default_value: boolean;
  }>;
  source_ids: string[];
}
