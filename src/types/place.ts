import type { CitedValue, SourceRef } from './index';

export type PlaceType =
  | 'battle_site'
  | 'birthplace'
  | 'castle'
  | 'cathedral'
  | 'palace'
  | 'abbey'
  | 'town'
  | 'region'
  | 'country'
  | 'other';

export type PlaceCountry =
  | 'England'
  | 'Scotland'
  | 'Wales'
  | 'Ireland'
  | 'France'
  | 'Flanders'
  | 'Holy Roman Empire'
  | 'Other';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Place {
  /** Slug-style unique identifier, e.g. "tower-of-london" */
  id: string;
  /** Name as used in the historical period */
  name: string;
  /** Modern name and location for the map tooltip */
  modern_name?: string;
  country: PlaceCountry;
  type: PlaceType;
  /** WGS 84 decimal degrees for Leaflet */
  coordinates?: Coordinates;
  summary?: CitedValue<string>;
  source_ids: SourceRef[];
  needs_verification?: boolean;
}
