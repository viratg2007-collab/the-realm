import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import clsx from 'clsx';
import { successionClaims, throneConflicts, personById } from '../data/index';
import type { ThroneConflict } from '../types/succession';
import { usePageTitle } from '../hooks/usePageTitle';

// ── animation variants ────────────────────────────────────────────────────────
const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const RIGHT_LABEL: Record<string, string> = {
  stronger:  'Stronger genealogical right',
  weaker:    'Weaker genealogical right',
  disputed:  'Contested genealogical right',
};

const RIGHT_COLOR: Record<string, string> = {
  stronger: 'text-gold border-gold/40 bg-gold/5',
  weaker:   'text-text-muted border-gold/15 bg-void',
  disputed: 'text-amber-400/80 border-amber-400/30 bg-amber-400/5',
};

const OUTCOME_LABEL: Record<string, string> = {
  challenger_prevailed: 'Challenger prevailed',
  defender_prevailed:   'Defender prevailed',
  compromise:           'Compromise',
};

// ── ConflictCard ──────────────────────────────────────────────────────────────
function ConflictCard({ conflict }: { conflict: ThroneConflict }) {
  const defender   = personById.get(conflict.defender.person_id);
  const challenger = personById.get(conflict.challenger.person_id);
  const defenderWon   = conflict.outcome === 'defender_prevailed';
  const challengerWon = conflict.outcome === 'challenger_prevailed';

  return (
    <div className="bg-surface border border-gold/15 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gold/10">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-sans text-xs text-gold/70 tracking-widest">
            {conflict.year_start}{conflict.year_end ? `–${conflict.year_end}` : ''}
          </span>
          <span className="font-sans text-xs text-text-muted/50">·</span>
          <span className={clsx(
            'font-sans text-xs px-2 py-0.5 rounded-full border',
            conflict.outcome === 'compromise'
              ? 'text-amber-400/80 border-amber-400/30 bg-amber-400/5'
              : 'text-text-muted border-gold/15 bg-void'
          )}>
            {OUTCOME_LABEL[conflict.outcome]}
          </span>
        </div>
        <h2 className="font-serif text-xl font-bold text-text-base mb-2">{conflict.title}</h2>
        <p className="font-body text-sm text-text-muted leading-relaxed">{conflict.why_fought}</p>
      </div>

      {/* Combatants */}
      <div className="grid grid-cols-[1fr_auto_1fr]">
        {/* Defender */}
        <div className={clsx(
          'p-5 border-r border-gold/10 flex flex-col gap-2',
          defenderWon && 'bg-gold/3'
        )}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-sans text-xs text-text-muted/60 uppercase tracking-widest">Defender</span>
            {defenderWon && <span className="font-sans text-xs text-gold">✓ Prevailed</span>}
          </div>
          <Link
            to={`/people/${conflict.defender.person_id}`}
            className="font-serif text-base font-bold text-text-base hover:text-gold transition-colors leading-tight"
          >
            {defender?.name ?? conflict.defender.person_id}
          </Link>
          <p className="font-sans text-xs text-text-muted italic">{conflict.defender.role}</p>
          <p className="font-body text-sm text-text-muted leading-relaxed mt-1">{conflict.defender.claim_summary}</p>
          <span className={clsx(
            'mt-auto self-start font-sans text-xs px-2 py-0.5 rounded-full border',
            RIGHT_COLOR[conflict.defender.genealogical_right]
          )}>
            {RIGHT_LABEL[conflict.defender.genealogical_right]}
          </span>
        </div>

        {/* VS divider */}
        <div className="flex items-center justify-center px-3 py-5">
          <span
            className="font-serif text-sm font-bold text-text-muted/30 writing-mode-vertical"
            style={{ writingMode: 'vertical-rl', letterSpacing: '0.2em' }}
          >
            VS
          </span>
        </div>

        {/* Challenger */}
        <div className={clsx(
          'p-5 border-l border-gold/10 flex flex-col gap-2',
          challengerWon && 'bg-gold/3'
        )}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-sans text-xs text-text-muted/60 uppercase tracking-widest">Challenger</span>
            {challengerWon && <span className="font-sans text-xs text-gold">✓ Prevailed</span>}
          </div>
          <Link
            to={`/people/${conflict.challenger.person_id}`}
            className="font-serif text-base font-bold text-text-base hover:text-gold transition-colors leading-tight"
          >
            {challenger?.name ?? conflict.challenger.person_id}
          </Link>
          <p className="font-sans text-xs text-text-muted italic">{conflict.challenger.role}</p>
          <p className="font-body text-sm text-text-muted leading-relaxed mt-1">{conflict.challenger.claim_summary}</p>
          <span className={clsx(
            'mt-auto self-start font-sans text-xs px-2 py-0.5 rounded-full border',
            RIGHT_COLOR[conflict.challenger.genealogical_right]
          )}>
            {RIGHT_LABEL[conflict.challenger.genealogical_right]}
          </span>
        </div>
      </div>

      {/* Outcome + note footer */}
      <div className="px-5 py-3 border-t border-gold/10 bg-void/50 space-y-2">
        <p className="font-body text-xs text-text-muted leading-relaxed">
          <span className="font-sans font-bold text-text-muted/60 uppercase tracking-wider text-xs">Outcome · </span>
          {conflict.outcome_description}
        </p>
        {conflict.note && (
          <p className="font-body text-xs text-gold/60 leading-relaxed border-l-2 border-gold/20 pl-3">
            {conflict.note}
          </p>
        )}
        {conflict.succession_claim_id && (
          <Link
            to={`/succession/${conflict.succession_claim_id}`}
            className="inline-block font-sans text-xs text-gold/60 hover:text-gold transition-colors mt-1"
          >
            Explore assumptions →
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type Tab = 'challenges' | 'crises';

export default function ClaimExplorerPage() {
  usePageTitle('Claim Explorer');
  const [tab, setTab] = useState<Tab>('challenges');

  return (
    <div className="bg-void min-h-[calc(100vh-3.5rem)]">
      {/* Title bar */}
      <div
        className="px-8 pt-8 pb-0 border-b border-gold/10"
        style={{ background: 'rgba(13,11,26,0.98)' }}
      >
        <h1 className="font-serif text-4xl font-bold text-text-base mb-1">Claim Explorer</h1>
        <p className="font-body text-text-muted text-sm mb-5">
          Who fought for the throne, why they fought, and whose claim was stronger
        </p>

        {/* Tabs */}
        <div className="flex gap-0">
          {([
            { id: 'challenges', label: 'Throne Challenges' },
            { id: 'crises',     label: 'Succession Crises' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'relative px-5 py-2.5 font-sans text-sm transition-colors',
                tab === t.id ? 'text-text-base' : 'text-text-muted hover:text-text-base'
              )}
            >
              {t.label}
              {tab === t.id && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-px bg-gold"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-8">
        {tab === 'challenges' ? (
          <motion.div
            key="challenges"
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-5xl mx-auto space-y-6"
          >
            {throneConflicts.map(conflict => (
              <motion.div key={conflict.id} variants={item}>
                <ConflictCard conflict={conflict} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="crises"
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {successionClaims.map(claim => (
              <motion.div key={claim.id} variants={item}>
                <Link
                  to={`/succession/${claim.id}`}
                  className="group block bg-surface border border-gold/15 rounded-lg p-6
                             hover:border-gold/50 hover:bg-surface-2 hover:shadow-gold transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="font-sans text-xs text-gold/70 tracking-widest uppercase">
                      {claim.year.value.year}
                    </span>
                    <span className="font-sans text-xs text-text-muted bg-void px-2 py-0.5 rounded-full border border-gold/15">
                      {claim.throne}
                    </span>
                  </div>
                  <h2 className="font-serif text-xl font-bold text-text-base mb-2 group-hover:text-gold transition-colors leading-tight">
                    {claim.title}
                  </h2>
                  <p className="font-body text-sm text-text-muted leading-relaxed line-clamp-3">
                    {claim.description.value}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-sans text-xs text-text-muted">
                      {claim.claimants.length} claimants · {claim.assumptions.length} assumptions
                    </span>
                    <span className="font-sans text-xs text-gold/60 group-hover:text-gold transition-colors">
                      Explore →
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
