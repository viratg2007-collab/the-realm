import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GOLD = '#d4a843';
const SEEN_KEY = 'realm-intro-seen';

/** Keys that shouldn't count as "any key" — pressing them alone isn't intent. */
const IGNORED_KEYS = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
  'NumLock', 'ScrollLock', 'Fn', 'FnLock', 'Hyper', 'Super', 'Dead',
]);

interface IntroAnimationProps {
  /** If true, always play regardless of sessionStorage or reduced-motion. */
  force?: boolean;
}

/**
 * Cinematic opening animation that plays once per browser session.
 * Sequence: dark → ornamental corners draw in → gold sigil spreads →
 * "THE REALM" title fades up → subtitle → the whole thing dissolves
 * to reveal the homepage.
 */
export default function IntroAnimation({ force = false }: IntroAnimationProps) {
  const [visible, setVisible] = useState<boolean>(() => {
    if (force) return true;
    if (typeof window === 'undefined') return false;
    // Respect an explicit OS-level request for less motion — skip the whole sequence.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    try {
      return sessionStorage.getItem(SEEN_KEY) !== '1';
    } catch {
      return true; // private mode — play it, just can't remember it
    }
  });

  const dismiss = useCallback(() => {
    setVisible(false);
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, 3800);
    return () => clearTimeout(t);
  }, [visible, dismiss]);

  // Allow user to skip with any key
  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      // Leave browser/OS shortcuts (⌘R, ctrl+T, …) alone.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (IGNORED_KEYS.has(e.key)) return;
      dismiss();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, dismiss]);

  // Lock scroll while the overlay covers the page. <html> is the scrolling
  // element here, so locking <body> alone wouldn't take effect.
  useEffect(() => {
    if (!visible) return;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    const previousPadding = html.style.paddingRight;
    // Classic scrollbars vanish with the lock; pad to keep layout from jumping.
    const scrollbarWidth = window.innerWidth - html.clientWidth;

    html.style.overflow = 'hidden';
    if (scrollbarWidth > 0) html.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      html.style.overflow = previousOverflow;
      html.style.paddingRight = previousPadding;
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden cursor-pointer"
          style={{ background: '#07060f' }}
          onClick={dismiss}
          aria-label="Loading The Realm — click or press any key to skip"
          role="dialog"
        >
          {/* Radial gold glow behind everything */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            style={{
              background:
                `radial-gradient(circle at center, ${GOLD}22 0%, transparent 55%)`,
            }}
          />

          {/* Ornamental frame — four corner brackets drawing themselves */}
          <svg
            width="580"
            height="380"
            viewBox="0 0 580 380"
            fill="none"
            className="absolute pointer-events-none"
            aria-hidden="true"
          >
            {[
              // top-left
              'M 10 60 L 10 10 L 60 10',
              // top-right
              'M 570 60 L 570 10 L 520 10',
              // bottom-left
              'M 10 320 L 10 370 L 60 370',
              // bottom-right
              'M 570 320 L 570 370 L 520 370',
            ].map((d, i) => (
              <motion.path
                key={i}
                d={d}
                stroke={GOLD}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{
                  duration: 1.1,
                  delay: 0.35 + i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  filter: `drop-shadow(0 0 6px ${GOLD}90)`,
                }}
              />
            ))}
          </svg>

          {/* Central content */}
          <div className="relative flex flex-col items-center px-6 text-center">
            {/* Sigil / fleuron that spreads open */}
            <motion.div
              className="mb-8 select-none"
              initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.9, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                color: GOLD,
                fontSize: '3.5rem',
                lineHeight: 1,
                textShadow: `0 0 24px ${GOLD}80, 0 0 60px ${GOLD}40`,
                fontFamily: 'Cinzel, Georgia, serif',
              }}
            >
              ✦
            </motion.div>

            {/* Small pre-title kicker */}
            <motion.p
              className="font-sans tracking-[0.6em] text-[10px] mb-4 uppercase"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.7 }}
              style={{ color: `${GOLD}80` }}
            >
              An Interactive Atlas
            </motion.p>

            {/* Title — letters revealing one by one */}
            <motion.h1
              className="font-serif font-bold leading-none"
              style={{
                fontSize: 'clamp(3rem, 8vw, 6rem)',
                color: '#f5efe0',
                textShadow: `0 2px 30px ${GOLD}66, 0 0 80px ${GOLD}33`,
                letterSpacing: '0.06em',
              }}
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.06, delayChildren: 1.55 } },
              }}
              aria-label="The Realm"
            >
              {'THE REALM'.split('').map((char, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  style={{ minWidth: char === ' ' ? '0.4em' : undefined }}
                  variants={{
                    hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
                    show: {
                      opacity: 1,
                      y: 0,
                      filter: 'blur(0px)',
                      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                    },
                  }}
                >
                  {char === ' ' ? ' ' : char}
                </motion.span>
              ))}
            </motion.h1>

            {/* Ornamental rule + gold flourish */}
            <motion.div
              className="flex items-center gap-3 mt-8"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 2.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'center' }}
            >
              <div
                className="h-px w-24 sm:w-32"
                style={{ background: `linear-gradient(to right, transparent, ${GOLD}99)` }}
              />
              <span
                className="text-sm select-none"
                style={{ color: `${GOLD}b3`, textShadow: `0 0 8px ${GOLD}66` }}
              >
                ✦
              </span>
              <div
                className="h-px w-24 sm:w-32"
                style={{ background: `linear-gradient(to left, transparent, ${GOLD}99)` }}
              />
            </motion.div>

            {/* Subtitle */}
            <motion.p
              className="font-body italic text-sm sm:text-base mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.9, duration: 0.9 }}
              style={{ color: '#c8bfa8' }}
            >
              Nine centuries of English monarchy
            </motion.p>
          </div>

          {/* Skip hint */}
          <motion.p
            className="absolute bottom-6 font-sans text-[10px] tracking-[0.3em] uppercase pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 2.6, duration: 0.7 }}
            style={{ color: '#c8bfa8' }}
          >
            Press any key to skip
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
