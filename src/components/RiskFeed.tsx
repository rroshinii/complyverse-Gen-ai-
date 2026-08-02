import React, { useEffect, useState } from 'react';
import { RiskFlagItem, RiskSeverity, RiskStatus } from '../types';
import { AlertTriangle, Filter, Search, CheckCircle2, ShieldAlert, ArrowRight, ExternalLink } from 'lucide-react';

interface RiskFeedProps {
  onOpenSourceRef: (sourceRef: string) => void;
}

export const RiskFeed: React.FC<RiskFeedProps> = ({ onOpenSourceRef }) => {
  const [risks, setRisks] = useState<RiskFlagItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchRiskFeed = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/evidence/feed');
      const json = await res.json();
      if (json.success) {
        setRisks(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch risk feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskFeed();
  }, []);

  // Filter risks
  const filteredRisks = risks.filter(r => {
    const matchesSev = filterSeverity === 'ALL' || r.severity === filterSeverity;
    const matchesStat = filterStatus === 'ALL' || r.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.source_ref.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSev && matchesStat && matchesSearch;
  });

  const handleUpdateStatus = (id: string, newStatus: RiskStatus) => {
    setRisks(prev =>
      prev.map(r => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="pb-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#ffb454]/10 border border-[#ffb454]/30 text-[#ffb454] text-xs font-mono mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Risk Governance Feed
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white">Compliance Risk & Conflict Feed</h1>
          <p className="text-xs text-[#8792b0] mt-1">
            Real-time feed of detected compliance breaches, SLA gaps, and unmitigated sub-processor risks.
          </p>
        </div>

        <button
          onClick={fetchRiskFeed}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-xs font-mono text-white transition-all self-start md:self-auto"
        >
          Refresh Feed
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8792b0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search risk flags by title, description, or source..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-[#5b6482] focus:outline-none focus:border-[#ffb454]"
          />
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-1 text-xs font-mono">
          <span className="text-[#8792b0] mr-1">Severity:</span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                filterSeverity === sev
                  ? 'bg-[#ffb454]/20 text-[#ffb454] border-[#ffb454]'
                  : 'bg-white/5 text-[#8792b0] border-transparent'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 text-xs font-mono">
          <span className="text-[#8792b0] mr-1">Status:</span>
          {['ALL', 'OPEN', 'UNDER_REVIEW', 'MITIGATED'].map(stat => (
            <button
              key={stat}
              onClick={() => setFilterStatus(stat)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                filterStatus === stat
                  ? 'bg-[#8b7bff]/20 text-white border-[#8b7bff]'
                  : 'bg-white/5 text-[#8792b0] border-transparent'
              }`}
            >
              {stat.replace('_', ' ')}
            </button>
          ))}
        </div>

      </div>

      {/* Risk List */}
      <div className="space-y-4">
        {filteredRisks.length === 0 ? (
          <div className="glass-panel p-12 text-center text-xs font-mono text-[#8792b0] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p>No risk flags match the current filters.</p>
          </div>
        ) : (
          filteredRisks.map(risk => (
            <div
              key={risk.id}
              className={`glass-panel p-6 rounded-2xl border transition-all space-y-4 ${
                risk.severity === 'HIGH'
                  ? 'border-rose-500/30 bg-rose-950/10'
                  : risk.severity === 'MEDIUM'
                  ? 'border-amber-500/30 bg-amber-950/10'
                  : 'border-white/10'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span
                    className={`px-2.5 py-0.5 rounded font-bold uppercase ${
                      risk.severity === 'HIGH'
                        ? 'bg-rose-500 text-white'
                        : risk.severity === 'MEDIUM'
                        ? 'bg-amber-500 text-black'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {risk.severity} Severity
                  </span>

                  <span className="text-[#8792b0]">Owner: {risk.owner || 'Compliance Lead'}</span>
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  <button
                    onClick={() => handleUpdateStatus(risk.id, 'OPEN')}
                    className={`px-2 py-0.5 rounded border ${
                      risk.status === 'OPEN' ? 'bg-rose-500/20 text-rose-300 border-rose-500' : 'text-[#8792b0] border-transparent'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(risk.id, 'UNDER_REVIEW')}
                    className={`px-2 py-0.5 rounded border ${
                      risk.status === 'UNDER_REVIEW' ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'text-[#8792b0] border-transparent'
                    }`}
                  >
                    Under Review
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(risk.id, 'MITIGATED')}
                    className={`px-2 py-0.5 rounded border ${
                      risk.status === 'MITIGATED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'text-[#8792b0] border-transparent'
                    }`}
                  >
                    Mitigated
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-heading font-bold text-base text-white">{risk.title}</h3>
                <p className="text-xs text-[#8792b0] mt-1 leading-relaxed">{risk.description}</p>
              </div>

              {/* Remediation instructions */}
              {risk.remediation && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono space-y-1">
                  <div className="text-[#ffb454] font-semibold">Suggested Remediation:</div>
                  <div className="text-[#edeffb]">{risk.remediation}</div>
                </div>
              )}

              {/* Source citation link */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={() => onOpenSourceRef(risk.source_ref)}
                  className="text-[#4fd8ff] hover:underline flex items-center gap-1"
                >
                  Source Citation: {risk.source_ref} <ExternalLink className="w-3 h-3" />
                </button>
                <span className="text-[#5b6482]">Logged: {new Date(risk.createdAt).toLocaleDateString()}</span>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};
