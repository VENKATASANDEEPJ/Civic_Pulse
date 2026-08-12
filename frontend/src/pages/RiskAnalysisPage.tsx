import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { ZoneDetail, ZoneSummary } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Brain, HelpCircle, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';

interface RiskAnalysisPageProps {
  zones: ZoneSummary[];
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
}

export const RiskAnalysisPage: React.FC<RiskAnalysisPageProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
}) => {
  const [detail, setDetail] = useState<ZoneDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getZoneDetail(selectedZoneId)
      .then((data) => {
        if (mounted) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error loading zone detail:", err);
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [selectedZoneId]);

  if (loading || !detail) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 font-mono text-sm animate-pulse">Loading Explainable AI Risk Attribution for {selectedZoneId}...</div>
      </div>
    );
  }

  const { explanation, recommendation, timeline } = detail;

  return (
    <div className="space-y-6">
      {/* Zone Selector Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <Brain className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{detail.name} ({detail.zone_id})</h1>
              <RiskBadge level={detail.current_risk_level} score={detail.current_risk_score} size="md" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{detail.type} • Vulnerability Index: {detail.vulnerability} • Infrastructure Age: {detail.infra_age} yrs</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-semibold uppercase font-mono">Select Zone:</label>
          <select
            value={selectedZoneId}
            onChange={(e) => onSelectZone(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-500"
          >
            {zones.map((z) => (
              <option key={z.zone_id} value={z.zone_id}>
                {z.name} ({z.risk_score.toFixed(0)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Natural Language Explanation Banner */}
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-5 relative overflow-hidden">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 mt-0.5">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">Explainable AI (SHAP) Model Attribution</div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {explanation.human_explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: SHAP Feature Force Attribution vs Decision Engine Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SHAP Feature Contribution Waterfall Bar */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Top Feature Contributors (SHAP Value Attribution)</h2>
            <p className="text-xs text-slate-400">Positive drivers push risk score higher; negative drivers buffer risk score lower.</p>
          </div>

          <div className="space-y-3 pt-2">
            {explanation.top_positive_contributors.map((contrib, idx) => (
              <div key={`pos-${idx}`} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-200 font-bold flex items-center space-x-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                    <span>{contrib.feature_name_human}</span>
                  </span>
                  <span className="text-rose-400 font-bold">+{contrib.shap_impact.toFixed(3)} (Val: {contrib.value})</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.abs(contrib.shap_impact) * 250)}%` }}
                  ></div>
                </div>
              </div>
            ))}

            {explanation.top_negative_contributors.map((contrib, idx) => (
              <div key={`neg-${idx}`} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-200 font-bold flex items-center space-x-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span>{contrib.feature_name_human}</span>
                  </span>
                  <span className="text-emerald-400 font-bold">{contrib.shap_impact.toFixed(3)} (Val: {contrib.value})</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.abs(contrib.shap_impact) * 250)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Recommendation Card */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Decision Engine Policy</h2>
              <span className="px-2.5 py-1 text-xs font-bold font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                SLA: {recommendation.sla}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-400 uppercase font-mono tracking-wider font-semibold">Action Dispatch Plan</div>
              <div className="text-sm font-bold text-white">{recommendation.action_title}</div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-slate-300">Mandated Operational Steps:</div>
              <div className="space-y-2">
                {recommendation.recommended_steps.map((step, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/50 flex items-start space-x-2 text-xs text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 font-mono">
            Addressing Primary Driver: <strong className="text-cyan-400">{recommendation.primary_driver_addressed}</strong>
          </div>
        </div>
      </div>

      {/* Historical Time-Series Signals Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">180-Day Historical Signal & Risk Score Timeline</h2>
          <p className="text-xs text-slate-400">Co-trending rainfall anomalies (mm), daily civic complaint volume, and predicted risk score trajectory.</p>
        </div>

        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis yAxisId="risk" domain={[0, 100]} stroke="#38bdf8" fontSize={11} />
              <YAxis yAxisId="rain" orientation="right" domain={[0, 'auto']} stroke="#f59e0b" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff' }} />
              <Legend />
              <ReferenceLine y={60} yAxisId="risk" stroke="#f97316" strokeDasharray="3 3" label={{ value: 'HIGH Threshold (60)', fill: '#f97316', fontSize: 10 }} />
              <ReferenceLine y={80} yAxisId="risk" stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'CRITICAL Threshold (80)', fill: '#ef4444', fontSize: 10 }} />
              <Line yAxisId="risk" type="monotone" dataKey="risk_score" name="Risk Score (0-100)" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
              <Line yAxisId="rain" type="monotone" dataKey="rainfall_mm" name="Rainfall (mm)" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              <Line yAxisId="risk" type="monotone" dataKey="total_complaints" name="Total Complaints" stroke="#10b981" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
