import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { EarlyWarningAlert, RiskLevel } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  ArrowRight,
  Filter,
  Search,
  Check,
  CheckCheck,
  RotateCcw,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface EarlyWarningsPageProps {
  onSelectZone: (zoneId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const EarlyWarningsPage: React.FC<EarlyWarningsPageProps> = ({ onSelectZone, onNavigateTab }) => {
  const [warnings, setWarnings] = useState<EarlyWarningAlert[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchWarnings = () => {
    setLoading(true);
    api.getWarnings({
      status: statusFilter,
      severity: severityFilter,
      search: searchQuery.trim() || undefined,
    })
      .then((data) => {
        setWarnings(data.active_warnings);
        setMetrics(data.early_warning_metrics);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching warnings:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWarnings();
  }, [statusFilter, severityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWarnings();
  };

  const handleAcknowledge = async (alertId: string) => {
    const notes = prompt("Enter operational acknowledgement notes (optional):", "Field inspection dispatch acknowledged by sector supervisor.");
    if (notes === null) return; // User cancelled
    setActionLoading(alertId);
    try {
      await api.acknowledgeAlert(alertId, notes);
      fetchWarnings();
    } catch (err) {
      console.error("Error acknowledging alert:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (alertId: string) => {
    const notes = prompt("Enter resolution confirmation remarks (optional):", "Catch basins cleared and hydro-vac crew confirmed normal conduit flow.");
    if (notes === null) return;
    setActionLoading(alertId);
    try {
      await api.resolveAlert(alertId, notes);
      fetchWarnings();
    } catch (err) {
      console.error("Error resolving alert:", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Active Early Warning & Alert Management Console</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Prioritized operational alerts persisted in SQLite. Acknowledged and resolved statuses survive browser refreshes.
          </p>
        </div>

        {metrics && (
          <div className="flex flex-wrap items-center gap-3 bg-slate-950 border border-slate-800 p-3 rounded-lg font-mono text-xs shadow-inner">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">AVG LEAD TIME</span>
              <span className="text-amber-400 font-bold text-sm">
                {metrics.average_lead_time_hours}h ({metrics.average_lead_time_days}d)
              </span>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">DETECTION RATE</span>
              <span className="text-emerald-400 font-bold text-sm">{metrics.detection_rate_percent}</span>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">FALSE ALARM RATE</span>
              <span className="text-slate-300 font-bold text-sm">{metrics.false_alarm_rate_percent}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs shadow">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-slate-400 text-[11px] font-semibold mr-1">STATUS:</span>
          {[
            { id: 'ALL', label: 'All Alerts' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'ACKNOWLEDGED', label: 'Acknowledged' },
            { id: 'RESOLVED', label: 'Resolved' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st.id
                  ? 'bg-cyan-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Severity Filter & Search Form */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400 text-[11px] font-semibold">SEVERITY:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="WATCH">Watch</option>
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-60">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search alert, zone, driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </form>
        </div>
      </div>

      {/* Warnings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs font-mono animate-pulse">
            Querying SQLite early warnings records...
          </div>
        ) : warnings.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400 text-sm space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <div className="font-bold text-white">No Warnings Match Criteria</div>
            <p className="text-xs text-slate-500 font-mono">
              All monitored urban sectors are operating within documented safety limits under filter ({statusFilter}).
            </p>
          </div>
        ) : (
          warnings.map((w) => {
            const isAcknowledged = w.status === 'ACKNOWLEDGED';
            const isResolved = w.status === 'RESOLVED';
            const isActive = w.status === 'ACTIVE';

            return (
              <div
                key={w.alert_id}
                className={`bg-slate-900 border rounded-xl p-5 transition space-y-4 shadow ${
                  isActive
                    ? 'border-rose-500/40 hover:border-rose-500/70'
                    : isAcknowledged
                    ? 'border-cyan-500/40 hover:border-cyan-500/70'
                    : 'border-emerald-500/30 opacity-80'
                }`}
              >
                {/* Alert Top Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-3">
                    <RiskBadge level={w.severity || w.risk_level} score={w.risk_score} size="lg" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-cyan-400 text-xs font-bold">{w.alert_id}</span>
                        <h2 className="text-base font-bold text-white">{w.name} ({w.zone_id})</h2>
                        {/* Status Tag */}
                        {isActive && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-800 rounded animate-pulse">
                            ACTIVE ALERT
                          </span>
                        )}
                        {isAcknowledged && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
                            ACKNOWLEDGED
                          </span>
                        )}
                        {isResolved && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                            RESOLVED
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                        Trigger Driver: <strong className="text-slate-200">{w.top_driver}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions & Timers */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <div className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg flex items-center space-x-1.5 font-bold">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Lead: ~{w.estimated_lead_time_hours || 92}h</span>
                    </div>

                    {/* Acknowledge Button */}
                    {!isAcknowledged && !isResolved && (
                      <button
                        onClick={() => handleAcknowledge(w.alert_id)}
                        disabled={actionLoading === w.alert_id}
                        className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg font-bold flex items-center space-x-1 transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {/* Resolve Button */}
                    {!isResolved && (
                      <button
                        onClick={() => handleResolve(w.alert_id)}
                        disabled={actionLoading === w.alert_id}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center space-x-1 transition"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}

                    {/* Analyze Zone */}
                    <button
                      onClick={() => {
                        onSelectZone(w.zone_id);
                        onNavigateTab('analysis');
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg font-bold flex items-center space-x-1 transition"
                    >
                      <span>Analyze</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Reasoning & Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[10px]">
                      Model Attribution Summary
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans">{w.explanation_summary}</p>
                    {w.notes && (
                      <div className="border-t border-slate-800/80 pt-1.5 text-cyan-400 font-mono text-[11px]">
                        <strong>Dispatcher Remark:</strong> {w.notes}
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="font-bold text-cyan-400 font-mono text-[10px] uppercase">
                      {w.action_title || w.recommendation?.action_title || 'Mandated Response SLA'} (
                      {w.sla || w.recommendation?.sla || 'Within 24 Hours'})
                    </div>
                    <ul className="space-y-1 text-slate-300 list-disc list-inside mt-1 font-sans">
                      {(w.recommended_steps || w.recommendation?.recommended_steps || []).map((step: string, idx: number) => (
                        <li key={idx} className="leading-snug">{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
