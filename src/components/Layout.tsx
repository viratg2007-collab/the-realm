import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const navLinks = [
  { to: '/people', label: 'People' },
  { to: '/tree', label: 'Tree' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/map', label: 'Map' },
  { to: '/houses', label: 'Houses' },
  { to: '/succession', label: 'Succession' },
];

export default function Layout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-void text-text-base font-body">
      <header className="sticky top-0 z-50 h-14 flex items-center px-6 justify-between border-b border-gold/10"
        style={{ background: 'rgba(7,6,15,0.92)', backdropFilter: 'blur(12px)' }}
      >
        <NavLink to="/" className="font-serif text-lg font-bold text-gold tracking-widest hover:text-gold/80 transition-colors"
          style={{ textShadow: '0 0 20px rgba(212,168,67,0.4)' }}
        >
          The Realm
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden sm:flex gap-6">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'text-sm font-sans tracking-wide transition-colors relative',
                  isActive ? 'text-gold' : 'text-text-muted hover:text-text-base'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute -bottom-1 left-0 right-0 h-px bg-gold"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Hamburger button — mobile only */}
        <button
          className="sm:hidden flex flex-col justify-center gap-[5px] w-8 h-8 focus:outline-none"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen(o => !o)}
        >
          <motion.span
            animate={menuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
            className="block h-px w-6 bg-text-muted origin-center transition-colors"
          />
          <motion.span
            animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
            className="block h-px w-6 bg-text-muted"
          />
          <motion.span
            animate={menuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
            className="block h-px w-6 bg-text-muted origin-center"
          />
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="sm:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="sm:hidden fixed top-14 right-0 bottom-0 z-50 w-56 flex flex-col pt-6 px-6 gap-1 border-l border-gold/10"
              style={{ background: 'rgba(7,6,15,0.97)', backdropFilter: 'blur(16px)' }}
            >
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      'font-sans text-sm tracking-wide py-3 border-b border-gold/10 transition-colors',
                      isActive ? 'text-gold' : 'text-text-muted hover:text-text-base'
                    )
                  }
                >
                  {label}
                </NavLink>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
