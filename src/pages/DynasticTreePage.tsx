import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import DynasticTree from '../viz/DynasticTree';
import { people, parentChildRels, marriageRels } from '../data/index';
import { usePageTitle } from '../hooks/usePageTitle';

// ── House tabs ─────────────────────────────────────────────────────────────────

interface HouseTab {
  id: string;
  label: string;
  color: string;
  personId: string;
  dates: string;
}

const HOUSE_TABS: HouseTab[] = [
  { id: 'wessex',      label: 'Wessex',      color: '#9B7A1A', personId: 'alfred-the-great', dates: '849' },
  { id: 'denmark',     label: 'Denmark',     color: '#1B3A6B', personId: 'cnut',             dates: '1016' },
  { id: 'norman',      label: 'Norman',      color: '#4a7c59', personId: 'william-i',        dates: '1066' },
  { id: 'plantagenet', label: 'Plantagenet', color: '#8B1A1A', personId: 'henry-ii',         dates: '1154' },
  { id: 'lancaster',   label: 'Lancaster',   color: '#C41E3A', personId: 'henry-iv',         dates: '1399' },
  { id: 'york',        label: 'York',        color: '#c0bfbb', personId: 'edward-iv',        dates: '1461' },
  { id: 'tudor',       label: 'Tudor',       color: '#1A5C1A', personId: 'henry-vii',        dates: '1485' },
  { id: 'stuart',      label: 'Stuart',      color: '#7c5cb8', personId: 'james-i',          dates: '1603' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DynasticTreePage() {
  usePageTitle('Dynastic Tree');
  const [searchParams] = useSearchParams();
  const focusParam = searchParams.get('focus');
  const [activeHouseId, setActiveHouseId] = useState<string>('norman');
  const [jumpKey,       setJumpKey]       = useState(focusParam ? 1 : 0);
  const [jumpPersonId,  setJumpPersonId]  = useState<string>(focusParam ?? 'william-i');

  function handleHouseClick(tab: HouseTab) {
    setActiveHouseId(tab.id);
    setJumpPersonId(tab.personId);
    setJumpKey(k => k + 1);
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Title + legend ─────────────────────────────────────────────────── */}
      <div
        className="px-6 py-2.5 flex items-center justify-between flex-shrink-0 border-b border-gold/10"
        style={{ background: 'rgba(13,11,26,0.98)' }}
      >
        <h1 className="font-serif text-sm font-bold text-text-base tracking-wide">
          Dynastic Tree
          <span className="text-gold mx-2">·</span>
          <span className="text-text-muted font-body font-normal">English Monarchy 849–1714</span>
        </h1>

        {/* Line-style legend */}
        <div className="flex items-center gap-5 font-sans text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#6060b0" strokeWidth="1.5" /></svg>
            <span>Patrilineal</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#6060b0" strokeWidth="1.5" strokeDasharray="4,3" /></svg>
            <span>Matrilineal</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke="#d4a843" strokeWidth="2" /></svg>
            <span>Marriage</span>
          </div>
        </div>
      </div>

      {/* ── House tabs ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-stretch flex-shrink-0 border-b border-gold/10 overflow-x-auto"
        style={{ background: 'rgba(10,8,20,0.99)' }}
      >
        {HOUSE_TABS.map(tab => {
          const isActive = tab.id === activeHouseId;
          return (
            <button
              key={tab.id}
              onClick={() => handleHouseClick(tab)}
              className={clsx(
                'relative flex flex-col items-center px-5 py-2.5 transition-colors duration-150 whitespace-nowrap flex-shrink-0',
                isActive ? 'text-text-base' : 'text-text-muted hover:text-text-base'
              )}
            >
              {/* Coloured top accent */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-150"
                style={{ backgroundColor: tab.color, opacity: isActive ? 1 : 0 }}
              />
              <span className="font-sans text-xs font-semibold tracking-wide">
                {tab.label}
              </span>
              <span className="font-sans text-[10px] text-text-muted/40 mt-0.5">
                {tab.dates}
              </span>
            </button>
          );
        })}

        {/* Hint badge — right-aligned */}
        <div className="ml-auto flex items-center pr-5 pl-8">
          <p className="font-sans text-[10px] text-text-muted/30 whitespace-nowrap">
            Scroll to zoom · Drag to pan · Click name to open
          </p>
        </div>
      </div>

      {/* ── Tree canvas ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden" style={{ background: '#0d0b1a' }}>
        <DynasticTree
          people={people}
          parentChildEdges={parentChildRels}
          marriageEdges={marriageRels}
          jumpKey={jumpKey}
          jumpPersonId={jumpPersonId}
        />
      </div>

    </div>
  );
}
