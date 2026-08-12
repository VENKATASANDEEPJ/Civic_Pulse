import React from 'react';
import { ZoneSummary } from '../types';
import { RiskMap } from '../components/RiskMap';
import { RiskBadge } from '../components/RiskBadge';

interface RiskMapPageProps {
  zones: ZoneSummary[];
  selectedZoneId?: string;
  onSelectZone: (zoneId: string) => void;
}

export const RiskMapPage: React.FC<RiskMapPageProps> = ({ zones, selectedZoneId, onSelectZone }) => {
  const selectedZone = zones.find((z) => z.zone_id === selectedZoneId) || zones[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Geospatial Risk Intelligence & Hotspots</h1>
          <p className="text-xs text-slate-400">Interactive urban boundary polygons showing model risk levels and spatial lag adjacency.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <RiskMap zones={zones} selectedZoneId={selectedZoneId} onSelectZone={onSelectZone} />
        </div>

        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          {selectedZone ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider font-semibold">{selectedZone.zone_id}</span>
                  <h2 className="text-lg font-bold text-white">{selectedZone.name}</h2>
                  <p className="text-xs text-slate-400">{selectedZone.type}</p>
                </div>
                <RiskBadge level={selectedZone.risk_level} score={selectedZone.risk_score} size="md" />
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
                  <div className="text-slate-400 text-[10px]">RAINFALL</div>
                  <div className="text-cyan-400 font-bold text-sm mt-0.5">{selectedZone.rainfall_mm} mm</div>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
                  <div className="text-slate-400 text-[10px]">COMPLAINTS</div>
                  <div className="text-amber-400 font-bold text-sm mt-0.5">{selectedZone.total_complaints}</div>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
                  <div className="text-slate-400 text-[10px]">AREA</div>
                  <div className="text-slate-200 font-bold text-sm mt-0.5">{selectedZone.area_km2} km²</div>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
                  <div className="text-slate-400 text-[10px]">INFRA STRESS</div>
                  <div className="text-rose-400 font-bold text-sm mt-0.5">{selectedZone.infra_stress_score}/100</div>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Operational Dispatch SLA</div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-cyan-400">{selectedZone.recommendation.action_title}</div>
                  <div className="text-[11px] text-slate-400 font-mono">SLA: {selectedZone.recommendation.sla}</div>
                  <ul className="mt-2 space-y-1 text-xs text-slate-300 list-disc list-inside">
                    {selectedZone.recommendation.recommended_steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center py-10">Select a zone on the map to inspect details.</div>
          )}
        </div>
      </div>
    </div>
  );
};
