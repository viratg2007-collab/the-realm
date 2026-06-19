import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { events, personById, placeById } from '../data/index';
import { formatDate } from '../validation/schema';
import type { EventTheme, EventType, Event } from '../types';
import { usePageTitle } from '../hooks/usePageTitle';

// ── constants ─────────────────────────────────────────────────────────────────

const ALL_THEMES: EventTheme[] = [
  'monarchy', 'conflict', 'society', 'law', 'diplomacy', 'religion', 'culture',
];

const THEME_LABEL: Record<EventTheme, string> = {
  monarchy:  'Monarchy',
  conflict:  'Conflict',
  society:   'Society',
  law:       'Law',
  diplomacy: 'Diplomacy',
  religion:  'Religion',
  culture:   'Culture',
};

const TYPE_COLOR: Record<EventType, string> = {
  battle:      '#c01c3c',
  coronation:  '#d4a843',
  marriage:    '#9b6b1a',
  death:       '#7a6b5a',
  legislation: '#3e8b53',
  political:   '#b87c3c',
  treaty:      '#3c8b72',
  rebellion:   '#8b2c5c',
  birth:       '#2c6b8b',
  cultural:    '#7c6b2c',
  religious:   '#6b4a8b',
  succession:  '#4a5a8b',
  other:       '#555566',
};

const TYPE_LABEL: Record<EventType, string> = {
  battle:      'Battle',
  coronation:  'Coronation',
  marriage:    'Marriage',
  death:       'Death',
  legislation: 'Legislation',
  political:   'Political',
  treaty:      'Treaty',
  rebellion:   'Rebellion',
  birth:       'Birth',
  cultural:    'Cultural',
  religious:   'Religious',
  succession:  'Succession',
  other:       'Other',
};

// ── helpers ───────────────────────────────────────────────────────────────────

function centuryLabel(c: number): string {
  const suffix =
    c === 11 || c === 12 || c === 13 ? 'th'
    : c % 10 === 1 ? 'st'
    : c % 10 === 2 ? 'nd'
    : c % 10 === 3 ? 'rd'
    : 'th';
  return `${c}${suffix} Century`;
}

type CenturyGroup = { century: number; label: string; events: Event[] };

function groupByCentury(evts: Event[]): CenturyGroup[] {
  const map = new Map<number, Event[]>();
  for (const ev of evts) {
    const c = Math.ceil(ev.date.value.year / 100);
    const bucket = map.get(c);
    if (bucket) bucket.push(ev);
    else map.set(c, [ev]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([c, evts]) => ({ century: c, label: centuryLabel(c), events: evts }));
}

// ── EventCard ─────────────────────────────────────────────────────────────────

function EventCard({
  event,
  isSelected,
  onSelect,
}: {
  event: Event;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const color = TYPE_COLOR[event.type];

  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full text-left px-4 py-3.5 transition-colors duration-150',
        'border-b border-gold/5 border-l-[3px]',
        isSelected ? 'bg-gold/[0.06]' : 'hover:bg-surface'
      )}
      style={{ borderLeftColor: isSelected ? color : 'transparent' }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-sans text-xs text-gold/60 tracking-widest">
          {event.date.value.year}
        </span>
        <span
          className="font-sans text-[10px] px-1.5 py-px rounded font-semibold tracking-wider"
          style={{ backgroundColor: color, color: 'rgba(255,255,255,0.92)' }}
        >
          {TYPE_LABEL[event.type].toUpperCase()}
        </span>
      </div>
      <p className={clsx(
        'font-serif text-sm font-bold leading-tight mb-1.5 transition-colors',
        isSelected ? 'text-gold' : 'text-text-base'
      )}>
        {event.title}
      </p>
      <p className="font-body text-xs text-text-muted leading-relaxed line-clamp-2">
        {event.summary.value}
      </p>
    </button>
  );
}

// ── EventDetail ───────────────────────────────────────────────────────────────

function EventDetail({
  event,
  onClose,
}: {
  event: Event;
  onClose: () => void;
}) {
  const color = TYPE_COLOR[event.type];
  const place = event.place_id ? placeById.get(event.place_id) : undefined;

  return (
    <div className="p-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-sans text-xs px-2 py-0.5 rounded font-semibold tracking-wider"
            style={{ backgroundColor: color, color: 'rgba(255,255,255,0.92)' }}
          >
            {TYPE_LABEL[event.type].toUpperCase()}
          </span>
          <span className="font-sans text-xs text-gold/60 tracking-widest">
            {event.date.value.year}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-base transition-colors text-xl leading-none flex-shrink-0 mt-0.5"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Title */}
      <h2 className="font-serif text-2xl font-bold text-text-base leading-tight mb-2">
        {event.title}
      </h2>

      {/* Date + place */}
      <p className="font-body text-sm text-text-muted mb-5">
        {formatDate(event.date.value)}
        {event.date_end && ` – ${formatDate(event.date_end.value)}`}
        {place && <span> · {place.name}</span>}
      </p>

      {/* Summary */}
      <div className="border-t border-gold/10 pt-4 mb-5">
        <p className="font-body text-sm text-text-base leading-relaxed">
          {event.summary.value}
        </p>
      </div>

      {/* People */}
      {event.people_involved && event.people_involved.length > 0 && (
        <div className="mb-5">
          <p className="font-sans text-xs font-bold text-gold/40 uppercase tracking-widest mb-2.5">
            People Involved
          </p>
          <div className="space-y-2">
            {event.people_involved.map(pr => {
              const person = personById.get(pr.person_id);
              if (!person) return null;
              return (
                <div key={pr.person_id} className="flex items-baseline gap-2 flex-wrap">
                  <Link
                    to={`/people/${person.id}`}
                    className="font-serif text-sm font-semibold text-text-base hover:text-gold transition-colors"
                  >
                    {person.name}
                  </Link>
                  <span className="font-body text-xs text-text-muted">— {pr.role}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Themes */}
      <div>
        <p className="font-sans text-xs font-bold text-gold/40 uppercase tracking-widest mb-2">
          Themes
        </p>
        <div className="flex flex-wrap gap-1.5">
          {event.themes.map(t => (
            <span
              key={t}
              className="font-sans text-xs px-2 py-0.5 rounded-full bg-void border border-gold/15 text-text-muted"
            >
              {THEME_LABEL[t]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  usePageTitle('Timeline');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [activeThemes, setActiveThemes] = useState<Set<EventTheme>>(new Set());

  function toggleTheme(theme: EventTheme) {
    setActiveThemes(prev => {
      const next = new Set(prev);
      if (next.has(theme)) next.delete(theme);
      else next.add(theme);
      return next;
    });
  }

  const visibleEvents = (
    activeThemes.size === 0
      ? [...events]
      : events.filter(e => e.themes.some(t => activeThemes.has(t)))
  ).sort((a, b) => a.date.value.year - b.date.value.year);

  const groups = groupByCentury(visibleEvents);
  const selected = selectedId ? events.find(e => e.id === selectedId) : undefined;

  return (
    <div className="flex" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Left pane: event list ───────────────────────────────────────────── */}
      <div
        className="flex flex-col border-r border-gold/10"
        style={{ width: '52%', minWidth: 0 }}
      >
        {/* Filter bar */}
        <div
          className="flex-shrink-0 px-4 py-3 border-b border-gold/10"
          style={{ background: 'rgba(13,11,26,0.98)' }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <h1 className="font-serif text-sm font-bold text-text-base tracking-wide">
              Timeline
              <span className="text-gold mx-2">·</span>
              <span className="font-body font-normal text-text-muted">878 – 1688</span>
            </h1>
            <span className="font-body text-xs text-text-muted">
              {visibleEvents.length} event{visibleEvents.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="font-sans text-xs text-text-muted/50 mr-0.5">Filter:</span>
            {ALL_THEMES.map(theme => {
              const active = activeThemes.has(theme);
              return (
                <button
                  key={theme}
                  onClick={() => toggleTheme(theme)}
                  className={clsx(
                    'px-2.5 py-0.5 rounded-full text-xs font-sans border transition-colors',
                    active
                      ? 'bg-gold text-void border-gold'
                      : 'bg-surface text-text-muted border-gold/20 hover:border-gold/50 hover:text-text-base'
                  )}
                >
                  {THEME_LABEL[theme]}
                </button>
              );
            })}
            {activeThemes.size > 0 && (
              <button
                onClick={() => setActiveThemes(new Set())}
                className="px-2 py-0.5 text-xs font-sans text-text-muted hover:text-gold transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Scrollable event list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {groups.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="font-body text-sm text-text-muted">No events match the current filter.</p>
            </div>
          ) : groups.map(group => (
            <div key={group.century}>
              {/* Century header — sticky within scroll pane */}
              <div
                className="px-4 pt-4 pb-2 sticky top-0 z-10"
                style={{ background: 'rgba(13,11,26,0.96)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-sans text-xs font-bold text-gold/50 uppercase tracking-widest">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-gold/10" />
                  <span className="font-sans text-xs text-text-muted/40">
                    {group.events.length}
                  </span>
                </div>
              </div>

              {group.events.map(ev => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  isSelected={ev.id === selectedId}
                  onSelect={() => setSelectedId(prev => prev === ev.id ? undefined : ev.id)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right pane: detail ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-void" style={{ minWidth: 0 }}>
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <EventDetail
                event={selected}
                onClose={() => setSelectedId(undefined)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full flex flex-col items-center justify-center text-center px-8 min-h-64"
            >
              <p className="font-sans text-xs text-gold/20 uppercase tracking-widest mb-3">
                No event selected
              </p>
              <p className="font-body text-sm text-text-muted/50 leading-relaxed max-w-xs">
                Select an event on the left to read the full account
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
