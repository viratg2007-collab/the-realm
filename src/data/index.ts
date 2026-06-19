import type {
  Person,
  Relationship,
  ParentChildRelationship,
  MarriageRelationship,
  House,
  Event,
  Place,
  Source,
} from '../types';
import type { SuccessionClaim, ThroneConflict } from '../types/succession';

import _people from './people.json';
import _relationships from './relationships.json';
import _houses from './houses.json';
import _events from './events.json';
import _places from './places.json';
import _sources from './sources.json';
import _successionClaims from './succession_claims.json';
import _throneConflicts from './throne_conflicts.json';

export const people = _people as unknown as Person[];
export const relationships = _relationships as unknown as Relationship[];
export const houses = _houses as unknown as House[];
export const events = _events as unknown as Event[];
export const places = _places as unknown as Place[];
export const sources = _sources as unknown as Source[];
export const successionClaims = _successionClaims as unknown as SuccessionClaim[];
export const throneConflicts = _throneConflicts as unknown as ThroneConflict[];

export const personById = new Map(people.map(p => [p.id, p]));
export const houseById = new Map(houses.map(h => [h.id, h]));
export const sourceById = new Map(sources.map(s => [s.id, s]));
export const placeById = new Map(places.map(pl => [pl.id, pl]));

export const parentChildRels = relationships.filter(
  (r): r is ParentChildRelationship => r.type === 'parent_child'
);
export const marriageRels = relationships.filter(
  (r): r is MarriageRelationship => r.type === 'marriage'
);

export function parentsOf(personId: string) {
  return parentChildRels
    .filter(r => r.to_person_id === personId)
    .map(r => ({ person: personById.get(r.from_person_id)!, rel: r }))
    .filter(x => x.person != null);
}

export function childrenOf(personId: string) {
  return parentChildRels
    .filter(r => r.from_person_id === personId)
    .map(r => ({ person: personById.get(r.to_person_id)!, rel: r }))
    .filter(x => x.person != null);
}

export function spousesOf(personId: string): Array<{ person: Person; rel: MarriageRelationship }> {
  return marriageRels
    .filter(r => r.from_person_id === personId || r.to_person_id === personId)
    .map(r => ({
      person: personById.get(
        r.from_person_id === personId ? r.to_person_id : r.from_person_id
      )!,
      rel: r,
    }))
    .filter(x => x.person != null);
}
