import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ZoneSummary, SimulationResult, ScenarioHistoryItem } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { Sliders, ArrowRight, ShieldCheck, RefreshCw, AlertCircle, History, Clock } from 'lucide-react';

interface SimulatorPageProps {
  zones: ZoneSummary[];
  selectedZoneId: string;
}

export const SimulatorPage: React.FC<SimulatorPageProps> = ({ zones, selectedZoneId }) => {
  const [zoneId, setZoneId] = useState<string>(selectedZoneId || (zones[0]?.zone_id || 'ZONE-01'));
  const [complaintReduction, setComplaintReduction] = useState<number>(25);
  const [resolutionSpeedup, setResolutionSpeedup] = useState<number>(30);
  const [infraInvestment, setInfraInvestment] = useState<number>(15);
  const [drainageInspection, setDrainageInspection] = useState<boolean>(true);

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<ScenarioHistoryItem[]>([]);
  const [simulating, setSimulating] = useState<boolean>(false);

  const loadHistory = () => {
    api.getScenarioHistory()
      .then((data) => setHistory(data))
      .catch((err) => console.error("Error loading scenario history:", err));
  };

  const runSimulation = () => {
    setSimulating(true);
    api.simulateScenario({
      zone_id: zoneId,
      complaint_reduction_pct: complaintReduction,
      resolution_speedup_pct: resolutionSpeedup,
      infra_investment_delta: infraInvestment,
      drainage_inspection_active: drainageInspection,
    })
      .then((res) => {
        setResult(res);
        setSimulating(false);
        loadHistory();
      })
      .catch((err) => {
        console.error("Simulation error:", err);
        setSimulating(false);
      });
  };

  useEffect(() => {
    runSimulation();
    loadHistory();
  }, [zoneId]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">What-If Counterfactual Scenario Simulator</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Evaluate counterfactual municipal interventions using the calibrated Python model. All simulations are logged to SQLite.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5">
          <AlertCircle className="h-4 w-4" />
          <span>Model Inference Calculation</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Intervention Levers Controls */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 shadow">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white">Intervention Controls</h2>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-500 font-mono"
            >
              {zones.map((z) => (
                <option key={z.zone_id} value={z.zone_id}>
                  {z.name} ({z.zone_id})
                </option>
              ))}
            </select>
          </div>

          {/* Slider 1: Complaint Reduction % */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">Public Waste & Complaint Reduction</span>
              <span className="text-cyan-400 font-bold">{complaintReduction}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={complaintReduction}
              onChange={(e) => setComplaintReduction(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[11px] text-slate-500 block">
              Simulates community waste management & rapid civic ticket resolution.
            </span>
          </div>

          {/* Slider 2: Resolution Speedup % */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">Maintenance Dispatch Speedup</span>
              <span className="text-cyan-400 font-bold">{resolutionSpeedup}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={resolutionSpeedup}
              onChange={(e) => setResolutionSpeedup(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[11px] text-slate-500 block">
              Reduces service maintenance resolution delay (hours).
            </span>
          </div>

          {/* Slider 3: Infrastructure Improvement Delta */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">Infrastructure Stress Index Reduction</span>
              <span className="text-cyan-400 font-bold">-{infraInvestment} pts</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={infraInvestment}
              onChange={(e) => setInfraInvestment(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[11px] text-slate-500 block">
              Simulates pipe repairs, culvert clearance, and road surface reinforcement.
            </span>
          </div>

          {/* Toggle Switch: Preemptive Drain Inspection */}
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Preemptive Storm Drain Clearance</span>
              <span className="text-[11px] text-slate-400 font-mono">Dispatch hydro-vac teams to clear high-risk catch basins.</span>
            </div>
            <input
              type="checkbox"
              checked={drainageInspection}
              onChange={(e) => setDrainageInspection(e.target.checked)}
              className="h-5 w-5 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
            />
          </div>

          <button
            onClick={runSimulation}
            disabled={simulating}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition shadow"
          >
            <RefreshCw className={`h-4 w-4 ${simulating ? 'animate-spin' : ''}`} />
            <span>{simulating ? 'Executing Python Calculation...' : 'Run Scenario Inference'}</span>
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 flex flex-col justify-between shadow">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Simulated Risk Delta Results</h2>
              {result && (
                <span className="text-xs font-mono text-cyan-400 font-bold">{result.simulation_label}</span>
              )}
            </div>

            {result ? (
              <div className="space-y-5 mt-4">
                {/* Score Comparison Display */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase font-mono">Baseline Risk Score</span>
                    <div className="text-3xl font-black text-slate-200">{result.baseline_risk_score}</div>
                    <RiskBadge level={result.baseline_risk_level as any} size="sm" />
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/30 text-center space-y-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase font-mono">Simulated Risk Score</span>
                    <div className="text-3xl font-black text-emerald-400">{result.simulated_risk_score}</div>
                    <RiskBadge level={result.simulated_risk_level as any} size="sm" />
                  </div>
                </div>

                {/* Delta Breakdown Banner */}
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ShieldCheck className="h-6 w-6 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-emerald-400 uppercase font-mono">Projected Risk Reduction</div>
                      <div className="text-lg font-black text-white">
                        {result.risk_score_delta} points ({result.percentage_risk_change})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assumptions Callout */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 text-xs text-slate-400">
                  <div className="font-bold text-slate-300 font-mono text-[10px] uppercase">
                    Simulation Methodology & Assumptions
                  </div>
                  <p className="leading-relaxed font-sans">{result.assumptions}</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 text-xs py-16 font-mono">
                Run scenario to view counterfactual outputs.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scenario Simulation History Table (Persistent SQLite records) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Scenario Simulation History (SQLite Persistent Log)</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {history.length} logged runs
          </span>
        </div>

        {history.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-8 font-mono">
            No past simulations recorded in SQLite. Run a scenario above to log results.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Run Time</th>
                  <th className="py-2.5 px-3">Zone</th>
                  <th className="py-2.5 px-3">Interventions Applied</th>
                  <th className="py-2.5 px-3">Baseline</th>
                  <th className="py-2.5 px-3">Simulated</th>
                  <th className="py-2.5 px-3">Risk Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-400">{h.timestamp.replace('T', ' ').substring(0, 19)}</td>
                    <td className="py-2.5 px-3 text-white font-bold">{h.zone_name} ({h.zone_id})</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      -{h.complaint_reduction_pct}% complaints, +{h.resolution_speedup_pct}% speed, -{h.infra_investment_delta} stress
                      {h.drainage_inspection_active ? ', drain cleared' : ''}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-bold">{h.baseline_risk_score}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">{h.simulated_risk_score}</td>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">{h.risk_delta} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
