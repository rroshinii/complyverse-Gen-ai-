import React, { useEffect, useState } from 'react';
import { ShieldCheck, Network, UploadCloud, Cpu, HelpCircle, AlertTriangle, RefreshCw, Layers } from 'lucide-react';

export type ActiveTab = 'overview' | 'graph' | 'upload' | 'simulate' | 'chat' | 'risks';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  totalNodes: number;
  totalEdges: number;
  activeRisksCount: number;
  onResetGraph: () => void;
}

const TABS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Layers },
  { id: 'graph', label: '3D graph', icon: Network },
  { id: 'upload', label: 'Ingest', icon: UploadCloud },
  { id: 'simulate', label: 'Simulate', icon: Cpu },
  { id: 'chat', label: 'Evidence Q&A', icon: HelpCircle },
  { id: 'risks', label: 'Risks', icon: AlertTriangle }
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalNodes,
  totalEdges,
  activeRisksCount,
  onResetGraph
}) => {
  const [mode, setMode] = useState<'live' | 'fallback' | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(json => {
        if (json.success) setMode(json.data.mode);
      })
      .catch(() => setMode(null));
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0d1013]/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-9 h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border-hairline)] flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-base tracking-tight text-white">ComplyVerse</span>
              {mode && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border ${
                    mode === 'live'
                      ? 'text-[var(--success)] border-[var(--success)]/30 bg-[var(--success)]/10'
                      : 'text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/10'
                  }`}
                  title={mode === 'live' ? 'Answering with live Gemini calls' : 'No API key set - showing deterministic fallback responses'}
                >
                  {mode === 'live' ? 'Live AI' : 'Fallback mode'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">Compliance knowledge graph</p>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden lg:flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--surface-1)] border border-[var(--border-hairline)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"></span>
            <span className="text-[var(--text-muted)]">Graph:</span>
            <span className="text-white">{totalNodes} nodes / {totalEdges} edges</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--surface-1)] border border-[var(--border-hairline)]">
            <AlertTriangle className={`w-3.5 h-3.5 ${activeRisksCount > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`} />
            <span className="text-[var(--text-muted)]">Open risks:</span>
            <span className={activeRisksCount > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}>
              {activeRisksCount}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'text-white border-[var(--accent)]'
                    : 'text-[var(--text-muted)] border-transparent hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className={tab.id === 'overview' || tab.id === 'risks' ? 'hidden sm:inline' : ''}>{tab.label}</span>
                {tab.id === 'risks' && activeRisksCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[var(--warning)] text-[#0d1013] font-mono text-[10px] font-bold flex items-center justify-center">
                    {activeRisksCount}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={onResetGraph}
            title="Reset knowledge graph to seed state"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-1)] transition-colors ml-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </nav>

      </div>
    </header>
  );
};
