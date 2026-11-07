import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { AssessmentReport, ZoneSummary } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import {
  FileText,
  Printer,
  Download,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Activity,
  Info,
} from 'lucide-react';

interface ReportsPageProps {
  zones: ZoneSummary[];
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
}) => {
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [assessmentPeriod, setAssessmentPeriod] = useState<string>('Last 30 Days (Operational Focus)');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReport = () => {
    setLoading(true);
    api.generateReport(selectedZoneId, assessmentPeriod)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error generating report:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReport();
  }, [selectedZoneId, assessmentPeriod]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Interactive Controls Bar — Hidden when printing */}
      <div className="print:hidden bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Municipal Decision Support & Reports</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generate printable operational risk assessment briefs with evidence attribution, observed signals, and mandated SLAs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Zone Selector */}
          <div className="flex items-center space-x-1.5 font-mono text-xs">
            <span className="text-slate-400 font-semibold">ZONE:</span>
            <select
              value={selectedZoneId}
              onChange={(e) => onSelectZone(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-500"
            >
              {zones.map((z) => (
                <option key={z.zone_id} value={z.zone_id}>
                  {z.zone_id} — {z.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Selector */}
          <div className="flex items-center space-x-1.5 font-mono text-xs">
            <span className="text-slate-400 font-semibold">HORIZON:</span>
            <select
              value={assessmentPeriod}
              onChange={(e) => setAssessmentPeriod(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="Last 30 Days (Operational Focus)">Last 30 Days</option>
              <option value="Quarterly Operations Review">Quarterly Audit</option>
              <option value="Full 180-Day Baseline Horizon">Full 180-Day Horizon</option>
            </select>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold font-mono flex items-center space-x-1.5 transition shadow"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report / PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      {loading || !report ? (
        <div className="flex items-center justify-center h-64 font-mono text-sm text-slate-400 animate-pulse">
          Generating formal risk assessment brief for {selectedZoneId}...
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl text-slate-200 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
          {/* Document Header */}
          <div className="border-b-2 border-slate-800 print:border-black pb-5 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 bg-cyan-950 text-cyan-400 print:bg-slate-200 print:text-black border border-cyan-800 rounded font-mono text-xs font-black">
                  OFFICIAL MUNICIPAL BRIEF
                </span>
                <span className="text-xs font-mono text-slate-400 print:text-slate-600">
                  REF: CP-REP-{report.zone_info.zone_id}
                </span>
              </div>
              <h2 className="text-xl font-black text-white print:text-black mt-2 tracking-tight">
                {report.report_title}
              </h2>
              <div className="text-xs text-slate-400 print:text-slate-600 font-mono mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>Generated: {report.generated_at}</span>
                <span>Assessment Horizon: {report.assessment_period}</span>
              </div>
            </div>

            <div className="text-right font-mono text-xs text-slate-400 print:text-slate-600 hidden sm:block">
              <div className="font-bold text-white print:text-black">CIVIC-PULSE SYSTEM</div>
              <div>Decision Intelligence v1.0</div>
            </div>
          </div>

          {/* Dataset Disclosure Notice */}
          <div className="p-3 bg-slate-950 print:bg-slate-100 rounded-lg border border-slate-800 print:border-slate-300 flex items-start space-x-2 text-xs">
            <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold font-mono text-slate-200 print:text-black">Data Source & Provenance Disclosure:</span>
              <p className="text-slate-400 print:text-slate-700">
                {report.dataset_identifier}.{' '}
                {report.is_synthetic
                  ? 'All observations derived from reproducible demonstration data with calibrated storm surges.'
                  : 'Derived from imported municipal operations signals.'}
              </p>
            </div>
          </div>

          {/* Zone Profile & Risk Gauge Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Zone Profile */}
            <div className="md:col-span-6 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 print:text-slate-700 uppercase tracking-wider font-mono">
                Territory Profile
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">SECTOR NAME</span>
                  <div className="font-bold text-white print:text-black text-sm">{report.zone_info.name}</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TYPOLOGY</span>
                  <div className="font-bold text-slate-300 print:text-slate-800">{report.zone_info.type}</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TERRITORY AREA</span>
                  <div className="font-bold text-slate-300 print:text-slate-800">{report.zone_info.area_km2} km²</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">INFRASTRUCTURE AGE</span>
                  <div className="font-bold text-slate-300 print:text-slate-800">{report.zone_info.infra_age_years} Years</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">VULNERABILITY INDEX</span>
                  <div className="font-bold text-cyan-400 print:text-cyan-800">{report.zone_info.vulnerability}</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">PRIMARY RISK DRIVER</span>
                  <div className="font-bold text-rose-400 print:text-rose-800 truncate">{report.risk_assessment.top_driver}</div>
                </div>
              </div>
            </div>

            {/* Risk Classification Gauge */}
            <div className="md:col-span-6 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-xl p-5 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 print:text-slate-700 uppercase tracking-wider font-mono">
                  Operational Risk Score
                </h3>
                <RiskBadge level={report.risk_assessment.risk_classification as any} score={report.risk_assessment.estimated_risk_score} size="md" />
              </div>

              <div className="my-2">
                <div className="text-4xl font-black text-white print:text-black font-mono">
                  {report.risk_assessment.estimated_risk_score} <span className="text-sm font-normal text-slate-500">/ 100</span>
                </div>
                <div className="text-xs font-bold mt-1 text-cyan-400 print:text-cyan-800 font-mono uppercase">
                  Classification: {report.risk_assessment.risk_classification} RISK
                </div>
              </div>

              <p className="text-xs text-slate-300 print:text-slate-800 leading-relaxed font-sans">
                {report.risk_assessment.primary_evidence}
              </p>
            </div>
          </div>

          {/* 30-Day Observed Indicators Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 print:text-slate-700 uppercase tracking-wider font-mono">
              Observed Environmental & Operational Indicators (Last 30 Days)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-lg">
                <span className="text-slate-500 block text-[10px]">AVG RAINFALL</span>
                <span className="text-cyan-400 print:text-cyan-800 font-bold text-base">
                  {report.observed_indicators_30d.average_rainfall_mm} mm
                </span>
              </div>
              <div className="p-3 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-lg">
                <span className="text-slate-500 block text-[10px]">PEAK RAINFALL</span>
                <span className="text-amber-400 print:text-amber-800 font-bold text-base">
                  {report.observed_indicators_30d.peak_rainfall_mm} mm
                </span>
              </div>
              <div className="p-3 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-lg">
                <span className="text-slate-500 block text-[10px]">DAILY COMPLAINTS</span>
                <span className="text-slate-200 print:text-black font-bold text-base">
                  {report.observed_indicators_30d.average_daily_complaints}
                </span>
              </div>
              <div className="p-3 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-lg">
                <span className="text-slate-500 block text-[10px]">ANOMALIES</span>
                <span className="text-yellow-400 print:text-yellow-800 font-bold text-base">
                  {report.observed_indicators_30d.anomalies_detected}
                </span>
              </div>
              <div className="p-3 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-lg">
                <span className="text-slate-500 block text-[10px]">INCIDENTS</span>
                <span className="text-rose-400 print:text-rose-800 font-bold text-base">
                  {report.observed_indicators_30d.recorded_incidents}
                </span>
              </div>
            </div>
          </div>

          {/* Recommended Operational Interventions & SLA */}
          {report.recommended_actions && (
            <div className="p-5 bg-slate-950 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-2">
                <h3 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider font-mono">
                  Mandated Field Actions & Response Protocol
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-cyan-950 text-cyan-400 print:bg-slate-200 print:text-black border border-cyan-800 rounded">
                  Response SLA: {report.recommended_actions.sla}
                </span>
              </div>

              <div className="text-sm font-bold text-white print:text-black font-sans">
                {report.recommended_actions.action_title}
              </div>

              <ul className="space-y-1.5 text-xs text-slate-300 print:text-slate-800 list-disc list-inside font-sans">
                {report.recommended_actions.recommended_steps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">{step}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Methodology & Limitations Footer */}
          <div className="border-t border-slate-800 print:border-slate-300 pt-4 space-y-2 text-[11px] text-slate-500 print:text-slate-600 font-mono">
            <div>
              <strong className="text-slate-400 print:text-black">Analytical Methodology:</strong>{' '}
              {report.methodology_summary}
            </div>
            <div>
              <strong className="text-slate-400 print:text-black">Operational Notice:</strong>{' '}
              {report.disclaimer_and_limitations}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
