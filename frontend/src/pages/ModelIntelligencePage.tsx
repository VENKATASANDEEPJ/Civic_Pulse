import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { ModelMetrics } from '../types';
import { Cpu, CheckCircle2, Award, Zap, BarChart2, ShieldCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const ModelIntelligencePage: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [anomalies, setAnomalies] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([api.getModelMetrics(), api.getAnomalies()])
      .then(([mRes, aRes]) => {
        setMetrics(mRes);
        setAnomalies(aRes);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching model intelligence:", err);
        setLoading(false);
      });
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64 font-mono text-sm text-slate-400 animate-pulse">
        Loading Machine Learning Model Evaluation Benchmarks & Metrics...
      </div>
    );
  }

  // Format ROC curve comparison data for chart
  const selectedModelData = metrics.evaluation_metrics[metrics.selected_model];
  const rocChartData = selectedModelData ? selectedModelData.roc_curve.fpr.map((fpr, i) => ({
    fpr,
    tpr: selectedModelData.roc_curve.tpr[i],
    random: fpr,
  })) : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Model Intelligence & Validation Hub</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical evaluation metrics, time-aware cross validation benchmarks, and anomaly detection algorithm comparisons.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5">
          <Award className="h-4 w-4" />
          <span>Optimal Model: {metrics.selected_model}</span>
        </div>
      </div>

      {/* Model Benchmark Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Supervised Model Comparison (Time-Aware Train/Test Split)</h2>
          <p className="text-xs text-slate-400">Models evaluated on 15% out-of-time test window to prevent future data leakage.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Model Architecture</th>
                <th className="py-2.5 px-3">Precision</th>
                <th className="py-2.5 px-3">Recall (Incident Safety)</th>
                <th className="py-2.5 px-3">F1 Score</th>
                <th className="py-2.5 px-3">ROC-AUC</th>
                <th className="py-2.5 px-3">PR-AUC</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Object.entries(metrics.evaluation_metrics).map(([mName, rawEval]) => {
                const mEval = rawEval as any;
                const isSelected = mName === metrics.selected_model;
                return (
                  <tr key={mName} className={`hover:bg-slate-800/40 ${isSelected ? 'bg-cyan-950/20 font-bold' : ''}`}>
                    <td className="py-3 px-3 text-white flex items-center space-x-2">
                      <span>{mName}</span>
                      {isSelected && <span className="px-1.5 py-0.5 text-[9px] bg-cyan-600 text-white rounded">SELECTED</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-200">{mEval.precision.toFixed(3)}</td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">{mEval.recall.toFixed(3)}</td>
                    <td className="py-3 px-3 text-slate-200">{mEval.f1.toFixed(3)}</td>
                    <td className="py-3 px-3 text-cyan-400 font-bold">{mEval.roc_auc.toFixed(3)}</td>
                    <td className="py-3 px-3 text-slate-200">{mEval.pr_auc.toFixed(3)}</td>
                    <td className="py-3 px-3">
                      {isSelected ? (
                        <span className="text-emerald-400 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Active Production</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Evaluated</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: ROC Curve & Anomaly Detection Method Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ROC Curve Chart */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">ROC Curve ({metrics.selected_model})</h2>
            <p className="text-xs text-slate-400">Receiver Operating Characteristic evaluating True Positive Rate vs False Positive Rate.</p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rocChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="fpr" type="number" domain={[0, 1]} stroke="#64748b" fontSize={11} />
                <YAxis dataKey="tpr" type="number" domain={[0, 1]} stroke="#38bdf8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff' }} />
                <Legend />
                <Line type="monotone" dataKey="tpr" name={`ROC Curve (AUC=${selectedModelData?.roc_auc})`} stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="random" name="Random Classifier Baseline" stroke="#64748b" strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Anomaly Detection Comparison */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Anomaly Detection Method Comparison</h2>
              <span className="text-xs font-mono text-yellow-400 font-bold">Unsupervised vs Statistical</span>
            </div>

            {anomalies && (
              <div className="space-y-4 mt-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">ISOLATION FOREST FLAGS</span>
                    <span className="text-yellow-400 font-bold text-lg">{anomalies.metrics.iso_total_anomalies}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">STATISTICAL Z-SCORE FLAGS</span>
                    <span className="text-cyan-400 font-bold text-lg">{anomalies.metrics.stat_total_anomalies}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">METHOD OVERLAP (JACCARD INDEX)</span>
                  <span className="text-emerald-400 font-bold text-sm">{anomalies.metrics.jaccard_overlap * 100}% Overlap</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 font-sans leading-relaxed text-xs">
                  {anomalies.metrics.comparison_summary}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
