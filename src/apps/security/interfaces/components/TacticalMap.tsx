import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, MapPin } from 'lucide-react';
import { cn } from '../../../../lib/utils';

// Declare Leaflet as a global variable since it's loaded via CDN
declare const L: any;

interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SOS';
  type?: 'CHECKPOINT' | 'ALERT';
  description?: string;
  lastPatrol?: {
    time: string;
    staff: string;
  } | null;
}

interface TacticalMapProps {
  points: MapPoint[];
  onPointClick: (point: MapPoint) => void;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({ points, onPointClick }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    if (!mapContainerRef.current || typeof L === 'undefined') return;

    if (!mapInstanceRef.current) {
      // Initialize map
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: true
      }).setView([10.762622, 106.660172], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstanceRef.current);

      // Add zoom control at bottom right for Thumb-first UI
      L.control.zoom({
        position: 'bottomright'
      }).addTo(mapInstanceRef.current);
    }

    // Update markers
    const currentMap = mapInstanceRef.current;
    
    // Clear old markers
    Object.values(markersRef.current).forEach(marker => currentMap.removeLayer(marker));
    markersRef.current = {};

    points.forEach(point => {
      const isAlert = point.type === 'ALERT';
      const iconHtml = `
        <div class="relative">
          ${point.status === 'SOS' ? '<div class="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>' : ''}
          <div class="w-8 h-8 rounded-xl flex items-center justify-center shadow-2xl transition-all border-2 ${
            point.status === 'SOS' ? 'bg-red-500 border-white text-white' :
            point.status === 'ACTIVE' ? 'bg-emerald-500 border-emerald-500/50 text-white' :
            'bg-slate-800 border-slate-700 text-slate-500'
          }">
            ${isAlert ? 
              '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' :
              '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
            }
          </div>
          <div class="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span class="px-2 py-0.5 bg-slate-900/80 backdrop-blur-md rounded-md text-[8px] font-black ${isAlert ? 'text-red-400 border-red-500/30' : 'text-slate-300 border-slate-700/50'} uppercase tracking-widest border">
              ${point.name}
            </span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([point.lat, point.lon], { icon: customIcon })
        .addTo(currentMap)
        .on('click', () => onPointClick(point));
      
      markersRef.current[point.id] = marker;
    });

    // Fit bounds if points exist
    if (points.length > 0) {
      const group = L.featureGroup(Object.values(markersRef.current));
      currentMap.fitBounds(group.getBounds().pad(0.2));
    }

    return () => {
      // Cleanup if needed
    };
  }, [points, onPointClick]);

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-[32px] border border-slate-800 overflow-hidden group">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-10 flex gap-4 bg-slate-900/50 backdrop-blur-xl p-3 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Đã tuần tra</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-700" />
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Chưa tới giờ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sự cố SOS</span>
        </div>
      </div>

      {/* Map Controls Overlay */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
        <div className="p-3 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/5 text-sky-400">
          <span className="text-[10px] font-black tracking-tighter">NOC-LEAFLET-01</span>
        </div>
      </div>
    </div>
  );
};
