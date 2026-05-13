import React, { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, Route, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../../lib/utils';
// Declare Leaflet as a global variable since it's loaded via CDN
declare const L: any;

export interface MapPoint {
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
  showRouteLine?: boolean;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({ points, onPointClick, showRouteLine = false }) => {
  const [viewMode, setViewMode] = useState<'MAP' | 'SCHEMATIC'>('SCHEMATIC');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    if (viewMode !== 'MAP' || !mapContainerRef.current || typeof L === 'undefined') return;

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

    // Update markers and route lines
    const currentMap = mapInstanceRef.current;
    
    // Clear old markers and lines
    Object.values(markersRef.current).forEach(marker => currentMap.removeLayer(marker));
    markersRef.current = {};
    
    // Remove existing polylines
    currentMap.eachLayer((layer: any) => {
      if (layer instanceof L.Polyline) {
        currentMap.removeLayer(layer);
      }
    });

    // Draw Route Lines (Polylines)
    if (showRouteLine && Array.isArray(points) && points.length > 1) {
      const latlngs = points.map(p => [p.lat, p.lon]);
      
      // Background glow line
      L.polyline(latlngs, {
        color: '#4285F4',
        weight: 8,
        opacity: 0.1,
        lineJoin: 'round'
      }).addTo(currentMap);

      // Main technical line with animated dash flow
      L.polyline(latlngs, {
        color: '#4285F4',
        weight: 2,
        opacity: 0.5,
        dashArray: '8, 12',
        lineJoin: 'round',
        className: 'technical-flow-line'
      }).addTo(currentMap);
    }

    if (Array.isArray(points)) {
      points.forEach((point, index) => {
        const isAlert = point.type === 'ALERT';
      const isActive = point.status === 'ACTIVE';
      const isSOS = point.status === 'SOS';

      const iconHtml = `
        <div class="relative group">
          ${isSOS ? '<div class="absolute inset-[-12px] bg-red-500 rounded-full animate-ping opacity-20"></div>' : ''}
          ${isActive ? '<div class="absolute inset-[-6px] bg-emerald-500 rounded-full animate-pulse opacity-10"></div>' : ''}
          
          <div class="w-12 h-12 rounded-[1.25rem] flex flex-col items-center justify-center shadow-[0_0_25px_rgba(0,0,0,0.6)] transition-all duration-300 border-2 relative z-10 ${
            isSOS ? 'bg-red-600 border-red-400 text-white animate-bounce' :
            isActive ? 'bg-emerald-600 border-emerald-400 text-white' :
            'bg-[var(--color-surface)] border-white/10 text-scmd-silver/40 shadow-inner'
          }">
            <div class="text-[7px] font-black absolute top-1 opacity-40 tracking-tighter uppercase">SEC-${(index + 1).toString().padStart(2, '0')}</div>
            <div class="mt-1">
              ${isAlert ? 
                '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' :
                isActive ?
                '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' :
                '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
              }
            </div>
          </div>

          <div class="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 pointer-events-none">
            <div class="px-3 py-1 bg-[var(--color-bg)]/90 backdrop-blur-2xl rounded-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,1)] flex flex-col items-center">
              <span class="text-[10px] font-black ${isSOS ? 'text-red-400' : isActive ? 'text-emerald-400' : 'text-scmd-silver'} uppercase tracking-[0.15em]">
                ${point.name}
              </span>
              ${point.lastPatrol ? `
                <div class="flex items-center gap-1.5 mt-0.5 opacity-50">
                  <div class="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                  <span class="text-[8px] font-bold text-scmd-silver/40 uppercase tracking-widest">${point.lastPatrol.time}</span>
                </div>
              ` : `
                <div class="text-[7px] font-bold text-scmd-silver/20 uppercase tracking-widest mt-0.5">Awaiting Sync</div>
              `}
            </div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'technical-node-icon',
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      const marker = L.marker([point.lat, point.lon], { icon: customIcon })
        .addTo(currentMap)
        .on('click', () => onPointClick(point));
      
      markersRef.current[point.id] = marker;
    });

    // Fit bounds if points exist
    if (Array.isArray(points) && points.length > 0) {
      const group = L.featureGroup(Object.values(markersRef.current));
      currentMap.fitBounds(group.getBounds().pad(0.2));
    }
  }
}, [points, onPointClick, viewMode, showRouteLine]);

  // Clean up map when unmounting or switching to schematic
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current && viewMode === 'SCHEMATIC') {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [viewMode]);


  return (
    <div className="relative w-full h-full bg-scmd-navy rounded-scmd-xl border border-white/5 overflow-hidden group flex flex-col">
      {/* Top Toggle Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex bg-[var(--color-surface)]/60 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
        <button 
          onClick={() => setViewMode('MAP')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black tracking-[0.15em] transition-all duration-300 ${viewMode === 'MAP' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-scmd-silver/40 hover:text-white'}`}
        >
          <MapIcon size={12} />
          BẢN ĐỒ
        </button>
        <button 
          onClick={() => setViewMode('SCHEMATIC')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black tracking-[0.15em] transition-all duration-300 ${viewMode === 'SCHEMATIC' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-scmd-silver/40 hover:text-white'}`}
        >
          <Route size={12} />
          SƠ ĐỒ
        </button>
      </div>

      {viewMode === 'MAP' ? (
        <>
          <div ref={mapContainerRef} className="w-full h-full z-0 flex-1 filter invert-[0.92] hue-rotate-[195deg] brightness-[0.6] contrast-[1.3] saturate-[0.7]" />
          
          {/* Legend */}
          <div className="absolute bottom-5 left-4 right-4 flex justify-center gap-8 bg-[var(--color-bg)]/80 backdrop-blur-2xl p-4 rounded-[2rem] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden flex-wrap z-10 transition-all group-hover:bottom-6">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
              <span className="text-[10px] font-black text-scmd-silver/60 uppercase tracking-widest">Đã kiểm tra</span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)]" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Lộ trình động</span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-3 h-3 rounded-xl bg-[var(--color-surface)] border border-white/5" />
              <span className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Chưa đến</span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-ping shadow-[0_0_15px_rgba(239,68,68,1)]" />
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">SOS ACTIVE</span>
            </div>
          </div>

          {/* Map Controls Overlay */}
          <div className="absolute top-6 right-6 z-10 hidden sm:flex flex-col gap-2">
            <div className="px-4 py-2 bg-scmd-slate/60 backdrop-blur-xl rounded-xl border border-white/5 text-scmd-cyber/60">
              <span className="text-[10px] font-black tracking-widest">OSM-SEC-GEOS</span>
            </div>
          </div>
        </>
      ) : (
        /* Schematic View - Enhanced with technical details */
        <div className="flex-1 w-full h-full flex items-center justify-start overflow-x-auto overflow-y-hidden px-16 no-scrollbar bg-[var(--color-bg)] relative">
           
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-surface)_0%,_var(--color-bg)_100%)]"></div>
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>

           <div className="flex items-center relative z-10 mx-auto min-w-max">
             {Array.isArray(points) && points.map((pt, i) => {
               const isAlert = pt.type === 'ALERT';
               return (
                 <div key={pt.id} className="flex items-center group/node shrink-0">
                   <div 
                     className="relative cursor-pointer flex flex-col items-center group-hover/node:-translate-y-3 transition-all duration-500"
                     onClick={() => onPointClick(pt)}
                   >
                     {/* Node Container */}
                     <div className="w-28 flex flex-col items-center">
                       {pt.status === 'SOS' && (
                         <div className="absolute top-0 w-16 h-16 bg-scmd-alert rounded-full animate-ping opacity-20 mt-[-8px]"></div>
                       )}
                       
                       <div className={cn(
                        "w-14 h-14 rounded-[1.5rem] flex items-center justify-center border-2 shadow-2xl transition-all duration-500 relative z-10",
                        pt.status === 'SOS' ? "bg-scmd-alert border-scmd-alert/50 text-white" : 
                        pt.status === 'ACTIVE' ? "bg-scmd-cyber border-scmd-cyber/50 text-white" : 
                        "bg-scmd-surface border-white/5 text-scmd-silver/40"
                       )}>
                         {isAlert ? <AlertCircle size={24} /> : <MapPin size={24} />}
                         {pt.status === 'ACTIVE' && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-scmd-navy">
                              <CheckCircle2 size={12} className="text-scmd-navy" strokeWidth={3} />
                            </div>
                         )}
                       </div>
                       
                       <div className="mt-5 text-center px-2">
                         <div className="text-[12px] font-black text-scmd-silver line-clamp-1 uppercase tracking-tight">{pt.name}</div>
                         <div className={cn(
                            "text-[8px] font-black tracking-[0.2em] mt-1.5 px-2 py-0.5 rounded-full border inline-block whitespace-nowrap",
                            pt.status === 'ACTIVE' ? "text-scmd-cyber border-scmd-cyber/30 bg-scmd-cyber/5" : 
                            pt.status === 'SOS' ? "text-scmd-alert border-scmd-alert/30 bg-scmd-alert/5" : 
                            "text-scmd-silver/20 border-white/5 bg-white/5"
                         )}>
                           {pt.status === 'ACTIVE' ? 'VERIFIED' : pt.status === 'SOS' ? 'BREACH' : 'SCANNING'}
                         </div>
                       </div>
                     </div>
                   </div>
                   
                   {/* Connection Line with Flow Animation */}
                   {i < points.length - 1 && (
                     <div className="w-16 sm:w-24 lg:w-32 h-1.5 mx-[-16px] bg-scmd-navy/50 rounded-full relative overflow-hidden z-0 shadow-inner border border-white/5">
                       {pt.status === 'ACTIVE' && (
                         <motion.div 
                          initial={{ x: '-100%' }}
                          animate={{ x: points[i+1]?.status === 'ACTIVE' ? '0%' : '-50%' }}
                          className="absolute inset-0 bg-scmd-cyber shadow-[0_0_15px_rgba(66,133,244,0.4)]"
                         />
                       )}
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                     </div>
                   )}
                 </div>
               );
             })}
           </div>
        </div>
      )}
    </div>
  );
};
