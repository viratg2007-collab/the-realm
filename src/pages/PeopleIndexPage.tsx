import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { people, houses } from '../data/index';
import HouseBadge from '../components/HouseBadge';
import { formatDate, dateYear } from '../validation/schema';
import { usePageTitle } from '../hooks/usePageTitle';

const sorted = [...people].sort((a, b) => {
  const ya = a.born ? dateYear(a.born.value) : null;
  const yb = b.born ? dateYear(b.born.value) : null;
  if (ya === null && yb === null) return 0;
  if (ya === null) return 1;
  if (yb === null) return -1;
  return ya - yb;
});

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function PeopleIndexPage() {
  usePageTitle('People');

  const [query, setQuery]       = useState('');
  const [houseFilter, setHouse] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter(p => {
      if (houseFilter && p.house_id !== houseFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) &&
               !(p.also_known_as ?? []).some(a => a.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [query, houseFilter]);

  return (
    <div className="bg-void min-h-[calc(100vh-3.5rem)] p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-4xl font-bold text-text-base mb-1">People</h1>
          <p className="font-body text-text-muted text-sm">
            {filtered.length === sorted.length
              ? `${sorted.length} figures from 849 to 1714`
              : `${filtered.length} of ${sorted.length} figures`}
          </p>
          <div className="mt-3 w-16 h-px bg-gold/40" />
        </div>

        {/* Search + filter row */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Search by name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full sm:max-w-xs bg-surface border border-gold/20 rounded px-4 py-2
                       font-sans text-sm text-text-base placeholder:text-text-muted/50
                       focus:outline-none focus:border-gold/50 transition-colors"
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setHouse(null)}
              className={`font-sans text-xs px-3 py-1.5 rounded border transition-colors ${
                houseFilter === null
                  ? 'border-gold/60 text-gold bg-gold/10'
                  : 'border-gold/20 text-text-muted hover:border-gold/40'
              }`}
            >
              All
            </button>
            {houses.map(h => (
              <button
                key={h.id}
                onClick={() => setHouse(houseFilter === h.id ? null : h.id)}
                className={`font-sans text-xs px-3 py-1.5 rounded border transition-colors ${
                  houseFilter === h.id
                    ? 'text-white border-transparent'
                    : 'border-gold/20 text-text-muted hover:border-gold/40'
                }`}
                style={houseFilter === h.id ? { backgroundColor: h.color, borderColor: h.color } : {}}
              >
                {h.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <p className="font-body text-text-muted text-sm mt-12 text-center">No figures match that search.</p>
        ) : (
          <motion.div
            key={`${query}-${houseFilter}`}
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filtered.map(person => {
              const bornStr = person.born ? formatDate(person.born.value) : null;
              const diedStr = person.died ? formatDate(person.died.value) : null;
              const dates = bornStr || diedStr
                ? [bornStr ?? '?', diedStr ?? 'present'].join(' – ')
                : null;
              const snippet = person.summary.value.length > 110
                ? person.summary.value.slice(0, 110) + '…'
                : person.summary.value;

              return (
                <motion.div key={person.id} variants={item}>
                  <Link
                    to={`/people/${person.id}`}
                    className="group block bg-surface border border-gold/15 rounded-lg p-5
                               hover:border-gold/50 hover:bg-surface-2 hover:shadow-gold transition-all duration-300"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span className="font-serif text-base font-semibold text-text-base group-hover:text-gold transition-colors">
                        {person.name}
                      </span>
                      {person.house_id && <HouseBadge houseId={person.house_id} />}
                    </div>
                    {dates && (
                      <p className="text-xs text-text-muted font-sans mb-2">{dates}</p>
                    )}
                    <p className="font-body text-sm text-text-muted leading-relaxed">{snippet}</p>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
