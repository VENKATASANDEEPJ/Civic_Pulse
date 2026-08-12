import React from 'react';
import { Activity, ShieldAlert, Map, Cpu, BarChart3, Sliders, Database } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  criticalCount: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, criticalCount }) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'map', label: 'Risk Map', icon: Map },
    { id: 'analysis', label: 'Risk Analysis', icon: ShieldAlert },
    { id: 'warnings', label: 'Early Warnings', icon: ShieldAlert, badge: criticalCount },
    { id: 'simulator', label: 'What-If Simulator', icon: Sliders },
    { id: 'intelligence', label: 'Model Intelligence', icon: Cpu },
    { id: 'explorer', label: 'Data Explorer', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <Activity className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white">CIVIC-PULSE</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                  Operational v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Urban Risk Intelligence & Early Warning System</p>
            </div>
          </div>

          <nav className="flex space-x-1 overflow-x-auto py-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[11px] font-extrabold bg-rose-500 text-white rounded-full animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
