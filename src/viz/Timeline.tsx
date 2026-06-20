import { useState } from 'react';
import * as d3 from 'd3';
import type { Event, EventType } from '../types';

interface TimelineProps {
  events: Event[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}

const SVG_W = 3200;
const SVG_H = 340;
const PAD_X = 80;
const AXIS_Y = 260;
const DOT_R = 8;
const STEM_BASE = 60;
const LANE_H = 52;
const YEAR_MIN = 849;
const YEAR_MAX = 1710;
const OVERLAP_PX = 68;

const xScale = d3.scaleLinear()
  .domain([YEAR_MIN, YEAR_MAX])
  .range([PAD_X, SVG_W - PAD_X]);

const AXIS_TICKS = d3.range(849, 1715, 10);

const TYPE_COLOR: Record<EventType, string> = {
  battle:      '#c01c3c',
  coronation:  '#d4a843',
  marriage:    '#d4a843',
  death:       '#6b5e4e',
  legislation: '#4a9b5f',
  political:   '#b87c3c',
  treaty:      '#5c9b7a',
  rebellion:   '#9b3c6b',
  birth:       '#3c7a9b',
  cultural:    '#9b7c3c',
  religious:   '#7c5c9b',
  succession:  '#5c6b9b',
  other:       '#666666',
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

function assignLanes(evts: Event[]): Map<string, number> {
  const sorted = [...evts].sort((a, b) => a.date.value.year - b.date.value.year);
  const lanes = new Map<string, number>();
  const laneLastX = new Map<number, number>();

  for (const ev of sorted) {
    const x = xScale(ev.date.value.year);
    let lane = 0;
    while (true) {
      const last = laneLastX.get(lane);
      if (last === undefined || Math.abs(x - last) >= OVERLAP_PX) break;
      lane++;
    }
    lanes.set(ev.id, lane);
    laneLastX.set(lane, x);
  }
  return lanes;
}

function shortTitle(title: string): string {
  return title.length > 20 ? title.slice(0, 19) + '…' : title;
}

export default function Timeline({ events, selectedId, onSelect }: TimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | undefined>();
  const lanes = assignLanes(events);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={SVG_W}
        height={SVG_H}
        style={{ display: 'block', minWidth: SVG_W, background: 'transparent' }}
      >
        {/* Axis line */}
        <line
          x1={PAD_X - 10} y1={AXIS_Y}
          x2={SVG_W - PAD_X + 10} y2={AXIS_Y}
          stroke="#3a3050" strokeWidth={1.5}
        />

        {/* Century bands */}
        {[900, 1000, 1100, 1200, 1300, 1400, 1500, 1600].map(c => (
          <rect
            key={c}
            x={xScale(c)}
            y={0}
            width={xScale(c + 100) - xScale(c)}
            height={SVG_H}
            fill={`rgba(212,168,67,0.02)`}
            stroke="rgba(212,168,67,0.06)"
            strokeWidth={0.5}
          />
        ))}

        {/* Year ticks */}
        {AXIS_TICKS.map(yr => {
          const isCentury = yr % 100 === 0;
          const isFifty = yr % 50 === 0 && !isCentury;
          const show = isCentury || isFifty || yr % 25 === 0;
          return (
            <g key={yr}>
              <line
                x1={xScale(yr)} y1={AXIS_Y}
                x2={xScale(yr)} y2={AXIS_Y + (isCentury ? 12 : isFifty ? 8 : 5)}
                stroke={isCentury ? '#d4a843' : '#3a3050'}
                strokeWidth={isCentury ? 1.5 : 0.8}
              />
              {show && (
                <text
                  x={xScale(yr)} y={AXIS_Y + 24}
                  textAnchor="middle"
                  fontSize={isCentury ? 12 : 9}
                  fontFamily="Inter, system-ui, sans-serif"
                  fill={isCentury ? '#d4a843' : '#4a4060'}
                  fontWeight={isCentury ? '600' : '400'}
                >
                  {yr}
                </text>
              )}
            </g>
          );
        })}

        {/* Events */}
        {events.map(ev => {
          const x = xScale(ev.date.value.year);
          const lane = lanes.get(ev.id) ?? 0;
          const stemH = STEM_BASE + lane * LANE_H;
          const dotY = AXIS_Y - stemH;
          const color = TYPE_COLOR[ev.type];
          const isSelected = ev.id === selectedId;
          const isHovered = ev.id === hoveredId;
          const isActive = isSelected || isHovered;

          return (
            <g
              key={ev.id}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(ev.id)}
              onMouseEnter={() => setHoveredId(ev.id)}
              onMouseLeave={() => setHoveredId(undefined)}
              role="button"
              tabIndex={0}
              aria-label={`${ev.title} (${ev.date.value.year})`}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(ev.id);
                }
              }}
            >
              {/* Native browser tooltip on hover — shows the full untruncated title */}
              <title>{ev.title} ({ev.date.value.year})</title>

              {/* Stem */}
              <line
                x1={x} y1={AXIS_Y}
                x2={x} y2={dotY + DOT_R}
                stroke={color}
                strokeWidth={isActive ? 2 : 1}
                strokeOpacity={isActive ? 0.9 : 0.45}
              />

              {/* Glow ring for selected */}
              {isSelected && (
                <circle
                  cx={x} cy={dotY} r={DOT_R + 6}
                  fill="none"
                  stroke={color}
                  strokeWidth={1}
                  strokeOpacity={0.3}
                />
              )}

              {/* Invisible larger hit target for easier hovering/clicking */}
              <circle
                cx={x} cy={dotY} r={DOT_R + 8}
                fill="transparent"
              />

              {/* Dot — grows from 8 → 14 on hover */}
              <circle
                cx={x} cy={dotY} r={isActive ? DOT_R + 4 : DOT_R}
                fill={color}
                stroke={isSelected ? '#d4a843' : '#0d0b1a'}
                strokeWidth={isSelected ? 2.5 : 1.5}
                fillOpacity={isActive ? 1 : 0.7}
                style={{ transition: 'r 0.15s ease' }}
              />

              {/* Short label */}
              <text
                x={x} y={dotY - DOT_R - 5}
                textAnchor="middle"
                fontSize={9.5}
                fontFamily="Cinzel, Georgia, serif"
                fill={isActive ? color : '#6b6580'}
                fontWeight={isActive ? '600' : '400'}
              >
                {shortTitle(ev.title)}
              </text>

              {/* Full title shown above the dot on hover/selection */}
              {isActive && ev.title.length > 20 && (
                <text
                  x={x} y={dotY - DOT_R - 18}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="Cinzel, Georgia, serif"
                  fill="#d4a843"
                  fontWeight="600"
                >
                  {ev.title}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export { TYPE_COLOR, TYPE_LABEL };
