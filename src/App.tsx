import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

// Heavy pages are lazy-loaded so the homepage stays light.
// Tree (~D3), Map (~Leaflet), Timeline (~D3) and Person (sources) are split out.
const PeopleIndexPage    = lazy(() => import('./pages/PeopleIndexPage'));
const PersonPage         = lazy(() => import('./pages/PersonPage'));
const HousesPage         = lazy(() => import('./pages/HousesPage'));
const DynasticTreePage   = lazy(() => import('./pages/DynasticTreePage'));
const MapPage            = lazy(() => import('./pages/MapPage'));
const TimelinePage       = lazy(() => import('./pages/TimelinePage'));
const ClaimExplorerPage  = lazy(() => import('./pages/ClaimExplorerPage'));
const ClaimPage          = lazy(() => import('./pages/ClaimPage'));

function PageFallback() {
  return (
    <div className="bg-void min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-gold/20 border-t-gold/70 rounded-full animate-spin" />
        <p className="font-sans text-xs text-text-muted/70 tracking-widest uppercase">Loading</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="people"          element={<Suspense fallback={<PageFallback />}><PeopleIndexPage /></Suspense>} />
          <Route path="people/:id"      element={<Suspense fallback={<PageFallback />}><PersonPage /></Suspense>} />
          <Route path="tree"            element={<Suspense fallback={<PageFallback />}><DynasticTreePage /></Suspense>} />
          <Route path="map"             element={<Suspense fallback={<PageFallback />}><MapPage /></Suspense>} />
          <Route path="timeline"        element={<Suspense fallback={<PageFallback />}><TimelinePage /></Suspense>} />
          <Route path="houses"          element={<Suspense fallback={<PageFallback />}><HousesPage /></Suspense>} />
          <Route path="succession"      element={<Suspense fallback={<PageFallback />}><ClaimExplorerPage /></Suspense>} />
          <Route path="succession/:id"  element={<Suspense fallback={<PageFallback />}><ClaimPage /></Suspense>} />
          <Route path="*"               element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
