import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import PeopleIndexPage from './pages/PeopleIndexPage';
import PersonPage from './pages/PersonPage';
import HousesPage from './pages/HousesPage';
import DynasticTreePage from './pages/DynasticTreePage';
import MapPage from './pages/MapPage';
import TimelinePage from './pages/TimelinePage';
import ClaimExplorerPage from './pages/ClaimExplorerPage';
import ClaimPage from './pages/ClaimPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="people" element={<PeopleIndexPage />} />
          <Route path="people/:id" element={<PersonPage />} />
          <Route path="tree" element={<DynasticTreePage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="houses" element={<HousesPage />} />
          <Route path="succession" element={<ClaimExplorerPage />} />
          <Route path="succession/:id" element={<ClaimPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
