import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Nạp CSS Leaflet và các bản đè giao diện tối động
import 'leaflet/dist/leaflet.css';
import './LeafletMap.css';

// Sửa lỗi hiển thị icon marker khi đóng gói bằng Vite/Rollup
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface LeafletMapProps {
  center: [number, number];
  zoom: number;
  className?: string;
}

/**
 * SCMD Pro - Optimized Leaflet Map Component
 * Component này được thiết kế để sử dụng với React.lazy()
 * giúp tách toàn bộ thư viện Leaflet ra khỏi bundle chính.
 */
export default function LeafletMap({ center, zoom, className }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Khởi tạo bản đồ
    mapInstance.current = L.map(mapRef.current).setView(center, zoom);

    // Sử dụng OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM contributors'
    }).addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [center, zoom]);

  return (
    <div 
      ref={mapRef} 
      className={`h-full w-full min-h-[400px] rounded-2xl overflow-hidden border border-white/5 ${className}`} 
    />
  );
}