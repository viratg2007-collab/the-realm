import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  personById,
  sourceById,
  parentsOf,
  spousesOf,
  childrenOf,
} from '../data/index';
import type { SourceRef } from '../types';
import HouseBadge from '../components/HouseBadge';
import CitationList from '../components/CitationList';
import NotFoundPage from './NotFoundPage';
import { formatDate } from '../validation/schema';
import { houses } from '../data/index';

function collectAllSourceIds(refs: SourceRef[]): string[] {
  return refs.map(r => r.source_id);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-sans text-xs font-semibold text-gold/60 uppercase tracking-[0.2em] mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const person = id ? personById.get(id) : undefined;
  usePageTitle(person?.name);

  if (!person) {
    return <NotFoundPage />;
  }

  const parents = parentsOf(person.id);
  const spouses = spousesOf(person.id);
  const children = childrenOf(person.id);

  const allSourceIds = new Set<string>();
  const addRefs = (refs: SourceRef[]) => collectAllSourceIds(refs).forEach(s => allSourceIds.add(s));

  addRefs(person.source_ids);
  addRefs(person.summary.source_ids);
  if (person.born) addRefs(person.born.source_ids);
  if (person.died) addRefs(person.died.source_ids);
  if (person.cause_of_death) addRefs(person.cause_of_death.source_ids);
  person.titles?.forEach(t => addRefs(t.source_ids));
  if (person.reign) {
    addRefs(person.reign.start.source_ids);
    if (person.reign.end) addRefs(person.reign.end.source_ids);
    if (person.reign.end_reason) addRefs(person.reign.end_reason.source_ids);
  }

  const bornYear = person.born?.value.year;
  const diedYear = person.died?.value.year;
  const ageAtDeath = (bornYear && diedYear) ? diedYear - bornYear : null;

  const sexIcon = person.sex === 'M' ? '♂' : person.sex === 'F' ? '♀' : '';

  // Resolve the house colour for the heraldic crest slot.
  const house      = person.house_id ? houses.find(h => h.id === person.house_id) : undefined;
  const houseColor = house?.color ?? '#d4a843';
  const reigned    = !!person.reign;

  return (
    <div className="bg-void min-h-[calc(100vh-3.5rem)] p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-3xl mx-auto"
      >
        {/* Back + tree link */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/people"
            className="inline-flex items-center gap-1 font-sans text-xs text-text-muted hover:text-gold transition-colors"
          >
            ← All People
          </Link>
          <Link
            to={`/tree?focus=${person.id}`}
            className="inline-flex items-center gap-1 font-sans text-xs text-text-muted hover:text-gold transition-colors"
          >
            View in Tree →
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 border-b border-gold/15 pb-6">
          <div className="flex items-start gap-5 mb-3">
            {/* Heraldic crest slot — coloured by house, crown if reigning */}
            <div
              className="flex-shrink-0 w-16 h-16 rounded border flex items-center justify-center mt-1 select-none"
              style={{
                background: `linear-gradient(135deg, ${houseColor}30, ${houseColor}08)`,
                borderColor: `${houseColor}66`,
                boxShadow: `0 0 18px ${houseColor}26, inset 0 0 12px ${houseColor}14`,
              }}
              aria-hidden="true"
            >
              <span
                className="font-serif text-3xl leading-none"
                style={{ color: houseColor, textShadow: `0 0 10px ${houseColor}80` }}
              >
                {reigned ? '♚' : person.sex === 'F' ? '♛' : '✦'}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-4xl font-bold text-text-base leading-tight">{person.name}</h1>
                {person.house_id && <HouseBadge houseId={person.house_id} />}
                {sexIcon && <span className="text-text-muted text-2xl">{sexIcon}</span>}
              </div>
              {person.reign && (
                <p className="font-sans text-xs text-gold/70 tracking-widest uppercase mt-2">
                  Reigned {formatDate(person.reign.start.value)}
                  {person.reign.end ? ` – ${formatDate(person.reign.end.value)}` : ''}
                </p>
              )}
            </div>
          </div>

          {person.born && (
            <div className="mb-1">
              <span className="text-sm font-sans text-text-muted">Born: </span>
              <span className="font-body text-sm text-text-base">
                {formatDate(person.born.value)}
                {person.born.value.notes && (
                  <span className="text-text-muted"> — {person.born.value.notes}</span>
                )}
              </span>
              {person.born.disputed && (
                <span className="ml-2 inline-block bg-gold/10 text-gold text-xs font-sans px-2 py-0.5 rounded border border-gold/20">
                  Disputed
                </span>
              )}
              <CitationList refs={person.born.source_ids} />
              {person.born.disputed && (
                <div className="mt-1 ml-4 space-y-1">
                  {person.born.disputed.alternatives.map((alt, i) => (
                    <div key={i} className="text-xs text-text-muted font-body">
                      Alt: {formatDate(alt.value)}
                      {alt.note && <span className="italic"> — {alt.note}</span>}
                      <CitationList refs={alt.source_ids} />
                    </div>
                  ))}
                  {person.born.disputed.consensus_note && (
                    <p className="text-xs text-text-muted font-body italic mt-1">
                      {person.born.disputed.consensus_note}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {person.died && (
            <div className="mb-1">
              <span className="text-sm font-sans text-text-muted">Died: </span>
              <span className="font-body text-sm text-text-base">
                {formatDate(person.died.value)}
                {person.died.value.notes && (
                  <span className="text-text-muted"> — {person.died.value.notes}</span>
                )}
              </span>
              <CitationList refs={person.died.source_ids} />
            </div>
          )}

          {person.cause_of_death && (
            <div className="mb-1">
              <span className="text-sm font-sans text-text-muted">Cause of death: </span>
              <span className="font-body text-sm text-text-base">{person.cause_of_death.value}</span>
              <CitationList refs={person.cause_of_death.source_ids} />
            </div>
          )}

          {ageAtDeath !== null && (
            <p className="mb-1">
              <span className="text-sm font-sans text-text-muted">Age at death: </span>
              <span className="font-body text-sm text-text-base">{ageAtDeath}</span>
            </p>
          )}
        </div>

        {/* Also known as */}
        {person.also_known_as && person.also_known_as.length > 0 && (
          <Section title="Also known as">
            <p className="font-body text-sm text-text-muted">{person.also_known_as.join(' · ')}</p>
          </Section>
        )}

        {/* Titles */}
        {person.titles && person.titles.length > 0 && (
          <Section title="Titles">
            <ul className="space-y-2">
              {person.titles.map((title, i) => (
                <li key={i} className="font-body text-sm text-text-base">
                  <span className="font-semibold">{title.name}</span>
                  {title.start && (
                    <span className="text-text-muted">
                      {' '}({formatDate(title.start)}
                      {title.end ? ` – ${formatDate(title.end)}` : ''})
                    </span>
                  )}
                  <CitationList refs={title.source_ids} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Summary */}
        <Section title="Summary">
          <p className="font-body text-base text-text-base leading-relaxed">{person.summary.value}</p>
          <CitationList refs={person.summary.source_ids} />
        </Section>

        {/* Relationships */}
        {(parents.length > 0 || spouses.length > 0 || children.length > 0) && (
          <Section title="Relationships">
            <div className="bg-surface border border-gold/15 rounded-lg p-5 space-y-5">
              {parents.length > 0 && (
                <div>
                  <h3 className="text-xs font-sans font-semibold text-text-muted uppercase tracking-wide mb-2">Parents</h3>
                  <ul className="space-y-1">
                    {parents.map(({ person: parent, rel }) => (
                      <li key={parent.id} className="font-body text-sm">
                        <Link to={`/people/${parent.id}`} className="text-gold hover:text-gold/70 transition-colors">
                          {parent.name}
                        </Link>
                        <span className="text-text-muted ml-2">
                          ({rel.line === 'male' ? 'father' : 'mother'}, {rel.legitimacy})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {spouses.length > 0 && (
                <div>
                  <h3 className="text-xs font-sans font-semibold text-text-muted uppercase tracking-wide mb-2">Spouses</h3>
                  <ul className="space-y-1">
                    {spouses.map(({ person: spouse, rel }) => (
                      <li key={spouse.id} className="font-body text-sm">
                        <Link to={`/people/${spouse.id}`} className="text-gold hover:text-gold/70 transition-colors">
                          {spouse.name}
                        </Link>
                        {rel.married && (
                          <span className="text-text-muted ml-2">
                            (married {formatDate(rel.married.value)})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {children.length > 0 && (
                <div>
                  <h3 className="text-xs font-sans font-semibold text-text-muted uppercase tracking-wide mb-2">Children</h3>
                  <ul className="space-y-1">
                    {children.map(({ person: child, rel }) => (
                      <li key={child.id} className="font-body text-sm">
                        <Link to={`/people/${child.id}`} className="text-gold hover:text-gold/70 transition-colors">
                          {child.name}
                        </Link>
                        <span className="text-text-muted ml-2">
                          ({rel.line === 'male' ? 'patrilineal' : 'matrilineal'}, {rel.legitimacy})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* All sources */}
        {allSourceIds.size > 0 && (
          <section className="mb-8 border-t border-gold/15 pt-6">
            <h2 className="font-sans text-xs font-semibold text-gold/60 uppercase tracking-[0.2em] mb-3">
              Sources
            </h2>
            <ul className="space-y-2">
              {[...allSourceIds].map(sid => {
                const source = sourceById.get(sid);
                if (!source) return null;
                const author = source.author
                  ? Array.isArray(source.author)
                    ? source.author.join(', ')
                    : source.author
                  : null;
                return (
                  <li key={sid} className="text-xs text-text-muted font-body">
                    {author && <span className="font-semibold text-text-base">{author}. </span>}
                    <span className="italic">{source.title}</span>
                    {source.entry && <span>: {source.entry}</span>}
                    {source.year && <span> ({source.year})</span>}
                    {source.publisher && <span>. {source.publisher}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </motion.div>
    </div>
  );
}
