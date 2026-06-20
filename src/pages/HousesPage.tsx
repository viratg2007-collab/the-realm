import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { houses, people } from '../data/index';
import { formatDate } from '../validation/schema';
import { usePageTitle } from '../hooks/usePageTitle';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function HousesPage() {
  usePageTitle('Royal Houses');
  return (
    <div className="bg-void min-h-[calc(100vh-3.5rem)] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold text-text-base mb-1">Royal Houses</h1>
          <p className="font-body text-text-muted text-sm">Norman through Stuart — six dynasties, six centuries</p>
          <div className="mt-3 w-16 h-px bg-gold/40" />
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {houses.map(house => {
            const houseMembers = people.filter(p => p.house_id === house.id);
            const periodStart = formatDate(house.period_start);
            const periodEnd = house.period_end ? formatDate(house.period_end) : 'present';

            return (
              <motion.div key={house.id} variants={item}>
                <div className="bg-surface border border-gold/15 rounded-lg overflow-hidden hover:border-gold/40 hover:shadow-gold transition-all duration-300">
                  {/* Colored header bar */}
                  <div className="h-1" style={{ backgroundColor: house.color }} />
                  <div
                    className="h-16 flex items-center px-6"
                    style={{
                      background: `linear-gradient(135deg, ${house.color}26, ${house.color}08)`,
                      borderBottom: `1px solid ${house.color}30`,
                    }}
                  >
                    <div className="flex items-center justify-between w-full gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="font-serif text-xl leading-none select-none"
                          style={{ color: house.color, textShadow: `0 0 12px ${house.color}66` }}
                          aria-hidden="true"
                        >
                          ♚
                        </span>
                        <h2 className="font-serif text-xl font-bold text-text-base">
                          House of {house.name}
                        </h2>
                      </div>
                      <span className="font-sans text-xs text-text-muted/80 tracking-widest uppercase flex-shrink-0">
                        {periodStart} – {periodEnd}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="font-body text-sm text-text-muted leading-relaxed mb-5">
                      {house.summary.value}
                    </p>

                    {houseMembers.length > 0 && (
                      <div>
                        <h3 className="font-sans text-xs font-semibold text-gold/50 uppercase tracking-widest mb-2">
                          Monarchs in dataset
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {houseMembers.map(person => (
                            <Link
                              key={person.id}
                              to={`/people/${person.id}`}
                              className="font-body text-xs px-3 py-1 rounded-full border border-gold/20 text-text-muted
                                         hover:border-gold/60 hover:text-gold transition-colors"
                            >
                              {person.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
