import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, CargoShipment } from '../../types';

interface PolarMapProps {
  stations: Station[];
  cargo?: CargoShipment[];
  onSelectStation?: (stationId: string) => void;
  onSelectCargo?: (cargoId: string) => void;
  highlightedCargoId?: string;
  showPersonnelRoutes?: boolean;
}

export const PolarMap: React.FC<PolarMapProps> = ({
  stations,
  cargo = [],
  onSelectStation,
  onSelectCargo,
  highlightedCargoId,
  showPersonnelRoutes = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'cargo' | 'personnel'>('all');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize Leaflet map centered between Southern India, South Africa, and East Antarctica
      const map = L.map(mapContainerRef.current, {
        center: [-25, 55],
        zoom: 3,
        minZoom: 2,
        maxZoom: 8,
        zoomControl: true,
        attributionControl: false,
      });

      // Use CartoDB Positron (light, minimal, professional mission-control look)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // 1. Waypoints Definitions
    const WAYPOINTS = {
      mumbai: { name: 'Mumbai Logistics Hub', coords: [18.94, 72.83] as [number, number] },
      goa: { name: 'Goa (NCPOR HQ & Port)', coords: [15.40, 73.80] as [number, number] },
      capeTown: { name: 'Cape Town Transit Base', coords: [-33.92, 18.42] as [number, number] },
      maitri: { name: 'Maitri Station (Schirmacher Oasis)', coords: [-70.766, 11.732] as [number, number] },
      bharati: { name: 'Bharati Station (Larsemann Hills)', coords: [-69.407, 76.191] as [number, number] },
    };

    // Helper for curved route lines
    const createCurvedPath = (start: [number, number], end: [number, number], curveOffset: number = 0): [number, number][] => {
      const points: [number, number][] = [];
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat = (1 - t) * start[0] + t * end[0] + Math.sin(t * Math.PI) * curveOffset;
        const lng = (1 - t) * start[1] + t * end[1];
        points.push([lat, lng]);
      }
      return points;
    };

    // Draw Major Maritime & Expedition Shipping Corridors
    if (activeLayer === 'all' || activeLayer === 'cargo') {
      // Route 1: Goa -> Cape Town
      const routeGoaCape = createCurvedPath(WAYPOINTS.goa.coords, WAYPOINTS.capeTown.coords, -6);
      L.polyline(routeGoaCape, {
        color: '#0284C7',
        weight: 2.5,
        opacity: 0.7,
        dashArray: '6, 6',
      }).addTo(layers);

      // Route 2: Cape Town -> Maitri
      const routeCapeMaitri = createCurvedPath(WAYPOINTS.capeTown.coords, WAYPOINTS.maitri.coords, -4);
      L.polyline(routeCapeMaitri, {
        color: '#0284C7',
        weight: 2.5,
        opacity: 0.7,
        dashArray: '6, 6',
      }).addTo(layers);

      // Route 3: Cape Town -> Bharati (MV Polar Queen corridor)
      const routeCapeBharati = createCurvedPath(WAYPOINTS.capeTown.coords, WAYPOINTS.bharati.coords, -8);
      L.polyline(routeCapeBharati, {
        color: '#2563EB',
        weight: 3,
        opacity: 0.85,
        dashArray: '8, 6',
      }).addTo(layers);

      // Route 4: Direct Goa -> Bharati Indian Ocean Deep Cruise
      const routeGoaBharati = createCurvedPath(WAYPOINTS.goa.coords, WAYPOINTS.bharati.coords, 5);
      L.polyline(routeGoaBharati, {
        color: '#38BDF8',
        weight: 2,
        opacity: 0.6,
        dashArray: '4, 8',
      }).addTo(layers);
    }

    // Inter-station Antarctic Aerial link (Maitri <-> Bharati)
    if (showPersonnelRoutes && (activeLayer === 'all' || activeLayer === 'personnel')) {
      const interStationRoute = createCurvedPath(WAYPOINTS.maitri.coords, WAYPOINTS.bharati.coords, 2);
      L.polyline(interStationRoute, {
        color: '#F59E0B',
        weight: 2.5,
        opacity: 0.8,
        dashArray: '4, 4',
      }).addTo(layers);
    }

    // 2. Hub Markers: Mumbai, Goa, Cape Town
    const hubIcon = (name: string, isOrigin: boolean = false) =>
      L.divIcon({
        className: 'custom-hub-icon',
        html: `
          <div class="flex items-center space-x-1.5 bg-white/95 px-2 py-1 rounded-md shadow-md border border-slate-200 text-xs font-semibold text-slate-800">
            <span class="w-2.5 h-2.5 rounded-full ${isOrigin ? 'bg-sky-600 animate-pulse' : 'bg-slate-600'}"></span>
            <span>${name}</span>
          </div>
        `,
        iconSize: [110, 26],
        iconAnchor: [55, 13],
      });

    L.marker(WAYPOINTS.mumbai.coords, { icon: hubIcon('Mumbai') }).addTo(layers);
    L.marker(WAYPOINTS.goa.coords, { icon: hubIcon('Goa Port', true) }).addTo(layers);
    L.marker(WAYPOINTS.capeTown.coords, { icon: hubIcon('Cape Town') }).addTo(layers);

    // 3. Antarctic Research Station Markers (Maitri & Bharati)
    stations.forEach((st) => {
      const risk = st.stationRisk ?? 0;
      const isHighRisk = risk > 60 || st.riskLevel === 'High Risk';
      const isWarning = risk > 40 && !isHighRisk;

      const badgeColor = isHighRisk ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';
      const borderRing = isHighRisk ? 'ring-4 ring-rose-200' : 'ring-2 ring-sky-200';

      const stationIcon = L.divIcon({
        className: 'custom-station-icon',
        html: `
          <div class="relative group cursor-pointer">
            <div class="flex items-center space-x-2 bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-700 text-xs font-semibold ${borderRing}">
              <span class="w-2 h-2 rounded-full ${badgeColor} animate-ping"></span>
              <span>${st.name.replace(' Station', '')}</span>
              <span class="bg-slate-800 text-[10px] text-sky-300 px-1 py-0.2 rounded font-mono">${st.weather.temperature}°C</span>
            </div>
            <div class="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700"></div>
          </div>
        `,
        iconSize: [130, 36],
        iconAnchor: [65, 36],
      });

      const lat = st.coordinates?.lat ?? st.latitude ?? st.lat ?? -70.767;
      const lng = st.coordinates?.lng ?? st.longitude ?? st.lng ?? 11.733;
      const marker = L.marker([lat, lng], { icon: stationIcon }).addTo(layers);

      const popupContent = `
        <div class="p-1 font-sans text-xs">
          <div class="font-bold text-sm text-slate-900 mb-1">${st.name}</div>
          <div class="text-slate-500 mb-2">${st.region}</div>
          <div class="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border border-slate-100 mb-2">
            <div><span class="text-slate-400">Personnel:</span> <span class="font-bold text-slate-800">${st.personnelPresent}</span></div>
            <div><span class="text-slate-400">Readiness:</span> <span class="font-bold text-emerald-600">${st.inventoryReadiness}%</span></div>
            <div><span class="text-slate-400">Weather:</span> <span class="font-bold text-slate-800">${st.weather.temperature}°C, ${st.weather.condition}</span></div>
            <div><span class="text-slate-400">Risk Score:</span> <span class="font-bold ${isHighRisk ? 'text-rose-600' : 'text-slate-800'}">${risk}/100</span></div>
          </div>
          <div class="text-[11px] text-sky-700 font-medium">Click station to view operational sub-command</div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (onSelectStation) onSelectStation(st.id);
      });
    });

    // 4. Live Cargo Markers
    cargo.forEach((c) => {
      let coords: [number, number] | null = null;

      // Realistic coordinates based on location
      if (c.id === 'MED-024') {
        coords = c.status === 'Delayed' ? [-34.2, 19.1] : [-38.5, 32.0];
      } else if (c.id === 'FUEL-001') {
        coords = [-48.2, 60.5];
      } else if (c.id === 'SCI-017') {
        coords = [-70.3, 11.2];
      } else if (c.id === 'SP-032') {
        coords = [-20.1, 57.5]; // Port Louis
      } else if (c.id === 'FOOD-014') {
        coords = [-52.0, 38.0];
      } else {
        const hash = (c.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const lat = -35.0 - (hash % 30);
        const lng = 20.0 + (hash % 50);
        coords = [lat, lng];
      }

      if (coords) {
        const isTarget = highlightedCargoId === c.id;
        const isDelayed = c.status === 'Delayed' || c.delayHours > 0;
        const color = isDelayed ? 'bg-rose-500 text-white' : isTarget ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-100';

        const cargoIcon = L.divIcon({
          className: 'custom-cargo-icon',
          html: `
            <div class="relative cursor-pointer group">
              <div class="flex items-center space-x-1 px-1.5 py-0.5 rounded shadow ${color} text-[10px] font-bold border border-white/60 ${isTarget ? 'ring-2 ring-sky-400 scale-110' : ''}">
                <span>🚢</span>
                <span>${c.id}</span>
              </div>
            </div>
          `,
          iconSize: [68, 22],
          iconAnchor: [34, 11],
        });

        const marker = L.marker(coords, { icon: cargoIcon }).addTo(layers);
        marker.bindPopup(`
          <div class="p-1 font-sans text-xs">
            <div class="font-bold text-slate-900">${c.id}: ${c.category}</div>
            <div class="text-slate-500">${c.description}</div>
            <div class="mt-1"><span class="font-semibold">Destination:</span> ${c.destination}</div>
            <div><span class="font-semibold">ETA:</span> ${c.eta}</div>
            <div><span class="font-semibold">Status:</span> <span class="${isDelayed ? 'text-rose-600 font-bold' : 'text-slate-700'}">${c.status}</span></div>
          </div>
        `);
        marker.on('click', () => {
          if (onSelectCargo) onSelectCargo(c.id);
        });
      }
    });
  }, [stations, cargo, highlightedCargoId, showPersonnelRoutes, activeLayer, onSelectStation, onSelectCargo]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
      {/* Map Header / Layer Controls Overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center space-x-1 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200/90 shadow-sm text-xs font-medium text-slate-700">
        <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1">Layer:</span>
        <button
          onClick={() => setActiveLayer('all')}
          className={`px-2 py-0.5 rounded transition ${activeLayer === 'all' ? 'bg-sky-600 text-white font-semibold shadow-xs' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          All Corridors
        </button>
        <button
          onClick={() => setActiveLayer('cargo')}
          className={`px-2 py-0.5 rounded transition ${activeLayer === 'cargo' ? 'bg-sky-600 text-white font-semibold shadow-xs' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          Maritime Cargo
        </button>
        <button
          onClick={() => setActiveLayer('personnel')}
          className={`px-2 py-0.5 rounded transition ${activeLayer === 'personnel' ? 'bg-sky-600 text-white font-semibold shadow-xs' : 'hover:bg-slate-100 text-slate-600'}`}
        >
          Personnel Airlinks
        </button>
      </div>

      {/* Legend Badge */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200/80 shadow-xs text-[11px] text-slate-600 flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Station Normal</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          <span>Station High Risk</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-sky-600 border-t border-dashed border-sky-400"></span>
          <span>Maritime Supply Route</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-amber-500 border-t border-dashed border-amber-400"></span>
          <span>Inter-Station Link</span>
        </div>
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
