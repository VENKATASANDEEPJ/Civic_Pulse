import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Database, Filter, CheckCircle2, FileText, Download } from 'lucide-react';

interface DataExplorerPageProps {
  zones: any[];
}

export const DataExplorerPage: React.FC<DataExplorerPageProps> = ({ zones }) => {
  const [summary, setSummary] = useState<any>(null);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getDataSummary()
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading data summary:", err);
        setLoading(false);
      });
  }, []);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center h-64 font-mono text-sm text-slate-400 animate-pulse">
        Loading Data Provenance & Schema Summary...
      </div>
    );
  }

  const filteredZones = selectedZone === 'ALL' ? zones : zones.filter((z) => z.zone_id === selectedZone);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Urban Data Signal Explorer</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Inspect raw time-series signal records, schema validation reports, and synthetic data provenance parameters.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5">
          <CheckCircle2 className="h-4 w-4" />
          <span>Schema Verified • {summary.total_rows} Time-series Records</span>
        </div>
      </div>

      {/* Dataset Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-slate-400 text-[10px] uppercase">TOTAL RECORD ROWS</span>
          <div className="text-xl font-black text-white">{summary.total_rows}</div>
          <span className="text-[11px] text-slate-500 block">12 Zones × 180 Days</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-slate-400 text-[10px] uppercase">DATE RANGE</span>
          <div className="text-sm font-bold text-cyan-400">{summary.date_min} to {summary.date_max}</div>
          <span className="text-[11px] text-slate-500 block">6 Months Daily Resolution</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-slate-400 text-[10px] uppercase">GROUND TRUTH INCIDENTS</span>
          <div className="text-xl font-black text-rose-400">{summary.total_incidents_recorded}</div>
          <span className="text-[11px] text-slate-500 block">Labeled Incident Ground Truths</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-slate-400 text-[10px] uppercase">DATASET PROVENANCE</span>
          <div className="text-[11px] font-bold text-amber-400 truncate">{summary.data_provenance}</div>
          <span className="text-[11px] text-slate-500 block">Reproducible Random Seed 42</span>
        </div>
      </div>

      {/* Zone Signal Summary Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Urban Zone Signals Summary Table</h2>
            <p className="text-xs text-slate-400">Current active weather, complaint, and infrastructure metrics per zone.</p>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1 text-xs font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Zones ({zones.length})</option>
              {zones.map((z) => (
                <option key={z.zone_id} value={z.zone_id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Zone ID</th>
                <th className="py-2.5 px-3">Zone Name</th>
                <th className="py-2.5 px-3">Risk Score</th>
                <th className="py-2.5 px-3">Rainfall (mm)</th>
                <th className="py-2.5 px-3">Total Complaints</th>
                <th className="py-2.5 px-3">Infra Stress Index</th>
                <th className="py-2.5 px-3">Top Risk Driver</th>
                <th className="py-2.5 px-3">Synthetic Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredZones.map((z) => (
                <tr key={z.zone_id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 text-cyan-400 font-bold">{z.zone_id}</td>
                  <td className="py-3 px-3 text-white font-bold">{z.name}</td>
                  <td className="py-3 px-3 text-slate-200 font-bold">{z.risk_score.toFixed(1)}/100</td>
                  <td className="py-3 px-3 text-amber-400">{z.rainfall_mm} mm</td>
                  <td className="py-3 px-3 text-slate-200">{z.total_complaints}</td>
                  <td className="py-3 px-3 text-rose-400">{z.infra_stress_score}/100</td>
                  <td className="py-3 px-3 text-slate-300 font-sans">{z.top_driver}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-400 border border-slate-700 rounded">
                      SYNTHETIC SEED 42
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
