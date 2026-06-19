import { useState } from 'react';
import HistoricalMap from '../viz/HistoricalMap';
import { places, events } from '../data/index';
import { formatDate } from '../validation/schema';
import { usePageTitle } from '../hooks/usePageTitle';

function eventsAtPlace(placeId: string) {
  return events.filter(e => e.place_id === placeId);
}

const PLACE_TYPE_LABEL: Record<string, string> = {
  battle_site: 'Battle Site',
  birthplace:  'Birthplace',
  castle:      'Castle',
  cathedral:   'Cathedral',
  palace:      'Palace',
  abbey:       'Abbey',
  town:        'Town',
  region:      'Region',
  country:     'Country',
  other:       'Other',
};

const mappedPlaces = places.filter(p => p.coordinates);

export default function MapPage() {
  usePageTitle('Historical Map');
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const selected = selectedId ? mappedPlaces.find(p => p.id === selectedId) : undefined;
  const selectedEvents = selected ? eventsAtPlace(selected.id) : [];

  return (
    <div className="flex" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* Sidebar */}
      <aside
        className="w-72 flex-shrink-0 flex flex-col overflow-hidden border-r border-gold/10"
        style={{ background: '#0d0b1a' }}
      >
        <div className="px-4 py-3 border-b border-gold/10 flex-shrink-0">
          <h2 className="font-sans text-xs font-bold text-gold/60 uppercase tracking-widest">Places</h2>
          <p className="font-body text-xs text-text-muted mt-0.5">
            {mappedPlaces.length} location{mappedPlaces.length !== 1 ? 's' : ''} mapped
          </p>
        </div>

        <ul className="flex-1 overflow-y-auto divide-y divide-gold/5 min-h-0">
          {mappedPlaces.map(place => {
            const isSelected = place.id === selectedId;
            const pEvents = eventsAtPlace(place.id);
            return (
              <li key={place.id}>
                <button
                  onClick={() => setSelectedId(place.id)}
                  className={[
                    'w-full text-left px-4 py-3 transition-colors',
                    isSelected
                      ? 'bg-gold/10 border-l-2 border-gold pl-3.5'
                      : 'hover:bg-gold/5 border-l-2 border-transparent',
                  ].join(' ')}
                >
                  <p className="font-serif text-sm font-semibold text-text-base leading-tight">{place.name}</p>
                  {place.modern_name && (
                    <p className="font-body text-xs text-text-muted mt-0.5 leading-tight">{place.modern_name}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-sans text-xs text-text-muted">
                      {PLACE_TYPE_LABEL[place.type] ?? place.type}
                    </span>
                    {pEvents.length > 0 && (
                      <span className="font-sans text-xs text-gold">
                        · {pEvents.length} event{pEvents.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {selected && (
          <div className="border-t border-gold/10 bg-surface p-4 flex-shrink-0">
            <h3 className="font-serif text-sm font-bold text-text-base mb-1">{selected.name}</h3>
            <p className="font-sans text-xs text-text-muted mb-2">
              {selected.country} · {PLACE_TYPE_LABEL[selected.type] ?? selected.type}
            </p>
            {selected.summary && (
              <p className="font-body text-xs text-text-muted leading-relaxed mb-3">
                {selected.summary.value.length > 180
                  ? selected.summary.value.slice(0, 180) + '…'
                  : selected.summary.value}
              </p>
            )}
            {selectedEvents.length > 0 && (
              <div>
                <p className="font-sans text-xs font-bold text-gold/50 uppercase tracking-widest mb-1">
                  Events here
                </p>
                {selectedEvents.map(ev => (
                  <div key={ev.id} className="mb-1.5">
                    <p className="font-serif text-xs font-bold text-text-base leading-tight">{ev.title}</p>
                    <p className="font-body text-xs text-text-muted">{formatDate(ev.date.value)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Map canvas */}
      <div className="flex-1 overflow-hidden">
        <HistoricalMap
          places={places}
          events={events}
          selectedPlaceId={selectedId}
          onPlaceSelect={setSelectedId}
        />
      </div>
    </div>
  );
}
