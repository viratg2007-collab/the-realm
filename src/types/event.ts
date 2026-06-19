import type { CitedValue, HistoricalDate, SourceRef } from './index';

export type EventType =
  | 'battle'
  | 'treaty'
  | 'coronation'
  | 'rebellion'
  | 'death'
  | 'birth'
  | 'marriage'
  | 'cultural'
  | 'religious'
  | 'political'
  | 'succession'
  | 'legislation'
  | 'other';

export type EventTheme =
  | 'monarchy'
  | 'religion'
  | 'conflict'
  | 'society'
  | 'culture'
  | 'law'
  | 'diplomacy';

export interface PersonRole {
  person_id: string;
  role: string;
  source_ids: SourceRef[];
}

export interface Event {
  /** Slug-style unique identifier, e.g. "battle-of-bosworth-1485" */
  id: string;
  title: string;
  type: EventType;
  themes: EventTheme[];
  date: CitedValue<HistoricalDate>;
  /** For events spanning a period, e.g. the Hundred Years War */
  date_end?: CitedValue<HistoricalDate>;
  /** Reference to a Place.id */
  place_id?: string;
  people_involved?: PersonRole[];
  summary: CitedValue<string>;
  source_ids: SourceRef[];
  needs_verification?: boolean;
}
