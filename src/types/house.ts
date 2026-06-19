import type { CitedValue, HistoricalDate, SourceRef } from './index';

export interface House {
  /** Slug-style unique identifier, e.g. "plantagenet" */
  id: string;
  name: string;
  /** Hex colour for UI visualisation, e.g. "#8B1A1A" */
  color: string;
  period_start: HistoricalDate;
  period_end?: HistoricalDate;
  summary: CitedValue<string>;
  source_ids: SourceRef[];
}
