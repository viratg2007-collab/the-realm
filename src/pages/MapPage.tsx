import { useState, useMemo } from 'react';
import HistoricalMap from '../viz/HistoricalMap';
import { places, events } from '../data/index';
import { formatDate } from '../validation/schema';
import { usePageTitle } from '../hooks/usePageTitle';
import clsx from 'clsx';

// ── Filter config ─────────────────────────────────────────────────────────────

type FilterId = 'all' | 'battles' | 'landmarks' | 'birthplaces';

interface Filter {
  id: FilterId;
  label: string;
  types: string[];
  color: string;
}

const FILTERS: Filter[] = [
  {
    id: 'all',
    label: 'All',
    types: ['battle_site','birthplace','castle','palace','cathedral','abbey','religious_site','town','region','country','other'],
    color: '#d4a843',
  },
  {
    id: 'battles',
    label: 'Battles',
    types: ['battle_site'],
    color: '#8b1a1a',
  },
  {
    id: 'landmarks',
    label: 'Landmarks',
    types: ['castle','palace','cathedral','abbey','religious_site','town','other'],
    color: '#3d2080',
  },
  {
    id: 'birthplaces',
    label: 'Birthplaces',
    types: ['birthplace'],
    color: '#1a5c6b',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLACE_TYPE_LABEL: Record<string, string> = {
  battle_site:   'Battle Site',
  birthplace:    'Birthplace',
  castle:        'Castle',
  cathedral:     'Cathedral',
  palace:        'Palace',
  abbey:         'Abbey',
  town:          'Town',
  religious_site:'Religious Site',
  region:        'Region',
  country:       'Country',
  other:         'Site',
};

const TYPE_DOT: Record<string, string> = {
  battle_site:   '#8b1a1a',
  birthplace:    '#1a5c6b',
  castle:        '#5c3a1e',
  palace:        '#6b4c1a',
  cathedral:     '#3d2080',
  abbey:         '#2d5a27',
  religious_site:'#6b2a6b',
  town:          '#4a6b3a',
  other:         '#7a6b2a',
};

function eventsAtPlace(placeId: string) {
  return events.filter(e => e.place_id === placeId);
}

const mappedPlaces = places.filter(p => p.coordinates);

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapPage() {
  usePageTitle('Historical Map');
  const [selectedId, setSelectedId]   = useState<string | undefined>();
  const [activeFilter, setFilter]     = useState<FilterId>('all');

  const filter        = FILTERS.find(f => f.id === activeFilter)!;
  const visibleTypes  = useMemo(() => new Set(filter.types), [filter]);
  const visiblePlaces = useMemo(
    () => mappedPlaces.filter(p => visibleTypes.has(p.type)),
    [visibleTypes]
  );

  const selected       = selectedId ? mappedPlaces.find(p => p.id === selectedId) : undefined;
  const selectedEvents = selected ? eventsAtPlace(selected.id) : [];

  function handleSelect(id: string) {
    setSelectedId(id);
    // If selected place is hidden by filter, switch to 'all'
    const place = mappedPlaces.find(p => p.id === id);
    if (place && !visibleTypes.has(place.type)) setFilter('all');
  }

  return (
    <div className="flex" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="w-72 flex-shrink-0 flex flex-col overflow-hidden border-r border-gold/10"
        style={{ background: '#0d0b1a' }}
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-gold/10 flex-shrink-0">
          <div className="flex items-baseline justify-between mb-2.5">
            <h2 className="font-sans text-xs font-bold text-gold/60 uppercase tracking-widest">
              Historical Map
            </h2>
            <span className="font-body text-xs text-text-muted/50">
              {visiblePlaces.length} of {mappedPlaces.length}
            </span>
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(f => {
              const count = mappedPlaces.filter(p => f.types.includes(p.type)).length;
              const isActive = f.id === activeFilter;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-sans border transition-colors',
                    isActive
                      ? 'text-void font-semibold border-transparent'
                      : 'text-text-muted border-gold/20 hover:border-gold/50 hover:text-text-base'
                  )}
                  style={isActive ? { backgroundColor: f.color, borderColor: f.color } : {}}
                >
                  {f.label}
                  <span className={clsx('text-[10px]', isActive ? 'opacity-70' : 'opacity-40')}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Place list */}
        <ul className="flex-1 overflow-y-auto divide-y divide-gold/5 min-h-0">
          {visiblePlaces.map(place => {
            const isSelected = place.id === selectedId;
            const pEvents    = eventsAtPlace(place.id);
            const dotColor   = TYPE_DOT[place.type] ?? '#7a6b2a';
            return (
              <li key={place.id}>
                <button
                  onClick={() => handleSelect(place.id)}
                  className={clsx(
                    'w-full text-left px-4 py-3 transition-colors border-l-2',
                    isSelected
                      ? 'bg-gold/10 border-gold pl-3.5'
                      : 'hover:bg-gold/5 border-transparent'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <div className="min-w-0">
                      <p className="font-serif text-sm font-semibold text-text-base leading-tight truncate">
                        {place.name}
                      </p>
                      {place.modern_name && (
                        <p className="font-body text-xs text-text-muted mt-0.5 leading-tight truncate">
                          {place.modern_name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-sans text-xs text-text-muted/60">
                          {PLACE_TYPE_LABEL[place.type] ?? place.type}
                        </span>
                        {pEvents.length > 0 && (
                          <span className="font-sans text-xs text-gold/70">
                            · {pEvents.length} event{pEvents.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Detail panel */}
        {selected && (
          <div className="border-t border-gold/10 bg-surface p-4 flex-shrink-0 max-h-56 overflow-y-auto">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-serif text-sm font-bold text-text-base leading-tight">{selected.name}</h3>
              <button
                onClick={() => setSelectedId(undefined)}
                className="text-text-muted hover:text-text-base text-lg leading-none flex-shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="font-sans text-xs text-text-muted mb-2">
              {selected.country} · {PLACE_TYPE_LABEL[selected.type] ?? selected.type}
            </p>
            {selected.summary && (
              <p className="font-body text-xs text-text-muted leading-relaxed mb-3">
                {selected.summary.value.length > 200
                  ? selected.summary.value.slice(0, 200) + '…'
                  : selected.summary.value}
              </p>
            )}
            {selectedEvents.length > 0 && (
              <div>
                <p className="font-sans text-xs font-bold text-gold/50 uppercase tracking-widest mb-1.5">
                  Events here
                </p>
                {selectedEvents.map(ev => (
                  <div key={ev.id} className="mb-2">
                    <p className="font-serif text-xs font-bold text-text-base leading-tight">{ev.title}</p>
                    <p className="font-body text-xs text-text-muted">{formatDate(ev.date.value)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── Map canvas ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <HistoricalMap
          places={places}
          events={events}
          selectedPlaceId={selectedId}
          onPlaceSelect={handleSelect}
          visibleTypes={visibleTypes}
        />
      </div>

    </div>
  );
}
