import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { EarlyWarningAlert } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { ShieldAlert, Clock, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface EarlyWarningsPageProps {
  onSelectZone: (zoneId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const EarlyWarningsPage: React.FC<EarlyWarningsPageProps> = ({ onSelectZone, onNavigateTab }) => {
  const [warnings, setWarnings] = useState<EarlyWarningAlert[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getWarnings()
      .then((data) => {
        setWarnings(data.active_warnings);
        setMetrics(data.early_warning_metrics);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching warnings:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 font-mono text-sm text-slate-400 animate-pulse">
        Fetching Active Early Warnings & Lead Time Benchmarks...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Active Early Warning Console</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Prioritized operational alerts sorted by model risk severity and projected lead time before incident occurrence.
          </p>
        </div>

        {metrics && (
          <div className="flex items-center space-x-4 bg-slate-950 border border-slate-800 p-3 rounded-lg font-mono text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">AVG LEAD TIME</span>
              <span className="text-amber-400 font-bold text-sm">{metrics.average_lead_time_hours} Hours ({metrics.average_lead_time_days} days)</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 block text-[10px]">DETECTION RATE</span>
              <span className="text-emerald-400 font-bold text-sm">{metrics.detection_rate_percent}</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 block text-[10px]">FALSE ALARM RATE</span>
              <span className="text-slate-300 font-bold text-sm">{metrics.false_alarm_rate_percent}</span>
            </div>
          </div>
        )}
      </div>

      {/* Warnings List Grid */}
      <div className="space-y-4">
        {warnings.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <span>No active CRITICAL or HIGH risk warnings at present. All zones operating within normal thresholds.</span>
          </div>
        ) : (
          warnings.map((w) => (
            <div
              key={w.zone_id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-3">
                  <RiskBadge level={w.risk_level} score={w.risk_score} size="lg" />
                  <div>
                    <h2 className="text-base font-bold text-white">{w.name} ({w.zone_id})</h2>
                    <span className="text-xs text-slate-400 font-mono">Top Trigger Driver: <strong className="text-cyan-400">{w.top_driver}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono">
                  <div className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg flex items-center space-x-1.5 font-bold">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Est. Lead Time: ~{w.estimated_lead_time_hours} Hours</span>
                  </div>
                  <button
                    onClick={() => {
                      onSelectZone(w.zone_id);
                      onNavigateTab('analysis');
                    }}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold flex items-center space-x-1"
                  >
                    <span>Analyze Zone</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Reasoning & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[10px]">Model Explanation Summary</div>
                  <p className="text-slate-300 leading-relaxed font-sans">{w.explanation_summary}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-bold text-cyan-400 font-mono text-[10px] uppercase">{w.recommendation.action_title} ({w.recommendation.sla})</div>
                  <ul className="space-y-1 text-slate-300 list-disc list-inside mt-1 font-sans">
                    {w.recommendation.recommended_steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
