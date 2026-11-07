import React, { useState, useMemo } from 'react';
import { CityOverview, RiskLevel } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { RiskMap } from '../components/RiskMap';
import {
  ShieldAlert,
  Activity,
  Clock,
  Zap,
  ArrowUpRight,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  Info,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface OverviewPageProps {
  overview: CityOverview;
  onSelectZone: (zoneId: string) => void;
  onNavigateTab: (tab: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  overview,
  onSelectZone,
  onNavigateTab,
  onRefresh,
  refreshing = false,
}) => {
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dynamic client-side filtering based on user input
  const filteredZones = useMemo(() => {
    return overview.zones_summary.filter((z) => {
      if (selectedZoneFilter !== 'ALL' && z.zone_id !== selectedZoneFilter) return false;
      if (selectedRiskFilter !== 'ALL' && z.risk_level !== selectedRiskFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = z.name.toLowerCase().includes(q);
        const matchId = z.zone_id.toLowerCase().includes(q);
        const matchDriver = z.top_driver.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDriver) return false;
      }
      return true;
    });
  }, [overview.zones_summary, selectedZoneFilter, selectedRiskFilter, searchQuery]);

  // Derived dynamic metrics from current filtered view
  const currentAvgRisk = useMemo(() => {
    if (filteredZones.length === 0) return 0;
    const sum = filteredZones.reduce((acc, z) => acc + z.risk_score, 0);
    return Math.round((sum / filteredZones.length) * 10) / 10;
  }, [filteredZones]);

  const criticalCount = useMemo(() => filteredZones.filter((z) => z.risk_score >= 80).length, [filteredZones]);
  const highCount = useMemo(() => filteredZones.filter((z) => z.risk_score >= 60 && z.risk_score < 80).length, [filteredZones]);
  const watchCount = useMemo(() => filteredZones.filter((z) => z.risk_score >= 30 && z.risk_score < 60).length, [filteredZones]);
  const lowCount = useMemo(() => filteredZones.filter((z) => z.risk_score < 30).length, [filteredZones]);

  const chartData = useMemo(() => {
    return filteredZones.map((z) => ({
      name: z.name.replace(' District', '').replace(' Sector', ''),
      zone_id: z.zone_id,
      risk_score: z.risk_score,
      level: z.risk_level,
    }));
  }, [filteredZones]);

  const getBarColor = (score: number) => {
    if (score >= 80) return '#ef4444'; // CRITICAL
    if (score >= 60) return '#f97316'; // HIGH
    if (score >= 30) return '#f59e0b'; // WATCH
    return '#10b981'; // LOW
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice & Transparency Disclosure */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">{overview.city_name} — Operational Risk Pulse</h1>
            <span className="px-2.5 py-0.5 text-xs bg-cyan-950 text-cyan-400 border border-cyan-800 rounded font-mono font-semibold">
              Live Horizon: {overview.dataset_date_range}
            </span>
            {overview.is_synthetic && (
              <span className="px-2.5 py-0.5 text-xs bg-amber-950/80 text-amber-400 border border-amber-800/80 rounded font-mono flex items-center space-x-1">
                <Info className="h-3 w-3" />
                <span>Synthetic Demonstration Baseline</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic urban risk monitoring aggregating civic complaint velocity, rainfall anomalies, and infrastructure stress indexes for municipal decision support.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onNavigateTab('warnings')}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Active Warnings ({overview.critical_zones_count + overview.high_risk_zones_count})</span>
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Filter Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Zone Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-[11px] font-semibold">ZONE:</span>
            <select
              value={selectedZoneFilter}
              onChange={(e) => setSelectedZoneFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Urban Zones ({overview.zones_summary.length})</option>
              {overview.zones_summary.map((z) => (
                <option key={z.zone_id} value={z.zone_id}>
                  {z.zone_id} — {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-[11px] font-semibold">SEVERITY:</span>
            <select
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Classifications</option>
              <option value="CRITICAL">Critical (80-100)</option>
              <option value="HIGH">High (60-80)</option>
              <option value="WATCH">Watch (30-60)</option>
              <option value="LOW">Low (0-30)</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search zone or driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* KPI Cards Grid — Dynamically update with filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Average Risk Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              {selectedZoneFilter !== 'ALL' || selectedRiskFilter !== 'ALL' ? 'Filtered Avg Risk' : 'City Average Risk'}
            </span>
            <Activity className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">{currentAvgRisk}</span>
            <span className="text-xs text-slate-400 font-mono">/ 100</span>
          </div>
          <div className="mt-2 flex items-center text-xs font-semibold">
            {currentAvgRisk >= 60 ? (
              <span className="text-rose-400 flex items-center space-x-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Elevated Operational Pressure</span>
              </span>
            ) : currentAvgRisk >= 30 ? (
              <span className="text-amber-400 flex items-center space-x-1">
                <Activity className="h-3.5 w-3.5" />
                <span>Moderate Operational Stress</span>
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Stable Operational Conditions</span>
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Critical & High Risk Zones */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Critical & High Risk</span>
            <ShieldAlert className="h-5 w-5 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-rose-400">
              {criticalCount + highCount}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ {filteredZones.length} zones</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 font-mono">
            {criticalCount} Critical, {highCount} High Priority
          </div>
        </div>

        {/* Metric 3: Early Warning Lead Time */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Early Warning Lead</span>
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-400">{overview.early_warning_lead_time_hours}</span>
            <span className="text-xs text-slate-400 font-mono">Hours Ahead</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 font-mono flex items-center space-x-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Detection Rate: {overview.detection_rate_percent}</span>
          </div>
        </div>

        {/* Metric 4: Active Multivariate Anomalies */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Signal Anomalies</span>
            <Zap className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-yellow-400">{overview.active_anomalies_count}</span>
            <span className="text-xs text-slate-400 font-mono">spikes active</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 font-mono">
            Isolation Forest Multi-signal Outliers
          </div>
        </div>
      </div>

      {/* Main Content Grid: Geospatial Risk Layer & Dynamic Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Geospatial Map */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Geospatial Risk Layer</h2>
              <p className="text-xs text-slate-400">Click any zone polygon on the map to inspect operational risk breakdown.</p>
            </div>
            <button
              onClick={() => onNavigateTab('map')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1 transition"
            >
              <span>Full Screen Map</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <RiskMap zones={overview.zones_summary} onSelectZone={onSelectZone} />
        </div>

        {/* Right Column: Dynamic Zone Risk Bar Chart & Top Priority Dispatches */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Zone Risk Distribution</h2>
                <p className="text-xs text-slate-400">Estimated risk scores (0-100) across urban sectors.</p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 font-bold">
                {filteredZones.length} of {overview.zones_summary.length} zones
              </span>
            </div>

            {chartData.length > 0 ? (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 35, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={110} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff' }}
                      formatter={(val: any) => [`${val}/100`, 'Risk Score']}
                    />
                    <Bar
                      dataKey="risk_score"
                      radius={[0, 4, 4, 0]}
                      onClick={(data: any) => {
                        if (data && data.zone_id) onSelectZone(data.zone_id);
                      }}
                      className="cursor-pointer"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.risk_score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-xs text-slate-500 font-mono">
                No zones match the current filter criteria.
              </div>
            )}
          </div>

          {/* Top Priority Dispatches */}
          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Priority Field Dispatches
              </h3>
              <button
                onClick={() => onNavigateTab('warnings')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                View Early Warnings →
              </button>
            </div>

            <div className="mt-2.5 space-y-2">
              {filteredZones.slice(0, 3).map((z) => (
                <div
                  key={z.zone_id}
                  onClick={() => onSelectZone(z.zone_id)}
                  className="p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg flex items-center justify-between cursor-pointer transition"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span className="font-mono text-cyan-400 text-[11px]">{z.zone_id}</span>
                      <span>{z.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Driver: <strong className="text-slate-300">{z.top_driver}</strong>
                    </div>
                  </div>
                  <RiskBadge level={z.risk_level} score={z.risk_score} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
