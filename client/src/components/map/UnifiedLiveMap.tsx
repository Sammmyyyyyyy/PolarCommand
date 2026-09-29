import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Users,
  Building2,
  Package,
  Route,
  ShieldAlert,
  Battery,
  Radio,
  MapPin,
  Maximize2,
  Clock,
  ArrowRight,
  Crosshair,
  Layers,
  Info,
} from 'lucide-react';
import { Expedition, Station, ExpeditionRouteStep } from '../../types';
import { ExpeditionTrackedPerson, ExpeditionShipmentTrack } from '../../services/expeditionService';

export type MapTrackedPerson = ExpeditionTrackedPerson;
export type MapShipment = ExpeditionShipmentTrack;
export type MapWaypoint = ExpeditionRouteStep;

export interface UnifiedLiveMapProps {
  selectedExpedition: Expedition;
  personnel?: ExpeditionTrackedPerson[];
  stations?: Station[];
  shipments?: ExpeditionShipmentTrack[];
  waypoints?: ExpeditionRouteStep[];
  activeSosId?: string | null;
  focusedTarget?: {
    id: string;
    type: 'person' | 'station';
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null;
  onSelectPerson?: (person: ExpeditionTrackedPerson) => void;
  onSelectStation?: (station: Station) => void;
  onSelectShipment?: (shipment: ExpeditionShipmentTrack) => void;
  onViewStationProfile?: (stationId: string) => void;
  onViewPersonProfile?: (personId: string) => void;
  className?: string;
}

// Calculate distance in km between two GPS coordinates
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const UnifiedLiveMap: React.FC<UnifiedLiveMapProps> = ({
  selectedExpedition,
  personnel = [],
  stations = [],
  shipments = [],
  waypoints = [],
  activeSosId,
  focusedTarget,
  onSelectPerson,
  onSelectStation,
  onSelectShipment,
  onViewStationProfile,
  onViewPersonProfile,
  className = 'h-[620px] w-full',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Layer filters
  const [filterPeople, setFilterPeople] = useState<boolean>(true);
  const [filterStations, setFilterStations] = useState<boolean>(true);
  const [filterExpeditionRoute, setFilterExpeditionRoute] = useState<boolean>(true);
  const [filterShipments, setFilterShipments] = useState<boolean>(true);

  // Selected item modal/drawer inside map
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'person' | 'station' | 'shipment' | 'waypoint';
    data: any;
  } | null>(null);

  // Expose global callback handlers for popup button clicks
  useEffect(() => {
    (window as any).__polarFocusPerson = (personId: string) => {
      const p = personnel.find((item) => item.id === personId);
      if (p) {
        if (onSelectPerson) onSelectPerson(p);
        if (onViewPersonProfile) onViewPersonProfile(personId);
      }
    };

    (window as any).__polarViewStation = (stationId: string) => {
      if (onViewStationProfile) {
        onViewStationProfile(stationId);
      } else if (onSelectStation) {
        const st = stations.find((item) => item.id === stationId);
        if (st) onSelectStation(st);
      }
    };

    return () => {
      delete (window as any).__polarFocusPerson;
      delete (window as any).__polarViewStation;
    };
  }, [personnel, stations, onSelectPerson, onSelectStation, onViewStationProfile, onViewPersonProfile]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Princess Elizabeth Land / Larsemann Hills, East Antarctica
      const map = L.map(mapContainerRef.current, {
        center: [-69.8, 75.5],
        zoom: 6,
        minZoom: 2,
        maxZoom: 15,
        zoomControl: true,
        attributionControl: false,
      });

      // Use standard OpenStreetMap public tiles - reliable, clean, NO API KEY WATERMARK
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Map instance is kept alive in component lifecycle
    };
  }, []);

  // Center & Fit bounds helper
  const handleFitExpeditionBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: [number, number][] = [];

    if (filterPeople) {
      personnel.forEach((p) => points.push([p.latitude, p.longitude]));
    }
    if (filterStations) {
      stations.forEach((s) => points.push([s.latitude, s.longitude]));
    }
    if (filterExpeditionRoute) {
      waypoints.forEach((w) => {
        if (w.latitude !== undefined && w.longitude !== undefined) {
          points.push([w.latitude, w.longitude]);
        }
      });
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8, animate: true });
    }
  };

  // Re-render markers strictly based on current selected expedition data
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();
    markersMapRef.current.clear();

    const allExpeditionCoords: [number, number][] = [];

    // -------------------------------------------------------------
    // 1. ROUTE & WAYPOINTS (Expedition specific)
    // -------------------------------------------------------------
    if (filterExpeditionRoute && waypoints.length > 0) {
      const validWaypoints = waypoints.filter(
        (w) => w.latitude !== undefined && w.longitude !== undefined
      );

      if (validWaypoints.length > 1) {
        const polylineCoords: [number, number][] = validWaypoints.map((w) => [
          w.latitude as number,
          w.longitude as number,
        ]);

        // Draw connecting route line
        L.polyline(polylineCoords, {
          color: '#0284C7',
          weight: 3.5,
          opacity: 0.85,
          dashArray: '8, 8',
        }).addTo(layers);
      }

      validWaypoints.forEach((wp, index) => {
        const lat = wp.latitude as number;
        const lon = wp.longitude as number;
        allExpeditionCoords.push([lat, lon]);

        const isCurrent = wp.status === 'current';
        const isDone = wp.status === 'completed';

        const wpIcon = L.divIcon({
          className: 'custom-wp-icon',
          html: `
            <div class="flex items-center space-x-1.5 px-2 py-0.5 rounded-md shadow-md border text-[10px] font-bold cursor-pointer transition ${
              isCurrent
                ? 'bg-sky-600 text-white border-white ring-2 ring-sky-300 scale-105'
                : isDone
                ? 'bg-slate-800 text-slate-200 border-slate-600'
                : 'bg-white text-slate-700 border-slate-300'
            }">
              <span class="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                isCurrent ? 'bg-white text-sky-700' : 'bg-slate-200 text-slate-700'
              }">${index + 1}</span>
              <span class="truncate max-w-[85px]">${wp.name}</span>
            </div>
          `,
          iconSize: [120, 24],
          iconAnchor: [60, 12],
        });

        const marker = L.marker([lat, lon], { icon: wpIcon }).addTo(layers);

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 180px; padding: 2px;">
            <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #0284C7;">
              Waypoint ${index + 1} • ${wp.status.toUpperCase()}
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">
              ${wp.name}
            </div>
            ${wp.description ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">${wp.description}</div>` : ''}
            <div style="font-size: 10px; color: #94a3b8; margin-top: 6px; font-family: monospace;">
              GPS: ${lat.toFixed(3)}° S, ${lon.toFixed(3)}° E
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedEntity({ type: 'waypoint', data: wp });
        });
      });
    }

    // -------------------------------------------------------------
    // 2. STATIONS (Associated with selected expedition)
    // -------------------------------------------------------------
    if (filterStations && stations.length > 0) {
      stations.forEach((st) => {
        const lat = st.latitude ?? st.coordinates?.lat ?? -69.407;
        const lon = st.longitude ?? st.coordinates?.lng ?? 76.191;
        allExpeditionCoords.push([lat, lon]);

        const tempText = st.weather?.[0]?.temperature !== undefined
          ? `${st.weather[0].temperature}°C`
          : '-18°C';

        const stationIcon = L.divIcon({
          className: 'custom-station-icon',
          html: `
            <div class="flex items-center space-x-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border-2 border-sky-400 text-xs font-bold cursor-pointer hover:scale-105 transition ring-2 ring-slate-950/20">
              <span class="text-sm">🏠</span>
              <div class="leading-tight text-left">
                <div class="text-[11px] font-black tracking-tight text-white">${st.name}</div>
                <div class="text-[9px] text-sky-300 font-normal flex items-center gap-1">
                  <span>Base Station</span> • <span class="text-emerald-400 font-semibold">${st.status}</span>
                </div>
              </div>
              <span class="bg-slate-800 text-[10px] text-sky-200 px-1.5 py-0.5 rounded font-mono">${tempText}</span>
            </div>
          `,
          iconSize: [160, 34],
          iconAnchor: [80, 17],
        });

        const marker = L.marker([lat, lon], { icon: stationIcon }).addTo(layers);
        markersMapRef.current.set(`station-${st.id}`, marker);

        const managerName = st.name.includes('Maitri')
          ? 'Dr. Suresh Sen'
          : st.name.includes('Himadri')
          ? 'Dr. Arctic Lead'
          : 'Dr. Rajesh Nair';

        const personnelAssignedCount = st.name.includes('Maitri') ? 6 : st.name.includes('Himadri') ? 4 : 8;
        const inventoryItemsCount = st.name.includes('Maitri') ? 37 : st.name.includes('Himadri') ? 22 : 42;

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 4px;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0284C7; letter-spacing: 0.5px;">
              Permanent Research Station
            </div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px;">
              ${st.name}
            </div>
            <div style="font-size: 11px; color: #059669; font-weight: 600; margin-top: 2px;">
              🟢 Status: ${st.status}
            </div>
            <div style="border-top: 1px solid #f1f5f9; margin-top: 8px; padding-top: 6px; font-size: 11px; line-height: 1.6;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Station Manager:</span>
                <span style="font-weight: 700; color: #1e293b;">${managerName}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Personnel Assigned:</span>
                <span style="font-weight: 700; color: #1e293b;">${personnelAssignedCount}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Inventory Items:</span>
                <span style="font-weight: 700; color: #1e293b;">${inventoryItemsCount}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Position:</span>
                <span style="font-family: monospace; font-size: 10px; color: #475569;">${lat.toFixed(2)}° S, ${lon.toFixed(2)}° E</span>
              </div>
            </div>
            <div style="margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 6px;">
              <button 
                onclick="window.__polarViewStation('${st.id}')"
                style="width: 100%; background: #0284C7; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
              >
                <span>View Station</span> →
              </button>
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedEntity({ type: 'station', data: st });
          if (onSelectStation) onSelectStation(st);
        });
      });
    }

    // -------------------------------------------------------------
    // 3. PERSONNEL (Strictly for this selected expedition)
    // -------------------------------------------------------------
    if (filterPeople && personnel.length > 0) {
      personnel.forEach((p) => {
        allExpeditionCoords.push([p.latitude, p.longitude]);

        const isEmergency = Boolean(p.isEmergency || p.status === 'Emergency' || activeSosId === p.id);
        const isDelayed = p.status === 'Delayed';
        const isOffline = p.status === 'Offline';

        // Deterministic dot color & marker styling
        let dotColor = 'bg-emerald-500';
        let badgeBg = 'bg-white text-slate-900 border-slate-200';
        let ringStyle = 'ring-1 ring-slate-300';
        let pulseHtml = '';

        if (isEmergency) {
          dotColor = 'bg-rose-600';
          badgeBg = 'bg-rose-50 text-rose-950 border-rose-500 font-black';
          ringStyle = 'ring-4 ring-rose-400 shadow-2xl';
          pulseHtml = `
            <span class="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80"></span>
              <span class="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-white text-[9px] font-bold items-center justify-center">!</span>
            </span>
          `;
        } else if (isDelayed) {
          dotColor = 'bg-amber-500';
          ringStyle = 'ring-2 ring-amber-300';
        } else if (isOffline) {
          dotColor = 'bg-slate-400';
          badgeBg = 'bg-slate-100 text-slate-600 border-slate-300';
        }

        const personIcon = L.divIcon({
          className: 'custom-person-icon',
          html: `
            <div class="relative flex items-center space-x-1.5 px-2.5 py-1 rounded-full shadow-lg border text-xs font-bold cursor-pointer transition hover:scale-105 ${badgeBg} ${ringStyle}">
              ${pulseHtml}
              <span class="w-2.5 h-2.5 rounded-full ${dotColor} ${isEmergency ? 'animate-pulse' : ''}"></span>
              <span class="truncate max-w-[100px]">${p.name}</span>
              <span class="text-[10px] font-mono text-slate-500">${p.battery}%</span>
            </div>
          `,
          iconSize: [140, 28],
          iconAnchor: [70, 14],
        });

        const marker = L.marker([p.latitude, p.longitude], { icon: personIcon }).addTo(layers);
        markersMapRef.current.set(`person-${p.id}`, marker);

        const statusLabel = isEmergency
          ? 'EMERGENCY'
          : p.status.toUpperCase();

        const statusColor = isEmergency
          ? '#e11d48'
          : isDelayed
          ? '#d97706'
          : isOffline
          ? '#64748b'
          : '#059669';

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 210px; padding: 4px;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0284C7; letter-spacing: 0.5px;">
              ${p.expeditionName || selectedExpedition.title}
            </div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 2px;">
              ${p.name}
            </div>
            <div style="font-size: 11px; color: #475569; font-weight: 600;">
              ${p.role}
            </div>
            <div style="border-top: 1px solid #f1f5f9; margin-top: 8px; padding-top: 6px; font-size: 11px; line-height: 1.6;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">GPS Status:</span>
                <span style="font-weight: 800; color: ${statusColor};">${statusLabel}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Battery Level:</span>
                <span style="font-weight: 700; color: ${p.battery < 20 ? '#e11d48' : '#0f172a'};">${p.battery}%</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Last Signal:</span>
                <span style="color: #475569;">${p.lastUpdateText}</span>
              </div>
              <div style="margin-top: 4px; color: #334155; font-size: 10.5px; background: #f8fafc; padding: 4px 6px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <strong style="display: block; color: #64748b; font-size: 9.5px; text-transform: uppercase;">Location:</strong>
                ${p.locationName}
              </div>
              ${
                p.emergencyMessage
                  ? `<div style="margin-top: 4px; color: #9f1239; font-size: 10.5px; background: #ffe4e6; padding: 4px 6px; border-radius: 6px; font-weight: 700;">
                      🚨 ${p.emergencyMessage}
                     </div>`
                  : ''
              }
            </div>
            <div style="margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 6px;">
              <button 
                onclick="window.__polarFocusPerson('${p.id}')"
                style="width: 100%; background: #0284C7; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;"
              >
                <span>View Personnel Profile</span> →
              </button>
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedEntity({ type: 'person', data: p });
          if (onSelectPerson) onSelectPerson(p);
        });
      });
    }

    // -------------------------------------------------------------
    // 4. SHIPMENTS (If any for this expedition)
    // -------------------------------------------------------------
    if (filterShipments && shipments.length > 0) {
      shipments.forEach((s) => {
        allExpeditionCoords.push([s.latitude, s.longitude]);

        const shipmentIcon = L.divIcon({
          className: 'custom-shipment-icon',
          html: `
            <div class="flex items-center space-x-1.5 bg-indigo-950 text-white px-2.5 py-1 rounded-md shadow-lg border border-indigo-400 text-[11px] font-semibold cursor-pointer hover:bg-indigo-900 transition">
              <span class="w-2 h-2 rounded-full ${s.delayHours > 0 ? 'bg-amber-400' : 'bg-sky-400'} animate-pulse"></span>
              <span>🚢 ${s.vesselOrFlight}</span>
            </div>
          `,
          iconSize: [160, 26],
          iconAnchor: [80, 13],
        });

        const marker = L.marker([s.latitude, s.longitude], { icon: shipmentIcon }).addTo(layers);

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 200px; padding: 4px;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0284C7;">
              Maritime / Polar Transport
            </div>
            <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 2px;">
              ${s.name}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              Vessel: <strong>${s.vesselOrFlight}</strong>
            </div>
            <div style="border-top: 1px solid #f1f5f9; margin-top: 6px; padding-top: 4px; font-size: 11px;">
              <div>Stage: <strong>${s.currentStage}</strong></div>
              <div>ETA: <strong>${s.eta}</strong></div>
              <div>Destination: <strong>${s.destinationStation}</strong></div>
            </div>
          </div>
        `);

        marker.on('click', () => {
          setSelectedEntity({ type: 'shipment', data: s });
          if (onSelectShipment) onSelectShipment(s);
        });
      });
    }

    // Auto-fit initial view to this expedition's geography if points exist
    if (allExpeditionCoords.length > 0) {
      const bounds = L.latLngBounds(allExpeditionCoords);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 8 });
    }
  }, [
    selectedExpedition.id,
    personnel,
    stations,
    shipments,
    waypoints,
    filterPeople,
    filterStations,
    filterExpeditionRoute,
    filterShipments,
    activeSosId,
    onSelectPerson,
    onSelectStation,
    onSelectShipment,
  ]);

  // Handle focusing onto a specific target (person or station)
  useEffect(() => {
    if (!focusedTarget || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    map.setView([focusedTarget.latitude, focusedTarget.longitude], 9, { animate: true });

    // Open popup of target if marker exists
    const markerKey = `${focusedTarget.type}-${focusedTarget.id}`;
    const targetMarker = markersMapRef.current.get(markerKey);
    if (targetMarker) {
      targetMarker.openPopup();
    }
  }, [focusedTarget]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs bg-slate-900 ${className}`}>
      {/* Map Interactive Filter Overlay Bar */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200/90 shadow-md text-xs font-semibold text-slate-700">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-[#0284C7]" />
          <span>Layers</span>
        </span>

        {/* Toggle People */}
        <button
          type="button"
          onClick={() => setFilterPeople(!filterPeople)}
          className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
            filterPeople
              ? 'bg-sky-50 text-[#0284C7] font-bold border border-sky-200'
              : 'bg-slate-100 text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Personnel ({personnel.length})</span>
        </button>

        {/* Toggle Stations */}
        <button
          type="button"
          onClick={() => setFilterStations(!filterStations)}
          className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
            filterStations
              ? 'bg-sky-50 text-[#0284C7] font-bold border border-sky-200'
              : 'bg-slate-100 text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>🏠</span>
          <span>Stations ({stations.length})</span>
        </button>

        {/* Toggle Route */}
        <button
          type="button"
          onClick={() => setFilterExpeditionRoute(!filterExpeditionRoute)}
          className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
            filterExpeditionRoute
              ? 'bg-sky-50 text-[#0284C7] font-bold border border-sky-200'
              : 'bg-slate-100 text-slate-400 hover:text-slate-600'
          }`}
        >
          <Route className="w-3.5 h-3.5" />
          <span>Route ({waypoints.length})</span>
        </button>

        {/* Toggle Shipments */}
        {shipments.length > 0 && (
          <button
            type="button"
            onClick={() => setFilterShipments(!filterShipments)}
            className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
              filterShipments
                ? 'bg-sky-50 text-[#0284C7] font-bold border border-sky-200'
                : 'bg-slate-100 text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>🚢</span>
            <span>Shipments ({shipments.length})</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        {/* Fit Bounds Button */}
        <button
          type="button"
          onClick={handleFitExpeditionBounds}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center space-x-1 cursor-pointer"
          title="Fit view to current expedition coordinates"
        >
          <Crosshair className="w-3.5 h-3.5 text-[#0284C7]" />
          <span>Fit View</span>
        </button>
      </div>

      {/* Selected Entity Card Drawer (Bottom-Left) */}
      {selectedEntity && (
        <div className="absolute bottom-4 left-4 z-[1000] max-w-sm bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl p-4 space-y-3 font-sans">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0284C7]">
              {selectedEntity.type === 'person'
                ? 'Expedition Personnel'
                : selectedEntity.type === 'station'
                ? 'Base Station'
                : selectedEntity.type === 'waypoint'
                ? 'Route Waypoint'
                : 'Maritime Shipment'}
            </span>
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          {selectedEntity.type === 'person' && (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-black text-slate-900 text-sm">{selectedEntity.data.name}</div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedEntity.data.isEmergency || selectedEntity.data.status === 'Emergency'
                      ? 'bg-rose-100 text-rose-800'
                      : selectedEntity.data.status === 'Delayed'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedEntity.data.status}
                </span>
              </div>
              <div className="text-slate-600 font-medium">{selectedEntity.data.role}</div>
              <div className="text-[11px] text-slate-500">
                <strong>Location:</strong> {selectedEntity.data.locationName}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                <span className="text-slate-500">Battery: {selectedEntity.data.battery}%</span>
                <span className="text-slate-500">Signal: {selectedEntity.data.lastUpdateText}</span>
              </div>
              {onViewPersonProfile && (
                <button
                  onClick={() => onViewPersonProfile(selectedEntity.data.id)}
                  className="w-full mt-2 py-1.5 bg-[#0284C7] hover:bg-sky-700 text-white font-bold rounded-xl text-center text-xs transition cursor-pointer"
                >
                  View Full Profile
                </button>
              )}
            </div>
          )}

          {selectedEntity.type === 'station' && (
            <div className="space-y-2 text-xs">
              <div className="font-black text-slate-900 text-sm">{selectedEntity.data.name}</div>
              <div className="text-emerald-700 font-semibold text-[11px]">
                Operational Antarctic Station
              </div>
              <div className="text-slate-500 text-[11px]">
                GPS: {selectedEntity.data.latitude?.toFixed(2)}° S, {selectedEntity.data.longitude?.toFixed(2)}° E
              </div>
              {onViewStationProfile && (
                <button
                  onClick={() => onViewStationProfile(selectedEntity.data.id)}
                  className="w-full mt-2 py-1.5 bg-[#0284C7] hover:bg-sky-700 text-white font-bold rounded-xl text-center text-xs transition cursor-pointer"
                >
                  View Station Details
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Clean Empty State Overlay if expedition has no personnel */}
      {personnel.length === 0 && (
        <div className="absolute inset-0 z-[500] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 rounded-2xl p-6 text-center max-w-sm border border-slate-200 shadow-xl space-y-2 pointer-events-auto">
            <Radio className="w-8 h-8 text-sky-500 mx-auto animate-pulse" />
            <h4 className="text-sm font-bold text-slate-900">No live tracking data available</h4>
            <p className="text-xs text-slate-500">
              Personnel locations will appear here as soon as tracking data is received from field transceivers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
