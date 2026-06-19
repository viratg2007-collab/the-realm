import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';

// ── nav cards ────────────────────────────────────────────────────────────────

interface NavCard {
  title: string;
  to: string;
  category: string;
  description: string;
  accent: string;
}

const cards: NavCard[] = [
  {
    title: 'Dynastic Tree',
    to: '/tree',
    category: 'Genealogy',
    description: 'Follow bloodlines from Alfred of Wessex to the House of Stuart — six centuries of succession, war, and inheritance traced through every marriage and legitimacy dispute.',
    accent: '#8B1A1A',
  },
  {
    title: 'People',
    to: '/people',
    category: 'Biography',
    description: '169 monarchs, nobles, and claimants. Every figure fully sourced, with birth, death, house, and the events that defined their reign or downfall.',
    accent: '#d4a843',
  },
  {
    title: 'Timeline',
    to: '/timeline',
    category: 'History',
    description: 'From the shield-wall at Edington to the Convention Parliament of 1689 — the pivotal battles, treaties, and legislation that shaped the realm, filtered by theme.',
    accent: '#b87c3c',
  },
  {
    title: 'Historical Map',
    to: '/map',
    category: 'Geography',
    description: 'Battle sites, royal birthplaces, and palaces of power mapped across England, Wales, Ireland, France, and the Continent — 47 locations with their histories.',
    accent: '#3e8b53',
  },
  {
    title: 'Royal Houses',
    to: '/houses',
    category: 'Heraldry',
    description: 'Norman ambition, Plantagenet grandeur, Lancastrian usurpation, Tudor calculation, Stuart hubris — the dynasties that contested and held the English crown.',
    accent: '#9B7A1A',
  },
  {
    title: 'Claim Explorer',
    to: '/succession',
    category: 'Succession',
    description: 'Who had the stronger legal claim? Toggle dynastic assumptions to see how contemporaries argued the question — from the Conquest to the Glorious Revolution.',
    accent: '#5c3d8f',
  },
];

// ── dynasty strip ─────────────────────────────────────────────────────────────

const HOUSES = [
  { name: 'Wessex',       dates: '849–1016',  color: '#9B7A1A' },
  { name: 'Denmark',      dates: '1016–1042', color: '#1B3A6B' },
  { name: 'Norman',       dates: '1066–1154', color: '#4a7c59' },
  { name: 'Plantagenet',  dates: '1154–1399', color: '#8B1A1A' },
  { name: 'Lancaster',    dates: '1399–1461', color: '#C41E3A' },
  { name: 'York',         dates: '1461–1485', color: '#c0bfbb' },
  { name: 'Tudor',        dates: '1485–1603', color: '#1A5C1A' },
  { name: 'Stuart',       dates: '1603–1714', color: '#7c5cb8' },
];

// ── animation variants ────────────────────────────────────────────────────────

const heroVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};

const cardContainer: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

// ── component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="bg-void">

      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden flex flex-col"
        style={{ height: 'calc(100vh - 3.5rem)' }}
      >
        {/* Painting */}
        <img
          src="/britannia.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 18%' }}
        />

        {/* Gradient overlay — painting shows through top, text emerges from dark */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom,' +
              'rgba(13,11,26,0.22) 0%,' +
              'rgba(13,11,26,0.28) 35%,' +
              'rgba(13,11,26,0.72) 60%,' +
              'rgba(13,11,26,0.95) 78%,' +
              'rgba(13,11,26,1.00) 100%)',
          }}
        />

        {/* Left + right side vignettes */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right,' +
              'rgba(13,11,26,0.55) 0%,' +
              'transparent 20%,' +
              'transparent 80%,' +
              'rgba(13,11,26,0.55) 100%)',
          }}
        />

        {/* Hero text — anchored to the bottom */}
        <motion.div
          className="relative z-10 flex-1 flex flex-col items-center justify-end pb-14 px-6 text-center"
          variants={heroVariants}
          initial="hidden"
          animate="show"
        >
          <p className="font-sans text-[11px] text-text-muted/60 tracking-[0.4em] uppercase mb-5">
            An Interactive Atlas of British History
          </p>

          <h1
            className="font-serif font-bold text-text-base leading-none"
            style={{
              fontSize: 'clamp(4rem, 10vw, 8.5rem)',
              textShadow: '0 2px 60px rgba(212,168,67,0.35), 0 0 120px rgba(212,168,67,0.15)',
            }}
          >
            The Realm
          </h1>

          {/* Ornamental rule */}
          <div className="mt-6 flex items-center gap-3 justify-center">
            <div className="h-px bg-gradient-to-r from-transparent to-gold/60" style={{ width: 'clamp(40px, 8vw, 96px)' }} />
            <span className="text-gold/50 text-base select-none">✦</span>
            <div className="h-px bg-gradient-to-l from-transparent to-gold/60" style={{ width: 'clamp(40px, 8vw, 96px)' }} />
          </div>

          <p className="mt-5 font-body text-text-muted leading-relaxed max-w-lg"
            style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.125rem)' }}
          >
            Nine centuries of English monarchy —<br className="hidden sm:inline" />
            from Alfred the Great to the fall of the Stuarts
          </p>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
        >
          <div className="w-px h-8 bg-gradient-to-b from-gold/30 to-transparent" />
        </motion.div>
      </section>

      {/* ═══ DYNASTY STRIP ══════════════════════════════════════════════════ */}
      <div
        className="border-y border-gold/10 overflow-x-auto"
        style={{ background: 'rgba(10,8,20,0.99)' }}
      >
        <div className="flex items-stretch min-w-max">
          {HOUSES.map((h, i) => (
            <div key={h.name} className="flex items-stretch">
              {i > 0 && <div className="w-px bg-gold/10 self-stretch" />}
              <div className="flex flex-col items-center gap-1 px-6 py-4">
                <div
                  className="w-1.5 h-1.5 rounded-full mb-0.5"
                  style={{ backgroundColor: h.color, boxShadow: `0 0 6px ${h.color}80` }}
                />
                <span className="font-sans text-xs font-semibold text-text-base tracking-wide whitespace-nowrap">
                  {h.name}
                </span>
                <span className="font-sans text-[10px] text-text-muted/45 tracking-widest whitespace-nowrap">
                  {h.dates}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CARDS ══════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-6 py-14">
        <motion.div
          variants={cardContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {cards.map(card => (
            <motion.div key={card.to} variants={cardItem}>
              <Link
                to={card.to}
                className="group relative flex flex-col rounded-md border border-gold/15 overflow-hidden
                           hover:border-gold/40 hover:shadow-gold transition-all duration-300"
                style={{ background: 'rgba(22,19,40,0.80)' }}
              >
                {/* Colored accent line */}
                <div className="h-[2px] w-full" style={{ backgroundColor: card.accent }} />

                <div className="flex flex-col flex-1 p-6">
                  <p className="font-sans text-[10px] uppercase tracking-[0.2em] mb-3"
                    style={{ color: card.accent + 'cc' }}
                  >
                    {card.category}
                  </p>
                  <h2 className="font-serif text-xl font-bold text-text-base mb-3 group-hover:text-gold transition-colors duration-200 leading-tight">
                    {card.title}
                  </h2>
                  <p className="font-body text-sm text-text-muted leading-relaxed flex-1">
                    {card.description}
                  </p>
                  <p className="mt-5 font-sans text-xs text-text-muted/40 group-hover:text-gold/70 transition-colors duration-200">
                    Explore →
                  </p>
                </div>

                {/* Subtle inner glow on hover */}
                <div
                  className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: `inset 0 0 40px ${card.accent}0a` }}
                />
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
        >
          {[
            '169 figures',
            '40 events',
            '48 places',
            '8 royal houses',
            '849 — 1714',
          ].map((stat, i) => (
            <span key={stat} className="flex items-center gap-6">
              {i > 0 && <span className="text-gold/15 hidden sm:inline">·</span>}
              <span className="font-sans text-xs text-text-muted/35 tracking-widest uppercase">
                {stat}
              </span>
            </span>
          ))}
        </motion.div>
      </div>

    </div>
  );
}
