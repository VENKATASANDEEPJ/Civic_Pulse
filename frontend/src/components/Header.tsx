import React from 'react';
import { Activity, ShieldAlert, Map, Cpu, Sliders, Database, FileText, CheckCircle2, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  criticalCount: number;
  dataMode?: string;
  isSynthetic?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  criticalCount,
  dataMode = 'Demonstration Mode',
  isSynthetic = true,
  onRefresh,
  refreshing = false,
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'map', label: 'Risk Map', icon: Map },
    { id: 'analysis', label: 'Risk Analysis', icon: ShieldAlert },
    { id: 'warnings', label: 'Early Warnings', icon: ShieldAlert, badge: criticalCount },
    { id: 'simulator', label: 'What-If Simulator', icon: Sliders },
    { id: 'intelligence', label: 'Model Intelligence', icon: Cpu },
    { id: 'explorer', label: 'Data Explorer', icon: Database },
    { id: 'reports', label: 'Decision Reports', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Operational Status */}
          <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => setActiveTab('overview')}>
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30 flex items-center justify-center">
              <Activity className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl tracking-tight text-white">CIVIC-PULSE</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                  v1.0 Operational
                </span>
                {isSynthetic ? (
                  <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/80 rounded">
                    Demo (Synthetic Seed 42)
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 rounded">
                    Custom Dataset Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Urban Risk Intelligence & Early Warning Decision Platform</p>
            </div>
          </div>

          {/* Right Header Extras: System Status & Refresh */}
          <div className="hidden lg:flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold">FastAPI Online</span>
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                title="Refresh analytical state from backend"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs transition"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/60 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-black bg-rose-500 text-white rounded-full animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
