import React from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';
import { ZoneSummary } from '../types';
import { RiskBadge } from './RiskBadge';

interface RiskMapProps {
  zones: ZoneSummary[];
  selectedZoneId?: string;
  onSelectZone: (zoneId: string) => void;
}

export const RiskMap: React.FC<RiskMapProps> = ({ zones, selectedZoneId, onSelectZone }) => {
  // Center near San Francisco bay area centroid
  const center: [number, number] = [37.7600, -122.4200];

  const getStyle = (feature: any) => {
    const zid = feature?.properties?.zone_id;
    const zone = zones.find((z) => z.zone_id === zid);
    const score = zone ? zone.risk_score : 0;
    const isSelected = zid === selectedZoneId;

    let color = '#10b981'; // LOW
    if (score >= 80) color = '#ef4444'; // CRITICAL
    else if (score >= 60) color = '#f97316'; // HIGH
    else if (score >= 30) color = '#f59e0b'; // WATCH

    return {
      fillColor: color,
      weight: isSelected ? 3 : 1.5,
      opacity: 1,
      color: isSelected ? '#38bdf8' : '#475569',
      fillOpacity: isSelected ? 0.65 : 0.45,
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const zid = feature?.properties?.zone_id;
    const zone = zones.find((z) => z.zone_id === zid);

    layer.on({
      click: () => {
        if (zid) onSelectZone(zid);
      },
    });
  };

  return (
    <div className="h-[520px] w-full rounded-xl overflow-hidden border border-slate-800 shadow-xl relative">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> Dark Matter'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {zones.map((z) => {
          if (!z.geojson || !z.geojson.geometry) return null;
          return (
            <GeoJSON
              key={z.zone_id}
              data={z.geojson}
              style={getStyle}
              onEachFeature={onEachFeature}
            >
              <Popup>
                <div className="p-2 space-y-2 min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{z.name}</span>
                    <RiskBadge level={z.risk_level} score={z.risk_score} size="sm" />
                  </div>
                  <div className="text-xs text-slate-300 space-y-1 font-mono">
                    <div>Rainfall: <span className="text-cyan-400 font-bold">{z.rainfall_mm} mm</span></div>
                    <div>Complaints: <span className="text-amber-400 font-bold">{z.total_complaints}</span></div>
                    <div>Infra Stress: <span className="text-rose-400 font-bold">{z.infra_stress_score}/100</span></div>
                  </div>
                  <p className="text-[11px] text-slate-400 border-t border-slate-700 pt-1 mt-1 font-sans">
                    Top Driver: <strong className="text-slate-200">{z.top_driver}</strong>
                  </p>
                  <button
                    onClick={() => onSelectZone(z.zone_id)}
                    className="w-full mt-2 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold"
                  >
                    Inspect Zone Details →
                  </button>
                </div>
              </Popup>
            </GeoJSON>
          );
        })}
      </MapContainer>
      
      {/* Legend Overlay */}
      <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-3 z-[1000] text-xs font-mono">
        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold block mb-2">Zone Risk Map Legend</span>
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-rose-500"></span>
            <span className="text-slate-200 font-bold">CRITICAL (80-100)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-amber-500"></span>
            <span className="text-slate-200 font-bold">HIGH (60-80)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
            <span className="text-slate-200 font-bold">WATCH (30-60)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
            <span className="text-slate-200 font-bold">LOW (0-30)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
