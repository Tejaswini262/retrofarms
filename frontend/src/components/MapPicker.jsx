import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, LocateFixed, Search } from 'lucide-react';

// Fix default marker icon paths (Leaflet + webpack)
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const Recenter = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom(), { animate: true }); }, [center, map]);
  return null;
};

const ClickHandler = ({ onSelect }) => {
  useMapEvents({
    click: (e) => onSelect([e.latlng.lat, e.latlng.lng]),
  });
  return null;
};

const reverseGeocode = async (lat, lng) => {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`,
    { headers: { 'Accept-Language': 'en' } },
  );
  if (!r.ok) throw new Error('reverse failed');
  return r.json();
};

const searchPlaces = async (q) => {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5&addressdetails=1&countrycodes=in`,
    { headers: { 'Accept-Language': 'en' } },
  );
  if (!r.ok) return [];
  return r.json();
};

// Default: Kondapur / Hyderabad area
const DEFAULT_CENTER = [17.4139, 78.4522];

const MapPicker = ({ onAddress }) => {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [pos, setPos] = useState(DEFAULT_CENTER);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const markerRef = useRef(null);

  const resolve = async (lat, lng, source = 'pin') => {
    setBusy(true); setNote('');
    try {
      const data = await reverseGeocode(lat, lng);
      const a = data.address || {};
      const line1 = [a.house_number, a.building, a.road || a.pedestrian || a.residential]
        .filter(Boolean).join(' ') || data.display_name?.split(',').slice(0, 2).join(',') || '';
      const line2 = [a.neighbourhood || a.suburb || a.village || a.hamlet].filter(Boolean).join(', ');
      const city = a.city || a.town || a.village || a.county || a.state_district || '';
      const pincode = a.postcode || '';
      const landmark = a.amenity || a.shop || '';
      onAddress?.({ line1, line2, city, pincode, landmark, lat, lng, display: data.display_name });
      setNote(source === 'gps' ? 'Location detected. Drag the pin to fine-tune.' : 'Pin placed. Address filled — you can still edit fields below.');
    } catch {
      setNote('Could not fetch address for this location. Please type it manually below.');
    } finally { setBusy(false); }
  };

  useEffect(() => {
    // On mount try to center on the user's location silently
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = [p.coords.latitude, p.coords.longitude];
        setCenter(c); setPos(c);
        resolve(c[0], c[1], 'gps');
      },
      () => { /* stay on default */ },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locateMe = () => {
    if (!('geolocation' in navigator)) { setNote('Geolocation not supported on this device.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = [p.coords.latitude, p.coords.longitude];
        setCenter(c); setPos(c);
        resolve(c[0], c[1], 'gps');
      },
      (err) => {
        setBusy(false);
        if (err.code === 1) setNote('Location permission denied. Drop the pin manually.');
        else setNote('Could not detect location. Drop the pin manually.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const onSelect = (latlng) => { setPos(latlng); resolve(latlng[0], latlng[1]); };

  const doSearch = async () => {
    if (!query.trim()) return;
    const res = await searchPlaces(query.trim());
    setResults(res); setShowResults(true);
  };

  const pickResult = (r) => {
    const c = [parseFloat(r.lat), parseFloat(r.lon)];
    setCenter(c); setPos(c); setShowResults(false); setQuery(r.display_name);
    resolve(c[0], c[1]);
  };

  const dragHandlers = useMemo(() => ({
    dragend: () => {
      const m = markerRef.current;
      if (!m) return;
      const ll = m.getLatLng();
      setPos([ll.lat, ll.lng]);
      resolve(ll.lat, ll.lng);
    },
  }), []);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="flex">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
              placeholder="Search area, landmark, pincode…"
              className="flex-1 px-4 py-2.5 border border-[#E4D9C1] rounded-l-xl bg-white text-[#2B1D11] focus:outline-none focus:border-[#2B1D11]"
            />
            <button type="button" onClick={doSearch} className="px-4 bg-[#2B1D11] text-white rounded-r-xl hover:bg-[#3A2818]">
              <Search size={16} />
            </button>
          </div>
          {showResults && results.length > 0 && (
            <div className="absolute z-[1001] left-0 right-0 mt-1 bg-white border border-[#E4D9C1] rounded-xl shadow-lg max-h-56 overflow-y-auto">
              {results.map((r) => (
                <button key={r.place_id} type="button" onClick={() => pickResult(r)} className="w-full text-left px-4 py-2 hover:bg-[#F7F1E5] text-sm text-[#2B1D11] border-b border-[#EFE4CB] last:border-b-0">
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={locateMe} disabled={busy}
          className="inline-flex items-center justify-center gap-2 border border-[#4E6A3C] text-[#4E6A3C] hover:bg-[#4E6A3C] hover:text-white px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />} Use my location
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden border border-[#E4D9C1]" style={{ height: 320 }}>
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter center={center} />
          <ClickHandler onSelect={onSelect} />
          <Marker
            position={pos}
            draggable
            eventHandlers={dragHandlers}
            ref={markerRef}
            icon={markerIcon}
          />
        </MapContainer>
      </div>
      <div className="text-xs text-[#7A6A55]">Tap anywhere on the map or drag the pin to your exact door. You can still edit the address below.</div>
      {note && <div className="text-xs px-4 py-2 rounded-lg bg-[#EFE4CB] text-[#5C3B1E] border border-[#E4D9C1]">{note}</div>}
    </div>
  );
};

export default MapPicker;
