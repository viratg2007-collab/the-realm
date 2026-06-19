import type { CitedValue, HistoricalDate, SourceRef } from './index';

export type Sex = 'M' | 'F' | 'unknown';

export type TitleType =
  | 'King'
  | 'Queen'
  | 'Queen Consort'
  | 'Prince'
  | 'Princess'
  | 'Duke'
  | 'Duchess'
  | 'Earl'
  | 'Countess'
  | 'Baron'
  | 'Baroness'
  | 'Knight'
  | 'Archbishop'
  | 'Bishop'
  | 'Lord'
  | 'Lady'
  | 'Other';

export interface Title {
  type: TitleType;
  name: string;
  /** e.g. "Duke of Clarence" → "Clarence" */
  of?: string;
  /** Regnal number if monarch, e.g. 3 for Edward III */
  regnal_number?: number;
  start?: HistoricalDate;
  end?: HistoricalDate;
  source_ids: SourceRef[];
}

export interface Reign {
  start: CitedValue<HistoricalDate>;
  end?: CitedValue<HistoricalDate>;
  end_reason?: CitedValue<'death' | 'abdication' | 'deposed'>;
  notes?: string;
}

export interface Person {
  /** Slug-style unique identifier, e.g. "lionel-of-antwerp" */
  id: string;
  /** Primary display name */
  name: string;
  /** Alternative names, epithets, or spelling variants */
  also_known_as?: string[];
  sex: Sex;
  /** Reference to a House.id */
  house_id?: string;
  born?: CitedValue<HistoricalDate>;
  died?: CitedValue<HistoricalDate>;
  cause_of_death?: CitedValue<string>;
  titles?: Title[];
  reign?: Reign;
  /**
   * Sourced prose summary in clear neutral language.
   * No invented motivations, no unattributed quotes.
   */
  summary: CitedValue<string>;
  /**
   * Set true if any aspect of this record has not been verified against
   * a reliable source. The UI must render these records differently
   * (e.g. with a warning badge). See CONTRIBUTING-HISTORY.md.
   */
  needs_verification?: boolean;
  /** Source IDs establishing this person's identity at minimum */
  source_ids: SourceRef[];
}
