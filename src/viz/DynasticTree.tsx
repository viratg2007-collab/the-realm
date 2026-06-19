import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { Person, ParentChildRelationship, MarriageRelationship } from '../types';
import { houseById } from '../data/index';

interface DynasticTreeProps {
  people: Person[];
  parentChildEdges: ParentChildRelationship[];
  marriageEdges: MarriageRelationship[];
  /** Increment to trigger a jump; pairing with jumpPersonId tells the tree where to go. */
  jumpKey?: number;
  jumpPersonId?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const NODE_W = 224;
const NODE_H = 82;
const UNION_GAP = 60;    // gap between spouses
const FAMILY_GAP = 100;  // minimum gap between family units
const GEN_HEIGHT = 260;
const PAD = 100;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Union {
  id: string;            // canonical key: "p1Id::p2Id" (sorted) or "solo::personId"
  p1Id: string;
  p2Id: string | null;   // null → single-parent (illegitimate)
  marriage: MarriageRelationship | null;
  childIds: string[];
  gen: number;
}

interface LayoutPos {
  x: number;
  y: number;
}

interface LayoutResult {
  pos: Map<string, LayoutPos>;
  unions: Union[];
  personMap: Map<string, Person>;
  maxGen: number;
}

type SelectedConn =
  | {
      type: 'parent_child';
      parents: Person[];
      child: Person;
      legitimacy: string;
      lineName: string;
      highlightIds: string[];
      connKey: string;
    }
  | {
      type: 'marriage';
      spouse1: Person;
      spouse2: Person;
      marriageYear?: number;
      marriageEndYear?: number;
      marriageEndReason?: string;
      highlightIds: string[];
      connKey: string;
    };

// ── Helpers ───────────────────────────────────────────────────────────────────
function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function abbreviate(name: string, max = 22): string {
  return name.length <= max ? name : name.slice(0, max - 1) + '…';
}

// ── Layout computation ────────────────────────────────────────────────────────
function computeLayout(
  people: Person[],
  parentChildEdges: ParentChildRelationship[],
  marriageEdges: MarriageRelationship[],
): LayoutResult {
  const personMap = new Map(people.map(p => [p.id, p]));

  // 1. Adjacency maps
  const childrenOf = new Map<string, string[]>(people.map(p => [p.id, []]));
  const parentsOf  = new Map<string, string[]>(people.map(p => [p.id, []]));
  const marriedPairs = new Set(marriageEdges.map(e => pairKey(e.from_person_id, e.to_person_id)));
  const allSpousesOf = new Map<string, string[]>(people.map(p => [p.id, []]));

  for (const e of parentChildEdges) {
    const ch = childrenOf.get(e.from_person_id);
    if (ch && !ch.includes(e.to_person_id)) ch.push(e.to_person_id);
    const pa = parentsOf.get(e.to_person_id);
    if (pa && !pa.includes(e.from_person_id)) pa.push(e.from_person_id);
  }
  for (const e of marriageEdges) {
    allSpousesOf.get(e.from_person_id)?.push(e.to_person_id);
    allSpousesOf.get(e.to_person_id)?.push(e.from_person_id);
  }

  // 2. Assign generations: iterate longest-path + spouse equalization until stable,
  //    then seed root nodes from birth year, then iterate again.
  const MIN_YEAR = 849;
  const AVG_GEN  = 28;

  function iterateGenPropagation(gen: Map<string, number>) {
    let changed = true;
    while (changed) {
      changed = false;
      // Longest-path from parents
      for (const e of parentChildEdges) {
        const pg = gen.get(e.from_person_id) ?? 0;
        const cg = gen.get(e.to_person_id) ?? 0;
        if (cg < pg + 1) { gen.set(e.to_person_id, pg + 1); changed = true; }
      }
      // Equalize spouses onto the same row
      for (const e of marriageEdges) {
        const g1 = gen.get(e.from_person_id) ?? 0;
        const g2 = gen.get(e.to_person_id) ?? 0;
        const mg = Math.max(g1, g2);
        if (g1 !== mg) { gen.set(e.from_person_id, mg); changed = true; }
        if (g2 !== mg) { gen.set(e.to_person_id, mg); changed = true; }
      }
    }
  }

  const gen = new Map<string, number>(people.map(p => [p.id, 0]));

  // Pass 1: structural longest-path + equalization
  iterateGenPropagation(gen);

  // Seed root nodes (no parents in dataset) from birth year so that
  // chronologically earlier roots (e.g. Cnut) rank above later roots (e.g. William I).
  // Only apply to roots whose every spouse is also a root — "marital in-laws" who
  // marry into an existing chain (e.g. Isabella of Angouleme marrying John) should
  // just equalize with their genealogically-placed spouse instead of pulling them up.
  for (const p of people) {
    if ((parentsOf.get(p.id)?.length ?? 0) === 0 && p.born) {
      const spouses = allSpousesOf.get(p.id) ?? [];
      const allSpousesAreRoots = spouses.every(sid => (parentsOf.get(sid)?.length ?? 0) === 0);
      if (spouses.length === 0 || allSpousesAreRoots) {
        const birthGen = Math.max(0, Math.round((p.born.value.year - MIN_YEAR) / AVG_GEN));
        if (birthGen > (gen.get(p.id) ?? 0)) {
          gen.set(p.id, birthGen);
        }
      }
    }
  }

  // Pass 2: re-propagate so children of re-seeded roots cascade correctly
  iterateGenPropagation(gen);

  // 4. Build unions (one per marriage that has children, or per single-parent family)
  // Use dagre to assign X positions within each generation
  const maxGen = people.reduce((m, p) => Math.max(m, gen.get(p.id) ?? 0), 0);

  // Build union map: marriage key → Union
  const unionMap = new Map<string, Union>();

  // Marriages-with-children unions
  for (const e of marriageEdges) {
    const key = pairKey(e.from_person_id, e.to_person_id);
    if (unionMap.has(key)) continue;
    const g = Math.max(gen.get(e.from_person_id) ?? 0, gen.get(e.to_person_id) ?? 0);
    const [p1, p2] = e.from_person_id < e.to_person_id
      ? [e.from_person_id, e.to_person_id]
      : [e.to_person_id, e.from_person_id];
    unionMap.set(key, { id: key, p1Id: p1, p2Id: p2, marriage: e, childIds: [], gen: g });
  }

  // Assign children to their union
  for (const e of parentChildEdges) {
    if (!personMap.has(e.to_person_id)) continue;
    const parentsOfChild = parentsOf.get(e.to_person_id) ?? [];
    const otherParent = parentsOfChild.find(p => p !== e.from_person_id);
    let unionKey: string | null = null;
    if (otherParent && marriedPairs.has(pairKey(e.from_person_id, otherParent))) {
      unionKey = pairKey(e.from_person_id, otherParent);
    }
    if (unionKey && unionMap.has(unionKey)) {
      const u = unionMap.get(unionKey)!;
      if (!u.childIds.includes(e.to_person_id)) u.childIds.push(e.to_person_id);
    } else {
      // Single-parent or illegitimate: attach to individual
      const soloKey = `solo::${e.from_person_id}`;
      if (!unionMap.has(soloKey)) {
        const g = gen.get(e.from_person_id) ?? 0;
        unionMap.set(soloKey, { id: soloKey, p1Id: e.from_person_id, p2Id: null, marriage: null, childIds: [], gen: g });
      }
      const u = unionMap.get(soloKey)!;
      if (!u.childIds.includes(e.to_person_id)) u.childIds.push(e.to_person_id);
    }
  }

  const unions = [...unionMap.values()];

  // Sort children within each union by birth year
  for (const u of unions) {
    u.childIds.sort((a, b) =>
      (personMap.get(a)?.born?.value.year ?? 9999) - (personMap.get(b)?.born?.value.year ?? 9999)
    );
  }

  // 5. Build ordered family units per generation (couple = primary marriage, then secondary spouses)
  // Primary spouse = first marriage where neither party yet has a primary spouse assigned.
  // If only one side is unset, still assign that side so every married person gets a primary.
  const primarySpouseOf = new Map<string, string>();
  for (const e of marriageEdges) {
    const fHas = primarySpouseOf.has(e.from_person_id);
    const tHas = primarySpouseOf.has(e.to_person_id);
    if (!fHas && !tHas) {
      primarySpouseOf.set(e.from_person_id, e.to_person_id);
      primarySpouseOf.set(e.to_person_id, e.from_person_id);
    } else if (!tHas) {
      // from already claimed; give to their primary assignment
      primarySpouseOf.set(e.to_person_id, e.from_person_id);
    } else if (!fHas) {
      primarySpouseOf.set(e.from_person_id, e.to_person_id);
    }
  }

  type FamilyUnit = { type: 'couple'; p1: string; p2: string } | { type: 'single'; id: string };
  const unitWidth = (u: FamilyUnit) => u.type === 'couple' ? NODE_W * 2 + UNION_GAP : NODE_W;

  const unitsByGen = new Map<number, FamilyUnit[]>();
  for (let g = 0; g <= maxGen; g++) {
    const gPeople = people
      .filter(p => gen.get(p.id) === g)
      .sort((a, b) => (a.born?.value.year ?? 5000) - (b.born?.value.year ?? 5000));
    const units: FamilyUnit[] = [];
    const seen = new Set<string>();
    for (const p of gPeople) {
      if (seen.has(p.id)) continue;
      const sp = primarySpouseOf.get(p.id);
      if (sp && gen.get(sp) === g && !seen.has(sp)) {
        const pHasParents = (parentsOf.get(p.id) ?? []).length > 0;
        const sHasParents = (parentsOf.get(sp) ?? []).length > 0;
        const p1 = (!pHasParents && sHasParents) ? sp : p.id;
        const p2 = p1 === p.id ? sp : p.id;
        units.push({ type: 'couple', p1, p2 });
        seen.add(p.id); seen.add(sp);
        for (const sid of allSpousesOf.get(p1) ?? []) {
          if (sid === p2 || seen.has(sid) || gen.get(sid) !== g) continue;
          units.push({ type: 'single', id: sid });
          seen.add(sid);
        }
        for (const sid of allSpousesOf.get(p2) ?? []) {
          if (sid === p1 || seen.has(sid) || gen.get(sid) !== g) continue;
          units.push({ type: 'single', id: sid });
          seen.add(sid);
        }
      } else {
        units.push({ type: 'single', id: p.id });
        seen.add(p.id);
      }
    }
    unitsByGen.set(g, units);
  }

  // 6. Assign X positions — left-to-right per generation, centred over maxWidth
  const genWidth = (g: number) => {
    const us = unitsByGen.get(g) ?? [];
    return us.reduce((w, u, i) => w + unitWidth(u) + (i > 0 ? FAMILY_GAP : 0), 0);
  };
  const maxWidth = Math.max(...Array.from({ length: maxGen + 1 }, (_, g) => genWidth(g)), 0);
  const unitCenterX = (u: FamilyUnit, pos: Map<string, LayoutPos>) => {
    if (u.type === 'couple') return ((pos.get(u.p1)?.x ?? 0) + (pos.get(u.p2)?.x ?? 0) + NODE_W) / 2;
    return (pos.get(u.id)?.x ?? 0) + NODE_W / 2;
  };

  const pos = new Map<string, LayoutPos>();
  const assignRow = (g: number) => {
    const us = unitsByGen.get(g) ?? [];
    const gw = genWidth(g);
    let cursor = PAD + (maxWidth - gw) / 2;
    const y = g * GEN_HEIGHT;
    for (let i = 0; i < us.length; i++) {
      if (i > 0) cursor += FAMILY_GAP;
      const u = us[i];
      if (u.type === 'couple') {
        pos.set(u.p1, { x: cursor, y });
        pos.set(u.p2, { x: cursor + NODE_W + UNION_GAP, y });
      } else {
        pos.set(u.id, { x: cursor, y });
      }
      cursor += unitWidth(u);
    }
  };
  for (let g = 0; g <= maxGen; g++) assignRow(g);

  // 7. Iterative centering: shift each unit toward its children's centroid
  for (let iter = 0; iter < 6; iter++) {
    for (let g = maxGen - 1; g >= 0; g--) {
      const us = unitsByGen.get(g) ?? [];
      for (const unit of us) {
        const members = unit.type === 'couple' ? [unit.p1, unit.p2] : [unit.id];
        const allChildren = new Set<string>();
        for (const m of members) for (const c of childrenOf.get(m) ?? []) if (pos.has(c)) allChildren.add(c);
        if (allChildren.size === 0) continue;
        let sumX = 0;
        for (const cid of allChildren) {
          const cg = gen.get(cid) ?? 0;
          const cUnit = (unitsByGen.get(cg) ?? []).find(u =>
            u.type === 'couple' ? (u.p1 === cid || u.p2 === cid) : u.id === cid
          );
          sumX += cUnit ? unitCenterX(cUnit, pos) : (pos.get(cid)!.x + NODE_W / 2);
        }
        const dx = sumX / allChildren.size - unitCenterX(unit, pos);
        if (Math.abs(dx) < 1) continue;
        if (unit.type === 'couple') {
          const a = pos.get(unit.p1)!; pos.set(unit.p1, { ...a, x: a.x + dx });
          const b = pos.get(unit.p2)!; pos.set(unit.p2, { ...b, x: b.x + dx });
        } else {
          const p = pos.get(unit.id)!; pos.set(unit.id, { ...p, x: p.x + dx });
        }
      }
      // Resolve overlaps
      const sorted = [...(unitsByGen.get(g) ?? [])].sort((a, b) => {
        return (pos.get(a.type === 'couple' ? a.p1 : a.id)?.x ?? 0) -
               (pos.get(b.type === 'couple' ? b.p1 : b.id)?.x ?? 0);
      });
      let prevRight = -Infinity;
      for (const u of sorted) {
        const primId = u.type === 'couple' ? u.p1 : u.id;
        const left = pos.get(primId)!.x;
        const minLeft = prevRight + FAMILY_GAP;
        if (left < minLeft) {
          const shift = minLeft - left;
          if (u.type === 'couple') {
            const a = pos.get(u.p1)!; pos.set(u.p1, { ...a, x: a.x + shift });
            const b = pos.get(u.p2)!; pos.set(u.p2, { ...b, x: b.x + shift });
          } else { const p = pos.get(u.id)!; pos.set(u.id, { ...p, x: p.x + shift }); }
        }
        prevRight = pos.get(primId)!.x + unitWidth(u);
      }
    }
  }

  // 8. Sibling birth-order sort: oldest LEFT, youngest RIGHT
  {
    const sibGroupMap = new Map<string, string[]>();
    for (const e of parentChildEdges) {
      const pPos = pos.get(e.from_person_id);
      if (!pPos || !pos.has(e.to_person_id)) continue;
      const coParent = (parentsOf.get(e.to_person_id) ?? []).find(cp => {
        if (cp === e.from_person_id) return false;
        const cpPos = pos.get(cp);
        return cpPos && cpPos.y === pPos.y && marriedPairs.has(pairKey(e.from_person_id, cp));
      });
      const key = coParent
        ? (pPos.x < (pos.get(coParent)?.x ?? 0) ? `${e.from_person_id}::${coParent}` : `${coParent}::${e.from_person_id}`)
        : e.from_person_id;
      if (!sibGroupMap.has(key)) sibGroupMap.set(key, []);
      const arr = sibGroupMap.get(key)!;
      if (!arr.includes(e.to_person_id)) arr.push(e.to_person_id);
    }
    for (const siblings of sibGroupMap.values()) {
      if (siblings.length < 2) continue;
      if (new Set(siblings.map(id => pos.get(id)?.y ?? -1)).size > 1) continue;
      siblings.sort((a, b) =>
        (personMap.get(a)?.born?.value.year ?? 9999) - (personMap.get(b)?.born?.value.year ?? 9999)
      );
      const snapshotCx = siblings.map(id => pos.get(id)!.x + NODE_W / 2);
      const targetCxs = [...snapshotCx].sort((a, b) => a - b);
      for (let i = 0; i < siblings.length; i++) {
        const dx = targetCxs[i] - snapshotCx[i];
        if (Math.abs(dx) < 1) continue;
        const id = siblings[i];
        const p = pos.get(id)!; pos.set(id, { ...p, x: p.x + dx });
        // Carry couple spouse
        const g = gen.get(id) ?? 0;
        const unit = (unitsByGen.get(g) ?? []).find(u =>
          u.type === 'couple' ? (u.p1 === id || u.p2 === id) : u.id === id
        );
        if (unit?.type === 'couple') {
          const spId = unit.p1 === id ? unit.p2 : unit.p1;
          if (!siblings.includes(spId)) { const sp = pos.get(spId)!; pos.set(spId, { ...sp, x: sp.x + dx }); }
        }
        // Carry adjacent secondary spouses
        const gUnits = unitsByGen.get(gen.get(id) ?? 0) ?? [];
        const unitIdx = gUnits.findIndex(u => u.type === 'couple' ? (u.p1 === id || u.p2 === id) : u.id === id);
        const primaryMembers = unit?.type === 'couple' ? [unit.p1, unit.p2] : [id];
        if (unitIdx >= 0) {
          for (let j = unitIdx + 1; j < gUnits.length; j++) {
            const nu = gUnits[j];
            const nid = nu.type === 'couple' ? nu.p1 : nu.id;
            const isSec = primaryMembers.some(m => (allSpousesOf.get(m) ?? []).includes(nid) && primarySpouseOf.get(m) !== nid);
            if (!isSec) break;
            if (nu.type === 'couple') {
              if (!siblings.includes(nu.p1)) { const a = pos.get(nu.p1)!; pos.set(nu.p1, { ...a, x: a.x + dx }); }
              if (!siblings.includes(nu.p2)) { const b = pos.get(nu.p2)!; pos.set(nu.p2, { ...b, x: b.x + dx }); }
            } else {
              if (!siblings.includes(nid)) { const np = pos.get(nid)!; pos.set(nid, { ...np, x: np.x + dx }); }
            }
          }
        }
      }
    }
  }

  // 9. Final overlap re-resolution (unit-list order preserves secondary-spouse adjacency)
  for (let g = 0; g <= maxGen; g++) {
    const rowUnits = unitsByGen.get(g) ?? [];
    let prevRight = -Infinity;
    for (const u of rowUnits) {
      const primId = u.type === 'couple' ? u.p1 : u.id;
      const left = pos.get(primId)!.x;
      const minLeft = prevRight + FAMILY_GAP;
      if (left < minLeft) {
        const shift = minLeft - left;
        if (u.type === 'couple') {
          const a = pos.get(u.p1)!; pos.set(u.p1, { ...a, x: a.x + shift });
          const b = pos.get(u.p2)!; pos.set(u.p2, { ...b, x: b.x + shift });
        } else { const p = pos.get(u.id)!; pos.set(u.id, { ...p, x: p.x + shift }); }
      }
      prevRight = pos.get(primId)!.x + unitWidth(u);
    }
  }

  return { pos, unions, personMap, maxGen };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DynasticTree({ people, parentChildEdges, marriageEdges, jumpKey, jumpPersonId }: DynasticTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView]       = useState<'overview' | 'focused'>('overview');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selectedConn, setSelectedConn] = useState<SelectedConn | null>(null);
  const undimRef = useRef<(() => void) | null>(null);

  // Escape key dismisses the active connection panel
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedConn) {
        undimRef.current?.();
        setSelectedConn(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedConn]);

  // Refs to D3 objects so we can fly to a person without rebuilding the SVG
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svgRef    = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zoomRef   = useRef<any>(null);
  const layoutRef = useRef<LayoutResult | null>(null);
  // Tracks which person to centre on when re-rendering the overview
  const initPersonRef = useRef<string>('william-i');

  const flyTo = useCallback((personId: string) => {
    if (!zoomRef.current || !svgRef.current || !layoutRef.current || !containerRef.current) return;
    const p = layoutRef.current.pos.get(personId);
    if (!p) return;
    const cW = containerRef.current.clientWidth;
    const cH = containerRef.current.clientHeight;
    const s  = 0.55;
    const tx = cW / 2 - (p.x + NODE_W / 2) * s;
    const ty = cH / 2 - (p.y + NODE_H / 2) * s;
    svgRef.current.transition().duration(750)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(s));
  }, []);

  const focusPerson = useCallback((id: string) => {
    setFocusId(id);
    setView('focused');
  }, []);

  const backToOverview = useCallback(() => {
    setView('overview');
    setFocusId(null);
  }, []);

  // Handle house-tab jumps — jumpKey increments each click so same tab re-triggers
  useEffect(() => {
    if (!jumpPersonId) return;
    if (view !== 'overview') {
      initPersonRef.current = jumpPersonId;
      setView('overview');
      setFocusId(null);
    } else {
      flyTo(jumpPersonId);
    }
  // jumpKey is the trigger; view lets us decide overview vs focused
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpKey]);

  useEffect(() => {
    if (!containerRef.current) return;
    setSelectedConn(null);
    d3.select(containerRef.current).selectAll('svg').remove();

    const layout = computeLayout(people, parentChildEdges, marriageEdges);

    // Shift all X positions so the current anchor person is at the horizontal
    // centre of the bounding box — this keeps the anchor visually centred when
    // zooming out, regardless of how asymmetric the tree is around it.
    const anchorPos = layout.pos.get(initPersonRef.current);
    if (anchorPos) {
      const allXs = [...layout.pos.values()].map(p => p.x);
      const rawCenter = (Math.min(...allXs) + Math.max(...allXs) + NODE_W) / 2;
      const shift = rawCenter - (anchorPos.x + NODE_W / 2);
      if (Math.abs(shift) > 1) {
        for (const [id, p] of layout.pos) layout.pos.set(id, { ...p, x: p.x + shift });
      }
    }

    layoutRef.current = layout;

    if (view === 'overview') {
      const { zoom, svgEl } = renderOverview(
        containerRef.current, layout, parentChildEdges, marriageEdges,
        focusPerson, initPersonRef.current,
        (conn) => setSelectedConn(conn),
        () => setSelectedConn(null),
        undimRef,
      );
      zoomRef.current  = zoom;
      svgRef.current   = svgEl;
    } else if (view === 'focused' && focusId) {
      zoomRef.current = null;
      svgRef.current  = null;
      renderFocused(containerRef.current, focusId, layout, parentChildEdges, marriageEdges, focusPerson);
    }
  }, [people, parentChildEdges, marriageEdges, view, focusId, focusPerson]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {selectedConn && (
        <ConnectionPanel
          conn={selectedConn}
          onClose={() => { undimRef.current?.(); setSelectedConn(null); }}
        />
      )}

      {/* View controls */}
      {view === 'focused' && (
        <button
          onClick={backToOverview}
          style={{
            position: 'absolute', top: 12, left: 12,
            background: '#1a1730', border: '1px solid #3a3060',
            color: '#e8dfc8', padding: '6px 14px', borderRadius: 4,
            fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13,
            cursor: 'pointer', zIndex: 10,
          }}
        >
          ← Overview
        </button>
      )}

      {/* Legend */}
      <Legend />
    </div>
  );
}

// ── Legend component ──────────────────────────────────────────────────────────
function Legend() {
  const houses = [...houseById.values()];
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16,
      background: 'rgba(14,12,30,0.92)', border: '1px solid #3a3060',
      borderRadius: 6, padding: '10px 14px', zIndex: 10,
      fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, color: '#9a8f7a',
      maxWidth: 220,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: '#d4a843', letterSpacing: '0.06em', fontSize: 10, textTransform: 'uppercase' }}>
        Legend
      </div>

      {/* Connector styles */}
      <div style={{ marginBottom: 6, color: '#7a7060', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descent</div>
      <LegendRow label="Patrilineal" dash={false} color="#5a5080" />
      <LegendRow label="Matrilineal" dash={true} color="#5a5080" />
      <LegendRow label="Illegitimate" dash={true} color="#7a5a9a" dotted />
      <div style={{ marginTop: 8, marginBottom: 6, color: '#7a7060', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Marriage</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <svg width={32} height={10}>
          <line x1={0} y1={5} x2={32} y2={5} stroke="#d4a843" strokeWidth={2} />
          <circle cx={16} cy={5} r={3} fill="#d4a843" />
        </svg>
        <span>Union</span>
      </div>

      {/* House colours */}
      <div style={{ marginTop: 8, marginBottom: 6, color: '#7a7060', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Royal House</div>
      {houses.map(h => (
        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 12, height: 12, background: h.color, borderRadius: 2, flexShrink: 0 }} />
          <span>{h.name}</span>
        </div>
      ))}
    </div>
  );
}

function LegendRow({ label, dash, color, dotted }: { label: string; dash: boolean; color: string; dotted?: boolean }) {
  const da = dotted ? '3,3' : dash ? '5,3' : 'none';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <svg width={32} height={10}>
        <line x1={0} y1={5} x2={32} y2={5} stroke={color} strokeWidth={1.5} strokeDasharray={da} />
      </svg>
      <span>{label}</span>
    </div>
  );
}

// ── Connection detail panel ────────────────────────────────────────────────────
function formatEndReason(r: string): string {
  switch (r) {
    case 'death_of_spouse': return 'death of spouse';
    case 'annulment':       return 'annulled';
    case 'divorce':         return 'divorced';
    case 'death':           return 'death';
    default:                return r.replace(/_/g, ' ');
  }
}

function PersonChip({ person }: { person: Person }) {
  const house = person.house_id ? houseById.get(person.house_id) : undefined;
  const born  = person.born?.value.year;
  const died  = person.died?.value.year;
  const reign = person.reign;
  return (
    <div style={{
      background: '#13102a',
      border: `1px solid ${house?.color ?? '#3a3060'}`,
      borderRadius: 5,
      padding: '5px 11px',
      display: 'inline-flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      <span style={{ fontFamily: 'Cinzel, Georgia, serif', fontWeight: 600, fontSize: 12, color: '#e8dfc8', whiteSpace: 'nowrap' }}>
        {person.name}
      </span>
      {reign && (
        <span style={{ fontSize: 10, color: '#d4a843', opacity: 0.9, fontFamily: 'Inter, system-ui, sans-serif' }}>
          r. {reign.start.value.year}–{reign.end?.value.year ?? ''}
        </span>
      )}
      {!reign && (born || died) && (
        <span style={{ fontSize: 10, color: '#7a7060', fontFamily: 'Inter, system-ui, sans-serif' }}>
          {born}{died ? `–${died}` : ''}
        </span>
      )}
    </div>
  );
}

function ConnectionPanel({ conn, onClose }: { conn: SelectedConn; onClose: () => void }) {
  const isPC = conn.type === 'parent_child';

  const typeLabel  = isPC ? 'Descent' : 'Marriage';
  const accentColor = isPC ? '#6060b0' : '#d4a843';

  let subLabel = '';
  if (isPC) {
    subLabel = `${conn.legitimacy} · ${conn.lineName}`;
  } else {
    const parts: string[] = [];
    if (conn.marriageYear)    parts.push(`m. ${conn.marriageYear}`);
    if (conn.marriageEndYear) parts.push(`ended ${conn.marriageEndYear}${conn.marriageEndReason ? ` (${formatEndReason(conn.marriageEndReason)})` : ''}`);
    subLabel = parts.join(' · ');
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(10,8,22,0.97)',
      border: `1px solid ${accentColor}50`,
      borderRadius: 8,
      padding: '14px 18px 16px',
      boxShadow: `0 6px 40px rgba(0,0,0,0.8), 0 0 24px ${accentColor}18`,
      zIndex: 30,
      minWidth: 320,
      maxWidth: 580,
      fontFamily: 'Inter, system-ui, sans-serif',
      pointerEvents: 'auto',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: accentColor, fontWeight: 700,
            background: `${accentColor}18`, borderRadius: 3, padding: '2px 7px',
          }}>
            {typeLabel}
          </span>
          {subLabel && (
            <span style={{ fontSize: 11, color: '#7a7060' }}>{subLabel}</span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: '#5a5070',
            fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 2px',
            marginLeft: 12,
          }}
        >
          ×
        </button>
      </div>

      {/* Body */}
      {isPC ? (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          {conn.parents.map((p, i) => (
            <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <span style={{ color: '#4a4060', fontSize: 14 }}>×</span>}
              <PersonChip person={p} />
            </span>
          ))}
          <span style={{ color: '#4a4060', fontSize: 18, margin: '0 2px' }}>→</span>
          <PersonChip person={conn.child} />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <PersonChip person={conn.spouse1} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 14, height: 2, background: '#d4a843', opacity: 0.7, borderRadius: 1 }} />
            ))}
            <div style={{ width: 7, height: 7, background: '#d4a843', opacity: 0.85, transform: 'rotate(45deg)', borderRadius: 1 }} />
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 14, height: 2, background: '#d4a843', opacity: 0.7, borderRadius: 1 }} />
            ))}
          </div>
          <PersonChip person={conn.spouse2} />
        </div>
      )}
    </div>
  );
}

// ── Overview render ────────────────────────────────────────────────────────────
function renderOverview(
  container: HTMLElement,
  layout: LayoutResult,
  parentChildEdges: ParentChildRelationship[],
  marriageEdges: MarriageRelationship[],
  onNodeClick: (id: string) => void,
  initialPersonId = 'william-i',
  onConnClick?: (conn: SelectedConn) => void,
  onClearConn?: () => void,
  undimRef?: { current: ((() => void) | null) },
) {
  const { pos, unions, personMap, maxGen } = layout;

  const allX = [...pos.values()].map(p => p.x);
  const allY = [...pos.values()].map(p => p.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX) + NODE_W;
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY) + NODE_H;
  const svgW = maxX - minX + PAD * 2;
  const svgH = maxY - minY + NODE_H + PAD * 2;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%').attr('height', '100%')
    .style('cursor', 'grab')
    .style('background', '#06050f');

  const root = svg.append('g');

  // ── Dimming helpers ──────────────────────────────────────────────────────
  function dimAll() {
    root.selectAll('.conn-edge, .conn-marriage, .conn-diamond').attr('opacity', 0.07);
    root.selectAll('.person-node').attr('opacity', 0.1);
  }
  function undimAll() {
    root.selectAll('.conn-edge, .conn-marriage, .conn-diamond').attr('opacity', null);
    root.selectAll('.person-node').attr('opacity', null);
  }
  function highlightConn(connKey: string, ids: string[]) {
    dimAll();
    root.selectAll(`[data-key="${connKey}"]`).attr('opacity', 1);
    root.selectAll(`.conn-edge[data-key="${connKey}"]`)
      .attr('stroke-opacity', 1).attr('stroke-width', 3.5);
    for (const id of ids) {
      root.select(`.person-node[data-id="${id}"]`).attr('opacity', 1);
    }
  }
  if (undimRef) undimRef.current = undimAll;

  // Clicking empty SVG background clears selection
  svg.on('click', () => { undimAll(); onClearConn?.(); });

  // Start centred on initialPersonId at a readable scale, falling back to fit-to-view
  const cW = container.clientWidth || 1200;
  const cH = container.clientHeight || 800;
  const INIT_SCALE = 0.65;
  const personPos = layout.pos.get(initialPersonId);
  const initScale = personPos ? INIT_SCALE : Math.min(cW / svgW, cH / svgH, 1) * 0.9;
  const initX = personPos
    ? cW / 2 - (personPos.x + NODE_W / 2) * INIT_SCALE
    : (cW - svgW * initScale) / 2;
  const initY = personPos
    ? cH / 2 - (personPos.y + NODE_H / 2) * INIT_SCALE
    : (cH - svgH * initScale) / 2;

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.05, 10])
    .on('zoom', ev => {
      root.attr('transform', ev.transform.toString());
    });

  svg.call(zoom);
  svg.call(zoom.transform, d3.zoomIdentity.translate(initX, initY).scale(initScale));

  // Generation bands (subtle)
  for (let g = 0; g <= maxGen; g++) {
    const yBand = g * GEN_HEIGHT - PAD * 0.3;
    root.append('line')
      .attr('x1', minX - PAD).attr('y1', yBand)
      .attr('x2', maxX + PAD).attr('y2', yBand)
      .attr('stroke', 'rgba(212,168,67,0.05)').attr('stroke-width', 1);
  }

  // Draw marriage connectors.
  // Adjacent couples (gap ≈ UNION_GAP): solid gold bar + diamond.
  // Non-adjacent secondary marriages: dashed arc curving above the nodes so it
  // never crosses through unrelated people in the same generation.
  for (const edge of marriageEdges) {
    const ap = pos.get(edge.from_person_id);
    const bp = pos.get(edge.to_person_id);
    if (!ap || !bp || Math.abs(ap.y - bp.y) > 5) continue;

    const left  = ap.x <= bp.x ? ap : bp;
    const right = ap.x <= bp.x ? bp : ap;
    const gap   = right.x - (left.x + NODE_W);
    const x1    = left.x + NODE_W;
    const x2    = right.x;
    const midX  = (x1 + x2) / 2;
    const y     = left.y + NODE_H / 2;
    const mYear = edge.married?.value.year;

    const mKey = pairKey(edge.from_person_id, edge.to_person_id);
    const mHighlight = [edge.from_person_id, edge.to_person_id];
    const mConn: SelectedConn = {
      type: 'marriage',
      spouse1: personMap.get(edge.from_person_id)!,
      spouse2: personMap.get(edge.to_person_id)!,
      marriageYear: edge.married?.value.year,
      marriageEndYear: edge.marriage_ended?.value.year,
      marriageEndReason: edge.marriage_end_reason?.value,
      highlightIds: mHighlight,
      connKey: mKey,
    };
    const onMarriageClick = (e: Event) => {
      e.stopPropagation();
      highlightConn(mKey, mHighlight);
      onConnClick?.(mConn);
    };

    if (gap > UNION_GAP + 10) {
      const cx1   = left.x  + NODE_W / 2;
      const cx2   = right.x + NODE_W / 2;
      const arcY0 = left.y + NODE_H;
      const arcH  = Math.min(GEN_HEIGHT * 0.32, Math.max(28, (cx2 - cx1) * 0.09));
      const arcY  = arcY0 + arcH;
      const midX  = (cx1 + cx2) / 2;
      const arcD  = `M${cx1},${arcY0} C${cx1},${arcY} ${cx2},${arcY} ${cx2},${arcY0}`;

      // Hit area
      root.append('path').attr('d', arcD)
        .attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 14)
        .style('cursor', 'pointer').on('click', onMarriageClick);

      root.append('path').attr('d', arcD)
        .attr('class', 'conn-marriage').attr('data-key', mKey)
        .attr('fill', 'none').attr('stroke', '#d4a843')
        .attr('stroke-width', 1.5).attr('stroke-opacity', 0.5).attr('stroke-dasharray', '5,3');

      const ds = 3.5;
      root.append('polygon')
        .attr('class', 'conn-diamond').attr('data-key', mKey)
        .attr('points', `${midX},${arcY - ds} ${midX + ds},${arcY} ${midX},${arcY + ds} ${midX - ds},${arcY}`)
        .attr('fill', '#d4a843').attr('opacity', 0.55)
        .style('cursor', 'pointer').on('click', onMarriageClick);

      if (mYear) {
        root.append('text')
          .attr('class', 'detail-text')
          .attr('x', midX).attr('y', arcY + 13)
          .attr('text-anchor', 'middle')
          .attr('fill', '#d4a843').attr('font-size', '9px')
          .attr('font-family', 'Inter, system-ui, sans-serif').attr('opacity', 0.55)
          .text(`m. ${mYear}`);
      }
      continue;
    }

    // Adjacent couple: solid bar + diamond
    // Hit area
    root.append('line')
      .attr('x1', x1).attr('y1', y).attr('x2', x2).attr('y2', y)
      .attr('stroke', 'transparent').attr('stroke-width', 14)
      .style('cursor', 'pointer').on('click', onMarriageClick);

    root.append('line')
      .attr('class', 'conn-marriage').attr('data-key', mKey)
      .attr('x1', x1).attr('y1', y).attr('x2', x2).attr('y2', y)
      .attr('stroke', '#d4a843').attr('stroke-width', 2).attr('stroke-opacity', 0.8);

    const ds = 5;
    root.append('polygon')
      .attr('class', 'conn-diamond').attr('data-key', mKey)
      .attr('points', `${midX},${y - ds} ${midX + ds},${y} ${midX},${y + ds} ${midX - ds},${y}`)
      .attr('fill', '#d4a843').attr('opacity', 0.85)
      .style('cursor', 'pointer').on('click', onMarriageClick);

    if (mYear) {
      root.append('text')
        .attr('class', 'detail-text')
        .attr('x', midX).attr('y', y - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#d4a843')
        .attr('font-size', '10px')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('opacity', 0.7)
        .text(`m. ${mYear}`);
    }
  }

  // Draw connectors: children descend from the union diamond midpoint
  drawConnectors(root, unions, pos, parentChildEdges, personMap, onConnClick, highlightConn);

  // Draw person nodes
  drawNodes(root, personMap, pos, (id) => { undimAll(); onNodeClick(id); });

  return { zoom, svgEl: svg };
}

// ── Connector drawing ─────────────────────────────────────────────────────────
function drawConnectors(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  unions: Union[],
  pos: Map<string, LayoutPos>,
  parentChildEdges: ParentChildRelationship[],
  personMap: Map<string, Person>,
  onConnClick?: (conn: SelectedConn) => void,
  onHighlight?: (key: string, ids: string[]) => void,
) {
  for (const union of unions) {
    const validChildren = union.childIds.filter(id => pos.has(id));
    if (validChildren.length === 0) continue;

    const p1Pos = pos.get(union.p1Id);
    if (!p1Pos) continue;

    const parentY = p1Pos.y + NODE_H;

    // Determine union anchor(s).
    // Adjacent parents (gap ≈ UNION_GAP): single connector from the couple midpoint.
    // Non-adjacent parents (secondary spouse far away): draw from BOTH parents so
    // each node is visually connected to their shared children.
    let midX: number;
    let p2AnchorX: number | null = null;
    let p2ParentY: number | null = null;

    if (union.p2Id && pos.has(union.p2Id)) {
      const p2Pos = pos.get(union.p2Id)!;
      const left  = p1Pos.x < p2Pos.x ? p1Pos : p2Pos;
      const right = p1Pos.x < p2Pos.x ? p2Pos : p1Pos;
      const gap   = right.x - (left.x + NODE_W);
      if (gap <= UNION_GAP + FAMILY_GAP) {
        midX = (left.x + NODE_W + right.x) / 2;
      } else {
        // Non-adjacent: anchor from p1 as primary, and also draw from p2
        midX      = p1Pos.x + NODE_W / 2;
        p2AnchorX = p2Pos.x  + NODE_W / 2;
        p2ParentY = p2Pos.y  + NODE_H;
      }
    } else {
      midX = p1Pos.x + NODE_W / 2;
    }

    // Is this an illegitimate / single-parent union?
    const isIllegitimate = union.p2Id === null || union.marriage === null;

    // Draw one bezier per child — clear direct line from union point to each child
    for (const cid of validChildren) {
      const childPos = pos.get(cid)!;
      const childCx  = childPos.x + NODE_W / 2;
      const cY       = childPos.y;
      const mY       = parentY + (cY - parentY) * 0.55;
      const { stroke, dash, lineName, legitimacy } = connectorStyle(union, cid, parentChildEdges, isIllegitimate);

      const connKey   = `${union.id}::${cid}`;
      const highlight = [union.p1Id, ...(union.p2Id ? [union.p2Id] : []), cid];
      const parents   = [personMap.get(union.p1Id), ...(union.p2Id ? [personMap.get(union.p2Id)] : [])].filter(Boolean) as Person[];
      const child     = personMap.get(cid);
      const pcConn: SelectedConn | null = child ? {
        type: 'parent_child',
        parents,
        child,
        legitimacy,
        lineName,
        highlightIds: highlight,
        connKey,
      } : null;

      const onPCClick = (e: Event) => {
        e.stopPropagation();
        if (!pcConn) return;
        onHighlight?.(connKey, highlight);
        onConnClick?.(pcConn);
      };

      const d1 = `M${midX},${parentY} C${midX},${mY} ${childCx},${mY} ${childCx},${cY}`;

      // Hit area (wide, invisible)
      if (onConnClick) {
        root.append('path').attr('d', d1)
          .attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 14)
          .style('cursor', 'pointer').on('click', onPCClick);
      }

      root.append('path')
        .attr('class', 'conn-edge').attr('data-key', connKey)
        .attr('d', d1)
        .attr('fill', 'none')
        .attr('stroke', stroke)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', isIllegitimate ? 0.55 : 0.9)
        .attr('stroke-dasharray', dash);

      // For non-adjacent parents, also draw a dashed line from the second parent
      if (p2AnchorX !== null && p2ParentY !== null) {
        const mY2 = p2ParentY + (cY - p2ParentY) * 0.55;
        const d2  = `M${p2AnchorX},${p2ParentY} C${p2AnchorX},${mY2} ${childCx},${mY2} ${childCx},${cY}`;

        if (onConnClick) {
          root.append('path').attr('d', d2)
            .attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 14)
            .style('cursor', 'pointer').on('click', onPCClick);
        }

        root.append('path')
          .attr('class', 'conn-edge').attr('data-key', connKey)
          .attr('d', d2)
          .attr('fill', 'none')
          .attr('stroke', stroke)
          .attr('stroke-width', 2)
          .attr('stroke-opacity', isIllegitimate ? 0.45 : 0.7)
          .attr('stroke-dasharray', dash === 'none' ? '5,3' : dash);
      }
    }
  }
}

function connectorStyle(
  union: Union,
  childId: string,
  parentChildEdges: ParentChildRelationship[],
  isIllegitimate: boolean,
): { stroke: string; dash: string; lineName: string; legitimacy: string } {
  if (isIllegitimate) return { stroke: '#9a70c0', dash: '3,3', lineName: 'Illegitimate', legitimacy: 'Illegitimate' };

  const femaleEdge = parentChildEdges.find(e =>
    (e.from_person_id === union.p1Id || e.from_person_id === union.p2Id) &&
    e.to_person_id === childId && e.line === 'female'
  );
  const maleEdge = parentChildEdges.find(e =>
    (e.from_person_id === union.p1Id || e.from_person_id === union.p2Id) &&
    e.to_person_id === childId && e.line === 'male'
  );

  const rawLeg = maleEdge?.legitimacy ?? femaleEdge?.legitimacy ?? 'legitimate';
  const legitimacy = rawLeg === 'legitimate' ? 'Legitimate' : 'Illegitimate';

  if (femaleEdge && !maleEdge) {
    return { stroke: '#6060b0', dash: '5,3', lineName: 'Matrilineal', legitimacy };
  }
  return { stroke: '#6060b0', dash: 'none', lineName: 'Patrilineal', legitimacy };
}

// ── Node drawing ──────────────────────────────────────────────────────────────
function drawNodes(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  personMap: Map<string, Person>,
  pos: Map<string, LayoutPos>,
  onNodeClick: (id: string) => void,
) {
  for (const [id, { x, y }] of pos) {
    const person = personMap.get(id);
    if (!person) continue;

    const house = person.house_id ? houseById.get(person.house_id) : undefined;
    const houseColor = house?.color ?? '#2d2650';
    const isMonarch = !!person.reign;

    const ng = root.append('g')
      .attr('class', 'person-node')
      .attr('data-id', id)
      .attr('transform', `translate(${x},${y})`)
      .style('cursor', 'pointer')
      .on('click', (e: Event) => { e.stopPropagation(); onNodeClick(id); });

    // Outer glow for monarchs
    if (isMonarch) {
      ng.append('rect')
        .attr('x', -3).attr('y', -3)
        .attr('width', NODE_W + 6).attr('height', NODE_H + 6)
        .attr('rx', 8)
        .attr('fill', 'none')
        .attr('stroke', houseColor)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.4);
    }

    // Background
    const bgRect = ng.append('rect')
      .attr('width', NODE_W).attr('height', NODE_H).attr('rx', 5)
      .attr('fill', '#0e0c1e')
      .attr('stroke', houseColor)
      .attr('stroke-width', isMonarch ? 2 : 1.2);

    // House colour strip
    ng.append('rect').attr('width', 5).attr('height', NODE_H).attr('rx', 5).attr('fill', houseColor).attr('opacity', 0.95);
    ng.append('rect').attr('x', 2).attr('width', 3).attr('height', NODE_H).attr('fill', houseColor).attr('opacity', 0.95);

    const textX = NODE_W / 2 + 3;
    const labelClass = isMonarch ? 'label-monarch' : 'label-non-monarch';

    // Name
    ng.append('text')
      .attr('class', labelClass)
      .attr('x', textX).attr('y', isMonarch ? 24 : 32)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e8dfc8')
      .attr('font-size', '13px')
      .attr('font-family', 'Cinzel, Georgia, serif')
      .attr('font-weight', '600')
      .text(abbreviate(person.name, 24));

    // Dates
    const born = person.born?.value.year;
    const died = person.died?.value.year;
    if (born || died) {
      const dateStr = born && died ? `${born} – ${died}` : born ? `b. ${born}` : `d. ${died}`;
      ng.append('text')
        .attr('class', `detail-text ${labelClass}`)
        .attr('x', textX).attr('y', isMonarch ? 42 : 52)
        .attr('text-anchor', 'middle')
        .attr('fill', '#7a7060')
        .attr('font-size', '11px')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .text(dateStr);
    }

    // Reign line
    if (person.reign) {
      const rs = person.reign.start.value.year;
      const re = person.reign.end?.value.year;
      ng.append('text')
        .attr('class', 'detail-text label-monarch')
        .attr('x', textX).attr('y', 61)
        .attr('text-anchor', 'middle')
        .attr('fill', '#d4a843')
        .attr('font-size', '10.5px')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('opacity', 0.9)
        .text(`r. ${rs}${re ? '–' + re : '–'}`);

      // Crown
      ng.append('text')
        .attr('class', 'label-monarch')
        .attr('x', 16).attr('y', NODE_H / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#d4a843')
        .attr('font-size', '16px')
        .text('♚');
    }

    // House label
    if (house) {
      ng.append('text')
        .attr('class', 'detail-text')
        .attr('x', NODE_W - 5).attr('y', NODE_H - 6)
        .attr('text-anchor', 'end')
        .attr('fill', houseColor)
        .attr('font-size', '9.5px')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('opacity', 0.7)
        .text(house.name);
    }

    // Hover highlight
    ng.on('mouseenter', () => bgRect.attr('fill', '#18152e'))
      .on('mouseleave', () => bgRect.attr('fill', '#0e0c1e'));

    // Tooltip
    const reStr = person.reign
      ? ` · r. ${person.reign.start.value.year}–${person.reign.end?.value.year ?? ''}`
      : '';
    ng.append('title').text(
      `${person.name}${born ? ` (${born}–${died ?? ''})` : ''}${reStr}${house ? ` · ${house.name}` : ''}`
    );
  }
}

// ── Focused view render ───────────────────────────────────────────────────────
function renderFocused(
  container: HTMLElement,
  focusId: string,
  layout: LayoutResult,
  parentChildEdges: ParentChildRelationship[],
  marriageEdges: MarriageRelationship[],
  onNodeClick: (id: string) => void,
) {
  const { unions, personMap } = layout;

  // Collect people to show: focus + parents + siblings + spouses + children
  const parentsOfFocus = new Set<string>();
  const siblingsOfFocus = new Set<string>();
  const spousesOfFocus = new Set<string>();
  const childrenOfFocus = new Set<string>();

  for (const e of parentChildEdges) {
    if (e.to_person_id === focusId) parentsOfFocus.add(e.from_person_id);
    if (e.from_person_id === focusId) childrenOfFocus.add(e.to_person_id);
  }
  for (const e of marriageEdges) {
    if (e.from_person_id === focusId) spousesOfFocus.add(e.to_person_id);
    if (e.to_person_id === focusId) spousesOfFocus.add(e.from_person_id);
  }
  for (const e of parentChildEdges) {
    // Siblings: share at least one parent with focusId
    if ([...parentsOfFocus].includes(e.from_person_id) && e.to_person_id !== focusId) {
      siblingsOfFocus.add(e.to_person_id);
    }
  }

  // Parents of parents' spouses (to draw their marriage bars)
  const parentSpouses = new Set<string>();
  for (const pid of parentsOfFocus) {
    for (const e of marriageEdges) {
      if (e.from_person_id === pid) parentSpouses.add(e.to_person_id);
      if (e.to_person_id === pid) parentSpouses.add(e.from_person_id);
    }
  }

  // Spouses of children (one generation below)
  const childrenSpouses = new Set<string>();
  for (const cid of childrenOfFocus) {
    for (const e of marriageEdges) {
      if (e.from_person_id === cid) childrenSpouses.add(e.to_person_id);
      if (e.to_person_id === cid) childrenSpouses.add(e.from_person_id);
    }
  }

  // Assign rows: 0=grandparents row (parents+their spouses), 1=focus row, 2=children row
  const FPAD = 80;
  const FGH  = 260;
  const rowY = (r: number) => r * FGH + FPAD;

  type FocusedPeople = { id: string; row: number }[];
  const focusedPeople: FocusedPeople = [];

  // Row 0: parents + their spouses
  const row0People = new Set([...parentsOfFocus, ...parentSpouses]);
  // Sort by birth year
  const row0Sorted = [...row0People].sort((a, b) =>
    (personMap.get(a)?.born?.value.year ?? 9999) - (personMap.get(b)?.born?.value.year ?? 9999)
  );
  for (const id of row0Sorted) focusedPeople.push({ id, row: 0 });

  // Row 1: sort siblings by birth year, then insert focus at centre, then spouses after
  const siblings = [...siblingsOfFocus].sort(
    (a, b) => (personMap.get(a)?.born?.value.year ?? 9999) - (personMap.get(b)?.born?.value.year ?? 9999)
  );
  const spouses = [...spousesOfFocus].sort(
    (a, b) => (personMap.get(a)?.born?.value.year ?? 9999) - (personMap.get(b)?.born?.value.year ?? 9999)
  );
  const focusBirthYear = personMap.get(focusId)?.born?.value.year ?? 9999;
  const insertAt = siblings.findIndex(id => (personMap.get(id)?.born?.value.year ?? 9999) > focusBirthYear);
  const row1Sorted = [...siblings];
  row1Sorted.splice(insertAt === -1 ? row1Sorted.length : insertAt, 0, focusId);
  row1Sorted.push(...spouses);
  for (const id of row1Sorted) focusedPeople.push({ id, row: 1 });

  // Row 2: children + their spouses
  const row2People = new Set([...childrenOfFocus, ...childrenSpouses]);
  const row2Sorted = [...row2People].sort((a, b) =>
    (personMap.get(a)?.born?.value.year ?? 9999) - (personMap.get(b)?.born?.value.year ?? 9999)
  );
  for (const id of row2Sorted) focusedPeople.push({ id, row: 2 });

  // Position nodes
  const fPos = new Map<string, LayoutPos>();
  for (let row = 0; row <= 2; row++) {
    const rowPeople = focusedPeople.filter(p => p.row === row);
    const totalW = rowPeople.length * NODE_W + (rowPeople.length - 1) * UNION_GAP;
    let x = FPAD;
    for (const { id } of rowPeople) {
      fPos.set(id, { x, y: rowY(row) });
      x += NODE_W + UNION_GAP;
    }
    // Centre this row: first node starts at (containerW - totalW) / 2
    const cW = container.clientWidth || 1200;
    const startX = Math.max(FPAD, (cW - totalW) / 2);
    const shift = startX - FPAD;
    for (const { id } of rowPeople) {
      const p = fPos.get(id)!;
      fPos.set(id, { ...p, x: p.x + shift });
    }
  }

  // svgW / svgH unused — SVG fills container via CSS

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%').attr('height', '100%')
    .style('background', '#06050f');

  const root = svg.append('g');

  // Filter unions to only relevant ones
  const relevantPersonIds = new Set(focusedPeople.map(p => p.id));
  const relevantUnions = unions.filter(u =>
    (relevantPersonIds.has(u.p1Id) || (u.p2Id && relevantPersonIds.has(u.p2Id))) &&
    u.childIds.some(c => relevantPersonIds.has(c))
  );

  // Marriage bars for focused view
  for (const edge of marriageEdges) {
    const ap = fPos.get(edge.from_person_id);
    const bp = fPos.get(edge.to_person_id);
    if (!ap || !bp || Math.abs(ap.y - bp.y) > 5) continue;

    const left  = ap.x <= bp.x ? ap : bp;
    const right = ap.x <= bp.x ? bp : ap;
    const midX  = (left.x + NODE_W + right.x) / 2;
    const y     = left.y + NODE_H / 2;

    root.append('line')
      .attr('x1', left.x + NODE_W).attr('y1', y)
      .attr('x2', right.x).attr('y2', y)
      .attr('stroke', '#d4a843').attr('stroke-width', 2).attr('stroke-opacity', 0.8);

    const ds = 5;
    root.append('polygon')
      .attr('points', `${midX},${y - ds} ${midX + ds},${y} ${midX},${y + ds} ${midX - ds},${y}`)
      .attr('fill', '#d4a843').attr('opacity', 0.85);

    const mYear = edge.married?.value.year;
    if (mYear) {
      root.append('text')
        .attr('x', midX).attr('y', y - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#d4a843').attr('font-size', '10px')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('opacity', 0.7).text(`m. ${mYear}`);
    }
  }

  // Connectors for focused view
  drawConnectors(root, relevantUnions, fPos, parentChildEdges, personMap);

  // Nodes — all visible with full labels in focused view
  drawNodes(root, personMap, fPos, onNodeClick);

  // Restore all labels (no LOD in focused view)
  root.selectAll('.label-non-monarch').style('opacity', 1);
  root.selectAll('.detail-text').style('opacity', 1);

  // Focus person highlight
  const focusPos = fPos.get(focusId);
  if (focusPos) {
    const focusPerson = personMap.get(focusId);
    const houseColor = focusPerson?.house_id ? houseById.get(focusPerson.house_id)?.color ?? '#d4a843' : '#d4a843';
    root.insert('rect', ':first-child')
      .attr('x', focusPos.x - 4).attr('y', focusPos.y - 4)
      .attr('width', NODE_W + 8).attr('height', NODE_H + 8)
      .attr('rx', 9)
      .attr('fill', 'none')
      .attr('stroke', houseColor)
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', 0.9);
  }

  // ── Add zoom/pan so content is never clipped ─────────────────────────────
  // Calculate actual content bounds from the laid-out positions
  const allFX = [...fPos.values()].map(p => p.x);
  const contentMinX = Math.min(...allFX) - FPAD;
  const contentMaxX = Math.max(...allFX) + NODE_W + FPAD;
  const contentMinY = 0;
  const contentMaxY = 2 * FGH + FPAD + NODE_H + FPAD;
  const contentW = contentMaxX - contentMinX;
  const contentH = contentMaxY - contentMinY;

  const cW = container.clientWidth  || 1200;
  const cH = container.clientHeight || 800;

  // Scale down to fit if needed, but never scale above 1
  const fitScale = Math.min(cW / contentW, cH / contentH, 1) * 0.92;
  const fitTx = (cW - contentW * fitScale) / 2 - contentMinX * fitScale;
  const fitTy = Math.max(FPAD * fitScale, (cH - contentH * fitScale) / 2);

  const focusZoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.05, 3])
    .on('zoom', ev => root.attr('transform', ev.transform.toString()));

  svg.style('cursor', 'grab').call(focusZoom);
  svg.call(focusZoom.transform, d3.zoomIdentity.translate(fitTx, fitTy).scale(fitScale));
}
