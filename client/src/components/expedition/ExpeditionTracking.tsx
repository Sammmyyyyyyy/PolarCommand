import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Compass,
  Clock,
  Navigation,
  Wind,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Layers,
} from 'lucide-react';
import { Expedition, ExpeditionTrackingInfo } from '../../types';

interface ExpeditionTrackingProps {
  expedition: Expedition;
}

export const ExpeditionTracking: React.FC<ExpeditionTrackingProps> = ({ expedition }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const tracking: ExpeditionTrackingInfo = expedition.tracking || {
    currentRouteStepId: 'step-1',
    currentRouteStep: expedition.currentRouteStep || 'In Transit',
    trackingStatus: expedition.trackingStatus || 'active',
    currentLocation: expedition.currentLocation || {
      name: 'Field Position',
      latitude: -70.0,
      longitude: 72.0,
      elevationMeters: 500,
    },
    lastUpdated: expedition.lastUpdated || '5 minutes ago',
    speedKnots: 8.0,
    headingDegrees: 180,
    temperatureCelsius: -18,
    weatherCondition: 'Clear Polar Skies',
  };

  const routeSteps = expedition.route || [];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const lat = tracking.currentLocation.latitude;
    const lng = tracking.currentLocation.longitude;

    // Initialize Leaflet map
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 4,
        minZoom: 2,
        maxZoom: 9,
        zoomControl: true,
        attributionControl: false,
      });

      // Use OpenStreetMap for clean polar operations without API-key watermarks
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers/layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Extract valid coordinates from route steps
    const validCoords: [number, number][] = [];
    routeSteps.forEach((step) => {
      if (step.latitude !== undefined && step.longitude !== undefined) {
        validCoords.push([step.latitude, step.longitude]);

        const isCurrent = step.status === 'current';
        const isCompleted = step.status === 'completed';

        const markerColor = isCurrent ? '#0284C7' : isCompleted ? '#10B981' : '#94A3B8';

        // Add waypoint marker
        const marker = L.circleMarker([step.latitude, step.longitude], {
          radius: isCurrent ? 8 : 6,
          fillColor: markerColor,
          color: '#FFFFFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px; padding: 2px;">
            <strong style="color: #0F172A;">${step.name}</strong><br/>
            <span style="color: #64748B;">Status: ${step.status}</span><br/>
            <span style="color: #0284C7;">Type: ${step.type}</span>
          </div>
        `);
      }
    });

    // Draw route polyline if 2 or more coordinates
    if (validCoords.length >= 2) {
      L.polyline(validCoords, {
        color: '#0284C7',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.75,
      }).addTo(map);
    }

    // Add highlighted pulsating current position marker
    const currentMarker = L.circleMarker([lat, lng], {
      radius: 9,
      fillColor: '#0284C7',
      color: '#FFFFFF',
      weight: 3,
      opacity: 1,
      fillOpacity: 1,
    }).addTo(map);

    currentMarker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 11px; padding: 4px;">
        <strong style="color: #0284C7;">CURRENT POSITION</strong><br/>
        <strong style="color: #0F172A;">${tracking.currentLocation.name}</strong><br/>
        <span style="color: #64748B;">GPS: ${lat.toFixed(3)}°, ${lng.toFixed(3)}°</span><br/>
        <span style="color: #64748B;">Updated: ${tracking.lastUpdated}</span>
      </div>
    `);

    // Center map comfortably
    map.setView([lat, lng], 4);

    return () => {
      // Map stays alive until unmount
    };
  }, [tracking, routeSteps]);

  const isCaution = tracking.trackingStatus === 'caution' || tracking.trackingStatus === 'warning';

  return (
    <div className="space-y-5">
      {/* 1. Live Telemetry Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Current Location */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Current Location</span>
            <MapPin className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="text-sm font-black text-slate-900 truncate">
            {tracking.currentLocation.name}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {tracking.currentLocation.latitude.toFixed(3)}° S, {tracking.currentLocation.longitude.toFixed(3)}° E
          </div>
        </div>

        {/* Tracking Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Telemetry Status</span>
            {isCaution ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isCaution ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <span className="text-sm font-black text-slate-900 uppercase">
              {tracking.trackingStatus}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Updated {tracking.lastUpdated}</span>
          </div>
        </div>

        {/* Speed & Heading */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Ground Motion</span>
            <Compass className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-sm font-black text-slate-900">
            {tracking.speedKnots ?? 0} knots
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Heading {tracking.headingDegrees ?? 0}° • Elev. {tracking.currentLocation.elevationMeters ?? 0}m
          </div>
        </div>

        {/* Weather Conditions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">In-Situ Weather</span>
            <Thermometer className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-sm font-black text-slate-900">
            {tracking.temperatureCelsius ?? -15}°C
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            {tracking.weatherCondition || 'Nominal Polar Conditions'}
          </div>
        </div>
      </div>

      {/* 2. Interactive Route Map Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#0284C7]" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Mission Navigation & Route Overlay
            </h4>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-500">
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#0284C7] ring-2 ring-sky-200" />
              <span className="font-bold text-[#0284C7]">Current Position</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span>Upcoming</span>
            </div>
          </div>
        </div>

        <div className="relative w-full h-80 rounded-xl overflow-hidden border border-slate-100 z-0">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};
