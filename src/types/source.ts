/**
 * A citable source entry. Every historical claim in the dataset must reference
 * one or more Source IDs from sources.json. See CONTRIBUTING-HISTORY.md for
 * the full sourcing standard.
 */
export type SourceType =
  | 'book'
  | 'journal_article'
  | 'primary_source'
  | 'institutional'
  | 'reference_work'
  | 'edited_volume';

export interface Source {
  /** Unique identifier. Convention: ACRONYM-subject, e.g. "ODNB-lionel-clarence" */
  id: string;
  type: SourceType;
  title: string;
  /** For journal articles and book chapters, the article/chapter title */
  article_title?: string;
  author?: string | string[];
  editor?: string | string[];
  publisher?: string;
  place_of_publication?: string;
  /** Year of the specific edition cited */
  year?: number;
  /** For journal articles */
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  /** For online resources */
  url?: string;
  /** ISO date of last access for online sources, e.g. "2024-01-15" */
  accessed?: string;
  doi?: string;
  isbn?: string;
  /** For ODNB and similar works — the specific article or entry cited */
  entry?: string;
  notes?: string;
}
