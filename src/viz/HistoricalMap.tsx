import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place, Event } from '../types';

interface HistoricalMapProps {
  places: Place[];
  events: Event[];
  selectedPlaceId: string | undefined;
  onPlaceSelect: (id: string) => void;
  visibleTypes: Set<string>;
}

function placeColor(type: Place['type']): string {
  switch (type) {
    case 'battle_site':    return '#8b1a1a';
    case 'birthplace':     return '#1a5c6b';
    case 'castle':         return '#5c3a1e';
    case 'cathedral':      return '#3d2080';
    case 'abbey':          return '#2d5a27';
    case 'palace':         return '#6b4c1a';
    case 'religious_site': return '#6b2a6b';
    case 'town':           return '#4a6b3a';
    default:               return '#7a6b2a';
  }
}

function pinSvg(color: string, label: string): string {
  const safeLabel = label.replace(/"/g, '&quot;');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36" role="img" aria-label="${safeLabel}">` +
    `<title>${safeLabel}</title>` +
    `<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24S24 21 24 12C24 5.4 18.6 0 12 0z" ` +
    `fill="${color}" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>` +
    `<circle cx="12" cy="12" r="5" fill="white" fill-opacity="0.85"/>` +
    `</svg>`
  );
}

function buildPopup(place: Place, placeEvents: Event[]): string {
  const summary = place.summary
    ? `<p style="margin:0 0 8px;font-size:12px;color:#c8bfa8;line-height:1.5;">${
        place.summary.value.length > 220
          ? place.summary.value.slice(0, 220) + '…'
          : place.summary.value
      }</p>`
    : '';

  const eventsHtml = placeEvents.length > 0
    ? `<div style="border-top:1px solid rgba(212,168,67,0.2);padding-top:6px;margin-top:4px;">` +
      `<p style="margin:0 0 4px;font-size:10px;color:rgba(212,168,67,0.6);font-family:Inter,sans-serif;` +
      `text-transform:uppercase;letter-spacing:0.06em;">Events</p>` +
      placeEvents.map(e =>
        `<div style="font-size:11px;color:#e8dfc8;font-family:Inter,sans-serif;margin-bottom:2px;">` +
        `${e.title} <span style="color:#9a917a;">(${e.date.value.year})</span></div>`
      ).join('') +
      `</div>`
    : '';

  return (
    `<div style="font-family:Cinzel,Georgia,serif;max-width:240px;padding:2px 0;background:#161328;">` +
    `<h3 style="margin:0 0 2px;font-size:13px;font-weight:bold;color:#d4a843;">${place.name}</h3>` +
    (place.modern_name
      ? `<p style="margin:0 0 6px;font-size:10px;color:#9a917a;font-family:Inter,sans-serif;">${place.modern_name}</p>`
      : '') +
    summary +
    eventsHtml +
    `</div>`
  );
}

export default function HistoricalMap({
  places,
  events,
  selectedPlaceId,
  onPlaceSelect,
  visibleTypes,
}: HistoricalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, { marker: L.Marker; placeType: string }>());
  const onSelectRef = useRef(onPlaceSelect);
  useEffect(() => { onSelectRef.current = onPlaceSelect; });

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [52.0, -1.0],
      zoom: 5,
      zoomControl: true,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
          '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    for (const place of places) {
      if (!place.coordinates) continue;

      const icon = L.divIcon({
        html: pinSvg(placeColor(place.type), place.name),
        className: '',
        iconSize: [24, 36],
        iconAnchor: [12, 36],
        popupAnchor: [0, -38],
      });

      const placeEvents = events.filter(e => e.place_id === place.id);
      const marker = L.marker(
        [place.coordinates.lat, place.coordinates.lng],
        { icon, title: place.name, alt: place.name, keyboard: true }
      ).bindPopup(buildPopup(place, placeEvents), { maxWidth: 260 });

      marker.on('click', () => onSelectRef.current(place.id));
      marker.on('keypress', (e) => {
        const orig = (e as L.LeafletKeyboardEvent).originalEvent;
        if (orig.key === 'Enter' || orig.key === ' ') onSelectRef.current(place.id);
      });
      marker.addTo(map);
      markersRef.current.set(place.id, { marker, placeType: place.type });
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // Data files are imported statically — places/events never change after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show/hide markers when filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const { marker, placeType } of markersRef.current.values()) {
      if (visibleTypes.has(placeType)) {
        if (!map.hasLayer(marker)) marker.addTo(map);
      } else {
        marker.remove();
      }
    }
  }, [visibleTypes]);

  // Fly to + open popup when selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPlaceId) return;
    const entry = markersRef.current.get(selectedPlaceId);
    if (!entry) return;
    const { marker } = entry;
    if (!map.hasLayer(marker)) marker.addTo(map);
    map.flyTo(marker.getLatLng(), 8, { duration: 1.2 });
    setTimeout(() => marker.openPopup(), 1300);
  }, [selectedPlaceId]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
