import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('Not Found');
  return (
    <div className="flex flex-col items-center justify-center text-center px-6" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
      <p className="font-sans text-[11px] text-text-muted/50 tracking-[0.4em] uppercase mb-6">
        404 — Not Found
      </p>
      <h1
        className="font-serif font-bold text-text-base mb-4"
        style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', textShadow: '0 0 80px rgba(212,168,67,0.2)' }}
      >
        Lost to History
      </h1>
      <p className="font-body text-text-muted max-w-sm mb-10" style={{ fontSize: '1.05rem', lineHeight: 1.7 }}>
        This page has vanished from the record — like so many claimants, documents, and disputed heirs.
      </p>
      <Link
        to="/"
        className="font-sans text-xs tracking-widest uppercase text-gold/70 border border-gold/20
                   px-6 py-3 rounded hover:text-gold hover:border-gold/50 transition-colors duration-200"
      >
        Return to the Realm
      </Link>
    </div>
  );
}
