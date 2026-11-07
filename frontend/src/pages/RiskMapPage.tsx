import React, { useState, useMemo } from 'react';
import { ZoneSummary, RiskLevel } from '../types';
import { RiskMap } from '../components/RiskMap';
import { RiskBadge } from '../components/RiskBadge';
import {
  MapPin,
  Search,
  SlidersHorizontal,
  CloudRain,
  AlertCircle,
  Clock,
  ArrowRight,
  FileText,
  ShieldAlert,
} from 'lucide-react';

interface RiskMapPageProps {
  zones: ZoneSummary[];
  selectedZoneId?: string;
  onSelectZone: (zoneId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const RiskMapPage: React.FC<RiskMapPageProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      if (riskFilter !== 'ALL' && z.risk_level !== riskFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = z.name.toLowerCase().includes(q);
        const matchId = z.zone_id.toLowerCase().includes(q);
        const matchDriver = z.top_driver.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDriver) return false;
      }
      return true;
    });
  }, [zones, riskFilter, searchQuery]);

  const selectedZone = useMemo(() => {
    return zones.find((z) => z.zone_id === selectedZoneId) || filteredZones[0] || zones[0];
  }, [zones, selectedZoneId, filteredZones]);

  return (
    <div className="space-y-6">
      {/* Top Banner and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Geospatial Risk Intelligence & Boundary Hotspots</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive GIS polygon boundaries showing zone-level model risk classifications and spatial lag spillover.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Severity Filter Buttons */}
          {(['ALL', 'CRITICAL', 'HIGH', 'WATCH', 'LOW'] as const).map((lvl) => {
            const isActive = riskFilter === lvl;
            return (
              <button
                key={lvl}
                onClick={() => setRiskFilter(lvl)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {lvl}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid: Map + Detailed Zone Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map View */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400 px-1">
            <span className="flex items-center space-x-1.5">
              <MapPin className="h-3.5 w-3.5 text-cyan-400" />
              <span>Showing {filteredZones.length} of {zones.length} urban sectors</span>
            </span>
            <span className="text-[11px] text-slate-500">Carto Dark Matter GIS Layer</span>
          </div>

          <RiskMap
            zones={filteredZones}
            selectedZoneId={selectedZone?.zone_id}
            onSelectZone={onSelectZone}
          />
        </div>

        {/* Detailed Zone Inspector Panel */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow flex flex-col justify-between">
          {selectedZone ? (
            <div className="space-y-4">
              {/* Zone Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider font-bold">
                    {selectedZone.zone_id}
                  </span>
                  <h2 className="text-lg font-bold text-white">{selectedZone.name}</h2>
                  <p className="text-xs text-slate-400">{selectedZone.type}</p>
                </div>
                <RiskBadge level={selectedZone.risk_level} score={selectedZone.risk_score} size="md" />
              </div>

              {/* Observed Signals Grid */}
              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">RAINFALL LEVEL</span>
                  <div className="text-cyan-400 font-bold text-sm mt-0.5">{selectedZone.rainfall_mm} mm</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">TOTAL COMPLAINTS</span>
                  <div className="text-amber-400 font-bold text-sm mt-0.5">{selectedZone.total_complaints}</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">INFRA STRESS</span>
                  <div className="text-rose-400 font-bold text-sm mt-0.5">{selectedZone.infra_stress_score}/100</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">TERRITORY AREA</span>
                  <div className="text-slate-200 font-bold text-sm mt-0.5">{selectedZone.area_km2} km²</div>
                </div>
              </div>

              {/* Top Driver Notice */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Primary Model Risk Driver
                </span>
                <div className="text-xs font-bold text-cyan-300">{selectedZone.top_driver}</div>
              </div>

              {/* Operational Recommendation & SLA */}
              {selectedZone.recommendation && (
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                      Dispatch Protocol
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 rounded font-bold">
                      SLA: {selectedZone.recommendation.sla}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="text-xs font-bold text-slate-200">
                      {selectedZone.recommendation.action_title}
                    </div>
                    <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                      {selectedZone.recommendation.recommended_steps.map((step, idx) => (
                        <li key={idx} className="leading-snug">{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {onNavigateTab && (
                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onSelectZone(selectedZone.zone_id);
                      onNavigateTab('analysis');
                    }}
                    className="py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition"
                  >
                    <span>Full Analysis</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      onSelectZone(selectedZone.zone_id);
                      onNavigateTab('reports');
                    }}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Zone Report</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center py-16 font-mono">
              Click a sector polygon on the map to inspect operational details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
