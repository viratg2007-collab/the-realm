import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { successionClaims } from '../data/index';
import { personById, sourceById } from '../data/index';
import { usePageTitle } from '../hooks/usePageTitle';

export default function ClaimPage() {
  const { id } = useParams<{ id: string }>();
  const claim = successionClaims.find(c => c.id === id);
  usePageTitle(claim?.title);

  const [activeAssumptions, setActiveAssumptions] = useState<Set<string>>(
    () => new Set(claim?.assumptions.filter(a => a.default_value).map(a => a.id) ?? [])
  );
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  if (!claim) {
    return (
      <div className="bg-void min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <p className="text-text-muted font-body">Crisis not found.</p>
      </div>
    );
  }

  function toggleAssumption(assumptionId: string) {
    setActiveAssumptions(prev => {
      const next = new Set(prev);
      if (next.has(assumptionId)) next.delete(assumptionId);
      else next.add(assumptionId);
      return next;
    });
  }

  // Compute strength scores
  const scores = useMemo(() => {
    return claim.claimants.map(claimant => {
      let score = 0;
      for (const assumption of claim.assumptions) {
        if (!activeAssumptions.has(assumption.id)) continue;
        const effect = claimant.assumption_effects?.[assumption.id];
        if (effect === 'strengthens') score += 1;
        else if (effect === 'weakens') score -= 1;
      }
      return { claimant, score };
    });
  }, [claim, activeAssumptions]);

  const sorted = [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.claimant.succeeded !== b.claimant.succeeded) return a.claimant.succeeded ? -1 : 1;
    return 0;
  });

  const maxScore = claim.assumptions.length;
  const minScore = -claim.assumptions.length;
  const range = maxScore - minScore || 1;

  function scorePct(score: number) {
    return Math.round(((score - minScore) / range) * 100);
  }

  const rankColors = ['text-gold', 'text-text-muted', 'text-text-muted/60'];

  return (
    <div className="bg-void min-h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div
        className="px-6 py-4 border-b border-gold/10 flex-shrink-0"
        style={{ background: 'rgba(13,11,26,0.98)' }}
      >
        <Link
          to="/succession"
          className="font-sans text-xs text-text-muted hover:text-gold transition-colors mb-3 inline-block"
        >
          ← Claim Explorer
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="font-sans text-xs text-gold/70 tracking-widest uppercase block mb-1">
              {claim.year.value.year} · {claim.throne}
            </span>
            <h1 className="font-serif text-2xl font-bold text-text-base">{claim.title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* Left: description + assumptions */}
        <div className="space-y-6">
          {/* Description */}
          <div>
            <p className="font-body text-sm text-text-muted leading-relaxed">{claim.description.value}</p>
          </div>

          {/* Assumption toggles */}
          <div>
            <h2 className="font-sans text-xs font-bold text-gold/50 uppercase tracking-widest mb-3">
              Assumptions
            </h2>
            <p className="font-body text-xs text-text-muted mb-4 leading-relaxed">
              Toggle each assumption to see how it shifts the balance of claims.
            </p>
            <div className="space-y-3">
              {claim.assumptions.map(assumption => {
                const active = activeAssumptions.has(assumption.id);
                return (
                  <button
                    key={assumption.id}
                    onClick={() => toggleAssumption(assumption.id)}
                    className={clsx(
                      'w-full text-left rounded-lg border p-3 transition-all duration-200',
                      active
                        ? 'border-gold/50 bg-gold/5'
                        : 'border-gold/10 bg-surface hover:border-gold/25'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Toggle pill */}
                      <div className={clsx(
                        'mt-0.5 flex-shrink-0 w-8 h-4 rounded-full transition-colors relative',
                        active ? 'bg-gold' : 'bg-gold/20'
                      )}>
                        <div className={clsx(
                          'absolute top-0.5 w-3 h-3 rounded-full bg-void transition-transform',
                          active ? 'translate-x-4' : 'translate-x-0.5'
                        )} />
                      </div>
                      <div>
                        <p className={clsx(
                          'font-sans text-xs font-semibold leading-tight',
                          active ? 'text-text-base' : 'text-text-muted'
                        )}>
                          {assumption.label}
                        </p>
                        <p className="font-body text-xs text-text-muted mt-0.5 leading-relaxed">
                          {assumption.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: claimants */}
        <div className="space-y-6">
          <div>
            <h2 className="font-sans text-xs font-bold text-gold/50 uppercase tracking-widest mb-4">
              Claimants — ranked by active assumptions
            </h2>

            <div className="space-y-4">
              {sorted.map(({ claimant, score }, rank) => {
                const person = personById.get(claimant.person_id);
                if (!person) return null;
                const pct = scorePct(score);
                const activeEffects = claim.assumptions.filter(a =>
                  activeAssumptions.has(a.id) && claimant.assumption_effects?.[a.id]
                );

                return (
                  <motion.div
                    key={claimant.person_id}
                    layout
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="bg-surface border border-gold/15 rounded-lg p-5"
                  >
                    {/* Name + rank */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={clsx('font-sans text-xs font-bold', rankColors[rank] ?? 'text-text-muted/50')}>
                            #{rank + 1}
                          </span>
                          <Link
                            to={`/people/${claimant.person_id}`}
                            className="font-serif text-lg font-bold text-text-base hover:text-gold transition-colors"
                          >
                            {person.name}
                          </Link>
                          {claimant.succeeded && (
                            <span className="font-sans text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30">
                              Prevailed
                            </span>
                          )}
                        </div>
                        {/* Score bar */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-40 h-1.5 rounded-full bg-void overflow-hidden">
                            <motion.div
                              className={clsx(
                                'h-full rounded-full',
                                score > 0 ? 'bg-gold' : score < 0 ? 'bg-red-800/60' : 'bg-text-muted/30'
                              )}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="font-sans text-xs text-text-muted">
                            {score > 0 ? '+' : ''}{score}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active assumption effects */}
                    {activeEffects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {activeEffects.map(a => {
                          const effect = claimant.assumption_effects![a.id];
                          return (
                            <span
                              key={a.id}
                              className={clsx(
                                'font-sans text-xs px-2 py-0.5 rounded-full border',
                                effect === 'strengthens'
                                  ? 'bg-gold/10 text-gold border-gold/30'
                                  : 'bg-red-900/20 text-red-400/80 border-red-800/30'
                              )}
                            >
                              {effect === 'strengthens' ? '▲' : '▼'} {a.label}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Claim basis */}
                    <p className="font-body text-sm text-text-muted leading-relaxed mb-3">
                      {claimant.claim_basis.description.value}
                    </p>

                    {/* Line of descent */}
                    {claimant.claim_basis.line_of_descent && (
                      <div className="mt-3 pt-3 border-t border-gold/10">
                        <p className="font-sans text-xs font-bold text-gold/40 uppercase tracking-widest mb-1">
                          Line of descent
                        </p>
                        <p className="font-body text-xs text-text-muted leading-relaxed">
                          {claimant.claim_basis.line_of_descent}
                        </p>
                      </div>
                    )}

                    {/* Contemporary argument */}
                    {claimant.claim_basis.contemporary_argument && (
                      <div className="mt-3 pt-3 border-t border-gold/10">
                        <p className="font-sans text-xs font-bold text-gold/40 uppercase tracking-widest mb-1">
                          How contemporaries argued it
                        </p>
                        <p className="font-body text-xs text-text-muted italic leading-relaxed">
                          {claimant.claim_basis.contemporary_argument.value}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Contested questions */}
          {claim.contested_questions.length > 0 && (
            <div>
              <h2 className="font-sans text-xs font-bold text-gold/50 uppercase tracking-widest mb-3">
                Contested Questions
              </h2>
              <div className="space-y-2">
                {claim.contested_questions.map((q, i) => (
                  <div key={i} className="bg-surface border border-gold/10 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setOpenQuestion(openQuestion === i ? null : i)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-2 transition-colors"
                    >
                      <span className="font-body text-sm text-text-base">{q.question}</span>
                      <span className="text-text-muted text-xs flex-shrink-0">
                        {openQuestion === i ? '▲' : '▼'}
                      </span>
                    </button>
                    <AnimatePresence>
                      {openQuestion === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3 border-t border-gold/10">
                            {q.positions.map((pos, pi) => {
                              const posLabel = pi === 0 ? 'Position A' : pi === 1 ? 'Position B' : `Position ${String.fromCharCode(65 + pi)}`;
                              const sources = pos.source_ids
                                .map(sr => sourceById.get(typeof sr === 'string' ? sr : sr.source_id))
                                .filter(Boolean);
                              return (
                                <div key={pi} className="pt-3">
                                  <p className="font-sans text-xs font-bold text-gold/40 uppercase tracking-widest mb-1">
                                    {posLabel}
                                  </p>
                                  <p className="font-body text-sm text-text-muted leading-relaxed">
                                    {pos.position}
                                  </p>
                                  {sources.length > 0 && (
                                    <p className="font-sans text-xs text-text-muted/50 mt-1">
                                      {sources.map(s => {
                                        const a = s!.author;
                                        if (!a) return s!.id;
                                        const first = Array.isArray(a) ? a[0] : a;
                                        return first.split(',')[0];
                                      }).join(', ')}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
