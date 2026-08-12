import React from 'react';
import { CityOverview } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { RiskMap } from '../components/RiskMap';
import { ShieldAlert, Activity, Clock, Zap, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface OverviewPageProps {
  overview: CityOverview;
  onSelectZone: (zoneId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  overview,
  onSelectZone,
  onNavigateTab,
}) => {
  const chartData = overview.zones_summary.map((z) => ({
    name: z.name.replace(' District', '').replace(' Sector', ''),
    risk_score: z.risk_score,
    level: z.risk_level,
  }));

  const getBarColor = (score: number) => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 30) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">{overview.city_name} — Operational Risk Pulse</h1>
            <span className="px-2 py-0.5 text-xs bg-cyan-950 text-cyan-400 border border-cyan-800 rounded font-mono">
              Live Horizon: {overview.dataset_date_range}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time urban signal integration combining civic complaint velocity, rainfall anomalies, and infrastructure degradation indexes.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateTab('warnings')}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center space-x-1.5"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Active Warnings ({overview.critical_zones_count + overview.high_risk_zones_count})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">City Average Risk</span>
            <Activity className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">{overview.average_risk_score}</span>
            <span className="text-xs text-slate-400 font-mono">/ 100</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-cyan-400 font-medium">
            <span>Moderate Operational Stress</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical / High Zones</span>
            <ShieldAlert className="h-5 w-5 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-rose-400">
              {overview.critical_zones_count + overview.high_risk_zones_count}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ {overview.total_zones} zones</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 font-mono">
            {overview.critical_zones_count} Critical, {overview.high_risk_zones_count} High
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Early Warning Lead Time</span>
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-400">{overview.early_warning_lead_time_hours}</span>
            <span className="text-xs text-slate-400 font-mono">Hours Lead</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 font-mono flex items-center space-x-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Detection Rate: {overview.detection_rate_percent}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Signal Anomalies</span>
            <Zap className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-yellow-400">{overview.active_anomalies_count}</span>
            <span className="text-xs text-slate-400 font-mono">spikes</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 font-mono">
            Isolation Forest Multi-variate Flags
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map & Zone Risk Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Geospatial Risk Layer</h2>
              <p className="text-xs text-slate-400">Click any zone polygon to inspect operational risk breakdown.</p>
            </div>
            <button
              onClick={() => onNavigateTab('map')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
            >
              <span>Full Screen Map</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <RiskMap zones={overview.zones_summary} onSelectZone={onSelectZone} />
        </div>

        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Zone Risk Distribution</h2>
            <p className="text-xs text-slate-400">Model-estimated risk score (0-100) across urban sectors.</p>
            
            <div className="h-[320px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={110} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff' }}
                    formatter={(val: any) => [`${val}/100`, 'Risk Score']}
                  />
                  <Bar dataKey="risk_score" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.risk_score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Top Priority Dispatches</h3>
            <div className="mt-2 space-y-2">
              {overview.zones_summary.slice(0, 3).map((z) => (
                <div
                  key={z.zone_id}
                  onClick={() => onSelectZone(z.zone_id)}
                  className="p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg flex items-center justify-between cursor-pointer transition"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">{z.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">Driver: {z.top_driver}</div>
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
