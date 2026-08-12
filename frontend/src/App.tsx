import React, { useEffect, useState } from 'react';
import { api } from './api';
import { CityOverview } from './types';
import { Header } from './components/Header';
import { OverviewPage } from './pages/OverviewPage';
import { RiskMapPage } from './pages/RiskMapPage';
import { RiskAnalysisPage } from './pages/RiskAnalysisPage';
import { EarlyWarningsPage } from './pages/EarlyWarningsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { ModelIntelligencePage } from './pages/ModelIntelligencePage';
import { DataExplorerPage } from './pages/DataExplorerPage';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [overview, setOverview] = useState<CityOverview | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('ZONE-01');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    api.getOverview()
      .then((data) => {
        setOverview(data);
        if (data.zones_summary && data.zones_summary.length > 0) {
          // Default select highest risk zone
          setSelectedZoneId(data.zones_summary[0].zone_id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("API connection error:", err);
        setError("Unable to connect to CIVIC-PULSE backend API on http://localhost:8000. Ensure the FastAPI server is running.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
  };

  if (loading && !overview) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3 font-mono">
          <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-cyan-400 font-bold text-sm">Initializing CIVIC-PULSE Operational Intelligence...</div>
          <div className="text-xs text-slate-500">Connecting to FastAPI service on http://localhost:8000</div>
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-rose-500/40 rounded-xl p-6 max-w-md text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Backend Connection Error</h2>
          <p className="text-xs text-slate-400">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const criticalCount = overview ? (overview.critical_zones_count + overview.high_risk_zones_count) : 0;
  const zones = overview ? overview.zones_summary : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        criticalCount={criticalCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {overview && (
          <>
            {activeTab === 'overview' && (
              <OverviewPage
                overview={overview}
                onSelectZone={(zid) => {
                  handleSelectZone(zid);
                  setActiveTab('analysis');
                }}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'map' && (
              <RiskMapPage
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={(zid) => {
                  handleSelectZone(zid);
                }}
              />
            )}

            {activeTab === 'analysis' && (
              <RiskAnalysisPage
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
              />
            )}

            {activeTab === 'warnings' && (
              <EarlyWarningsPage
                onSelectZone={(zid) => {
                  handleSelectZone(zid);
                }}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'simulator' && (
              <SimulatorPage
                zones={zones}
                selectedZoneId={selectedZoneId}
              />
            )}

            {activeTab === 'intelligence' && (
              <ModelIntelligencePage />
            )}

            {activeTab === 'explorer' && (
              <DataExplorerPage zones={zones} />
            )}
          </>
        )}
      </main>

      <footer className="bg-slate-900/50 border-t border-slate-800/80 py-4 text-center text-xs text-slate-500 font-mono">
        <div>CIVIC-PULSE Urban Infrastructure Risk Intelligence System • Production Science Portfolio</div>
      </footer>
    </div>
  );
};
