import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { CsvValidationReport, DataRecordsResponse } from '../types';
import {
  Database,
  Filter,
  CheckCircle2,
  FileText,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Search,
  Check,
  X,
  RefreshCw,
  Info,
} from 'lucide-react';

interface DataExplorerPageProps {
  zones: any[];
  onDataMutated?: () => void;
}

export const DataExplorerPage: React.FC<DataExplorerPageProps> = ({ zones, onDataMutated }) => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Raw records pagination & sorting state
  const [recordsData, setRecordsData] = useState<DataRecordsResponse | null>(null);
  const [recordsLoading, setRecordsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // CSV Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationReport, setValidationReport] = useState<CsvValidationReport | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSummary = () => {
    setLoading(true);
    api.getDataSummary()
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading data summary:", err);
        setLoading(false);
      });
  };

  const loadRecords = () => {
    setRecordsLoading(true);
    api.getRecords({
      page: currentPage,
      page_size: pageSize,
      zone_id: selectedZone,
      sort_by: sortBy,
      sort_desc: sortDesc,
      search: searchQuery.trim() || undefined,
    })
      .then((data) => {
        setRecordsData(data);
        setRecordsLoading(false);
      })
      .catch((err) => {
        console.error("Error loading records:", err);
        setRecordsLoading(false);
      });
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [currentPage, pageSize, selectedZone, sortBy, sortDesc]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadRecords();
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(column);
      setSortDesc(true);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadMessage(null);
      setUploading(true);
      try {
        const report = await api.validateCsv(file);
        setValidationReport(report);
      } catch (err: any) {
        setUploadMessage({
          type: 'error',
          text: err.response?.data?.detail || "Error validating CSV file schema.",
        });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadMessage(null);
    try {
      const res = await api.uploadCsv(selectedFile);
      setUploadMessage({
        type: 'success',
        text: res.message || "Custom dataset successfully imported into SQLite and analytics recalculated.",
      });
      setSelectedFile(null);
      setValidationReport(null);
      loadSummary();
      loadRecords();
      if (onDataMutated) onDataMutated();
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err.response?.data?.detail || "Import failed. Please check validation issues.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset to the default reproducible demonstration dataset (Seed 42)? Any custom imports will be replaced.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.resetDataset();
      setUploadMessage({
        type: 'success',
        text: res.message || "Dataset reset to default reproducible demonstration baseline.",
      });
      loadSummary();
      loadRecords();
      if (onDataMutated) onDataMutated();
    } catch (err) {
      console.error("Error resetting dataset:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64 font-mono text-sm text-slate-400 animate-pulse">
        Loading Urban Data Signal Explorer & Records...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Urban Data Signal Explorer & Ingestion Hub</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Inspect raw time-series signals, validate & import custom municipal CSV data, and export records.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={api.getExportCsvUrl(selectedZone)}
            download
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition shadow"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={handleReset}
            className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition"
            title="Reset dataset back to default reproducible demonstration baseline"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Dataset Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1 shadow">
          <span className="text-slate-500 text-[10px] uppercase font-bold">TOTAL RECORD ROWS</span>
          <div className="text-xl font-black text-white">{summary?.total_rows}</div>
          <span className="text-[11px] text-slate-400 block">{summary?.total_zones} Monitored Sectors</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1 shadow">
          <span className="text-slate-500 text-[10px] uppercase font-bold">OBSERVED DATE RANGE</span>
          <div className="text-xs font-bold text-cyan-400">{summary?.date_min} to {summary?.date_max}</div>
          <span className="text-[11px] text-slate-400 block">Daily Resolution Horizon</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1 shadow">
          <span className="text-slate-500 text-[10px] uppercase font-bold">GROUND TRUTH INCIDENTS</span>
          <div className="text-xl font-black text-rose-400">{summary?.total_incidents_recorded}</div>
          <span className="text-[11px] text-slate-400 block">Supervised Incident Events</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1 shadow">
          <span className="text-slate-500 text-[10px] uppercase font-bold">DATA PROVENANCE</span>
          <div className="text-xs font-bold text-amber-400 truncate" title={summary?.data_provenance}>
            {summary?.data_mode || 'Demonstration Mode'}
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            {summary?.is_synthetic ? 'Synthetic (Seed 42)' : 'User Imported Data'}
          </span>
        </div>
      </div>

      {/* CSV Upload & Validation Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Import Custom Municipal Signal CSV</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Supported columns: date, zone_id, rainfall_mm, total_complaints, drainage_clogs, potholes, infra_stress_score, incident_occurred
          </span>
        </div>

        {uploadMessage && (
          <div
            className={`p-3 rounded-lg text-xs font-mono flex items-center space-x-2 ${
              uploadMessage.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
            }`}
          >
            {uploadMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{uploadMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          <div className="md:col-span-4 flex items-center justify-end space-x-2">
            {validationReport && validationReport.is_valid && (
              <button
                onClick={handleImport}
                disabled={uploading}
                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold font-mono flex items-center justify-center space-x-1.5 transition shadow"
              >
                <Check className="h-4 w-4" />
                <span>{uploading ? 'Importing & Recalculating...' : 'Import Valid Records'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Validation Report Details */}
        {validationReport && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">
                File: <strong className="text-cyan-400">{validationReport.filename}</strong> ({validationReport.total_rows} rows)
              </span>
              {validationReport.is_valid ? (
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-bold flex items-center space-x-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Schema Validated</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-rose-950 text-rose-400 border border-rose-800 rounded font-bold flex items-center space-x-1">
                  <X className="h-3.5 w-3.5" />
                  <span>Schema Invalid</span>
                </span>
              )}
            </div>

            {validationReport.issues && validationReport.issues.length > 0 && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-lg text-rose-300 space-y-1">
                <span className="font-bold block text-[11px]">Validation Issues:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {validationReport.issues.map((iss, idx) => (
                    <li key={idx}>{iss}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Raw Time-Series Records Explorer Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white">Raw Urban Signal Records</h2>
            <p className="text-xs text-slate-400">
              Paginated database view. Click column headers to sort ascending / descending.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Zone Filter */}
            <div className="flex items-center space-x-1.5 font-mono text-xs">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedZone}
                onChange={(e) => {
                  setSelectedZone(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Zones ({zones.length})</option>
                {zones.map((z) => (
                  <option key={z.zone_id} value={z.zone_id}>
                    {z.zone_id} — {z.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Keyword Search */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search date, zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-44"
              />
            </form>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th onClick={() => handleSort('date')} className="py-2.5 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('zone_id')} className="py-2.5 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Zone ID</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Zone Name</th>
                <th onClick={() => handleSort('rainfall_mm')} className="py-2.5 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Rain (mm)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('total_complaints')} className="py-2.5 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Complaints</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('drainage_clogs')} className="py-2.5 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Drainage Clogs</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('infra_stress_score')} className="py-2.5 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Infra Stress</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('incident_occurred')} className="py-2.5 px-3 cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Incident</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recordsLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 font-mono">
                    Loading records from SQLite...
                  </td>
                </tr>
              ) : !recordsData || recordsData.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 font-mono">
                    No records found matching criteria.
                  </td>
                </tr>
              ) : (
                recordsData.items.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-300">{row.date}</td>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">{row.zone_id}</td>
                    <td className="py-2.5 px-3 text-white font-medium font-sans">{row.zone_name}</td>
                    <td className="py-2.5 px-3 text-amber-400">{row.rainfall_mm} mm</td>
                    <td className="py-2.5 px-3 text-slate-200">{row.total_complaints}</td>
                    <td className="py-2.5 px-3 text-slate-300">{row.drainage_clogs}</td>
                    <td className="py-2.5 px-3 text-rose-400 font-bold">{row.infra_stress_score}/100</td>
                    <td className="py-2.5 px-3">
                      {row.incident_occurred ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 rounded">
                          INCIDENT
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Normal</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {recordsData && recordsData.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs font-mono text-slate-400">
            <div>
              Showing Page <strong className="text-white">{recordsData.page}</strong> of{' '}
              <strong className="text-white">{recordsData.total_pages}</strong> ({recordsData.total} records total)
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={recordsData.page <= 1}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(recordsData.total_pages, p + 1))}
                disabled={recordsData.page >= recordsData.total_pages}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
