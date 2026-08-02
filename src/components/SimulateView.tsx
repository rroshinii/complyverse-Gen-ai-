import React, { useState } from 'react';
import { Cpu, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert, Sparkles, Loader2, GitCompare, RefreshCw } from 'lucide-react';
import { SimulationResult, RiskFlagItem } from '../types';

interface SimulateViewProps {
  onOpenSourceRef?: (sourceRef: string) => void;
  onNavigateToRisks?: () => void;
}

const PRESET_SCENARIOS = [
  {
    title: 'Biometric AI Sub-processor',
    prompt: 'Adding US-based sub-processor "BiometricAuth AI Solutions" for facial recognition user authentication'
  },
  {
    title: 'Shortened Breach Notice (12h)',
    prompt: 'Reducing contract breach notification SLA from 24 hours down to 12 hours for all enterprise customers'
  },
  {
    title: 'Discontinue SOC 2 Audit Reports',
    prompt: 'Removing requirement to furnish annual SOC 2 Type II audit reports to European enterprise clients'
  },
  {
    title: 'Singapore Disaster Backup Region',
    prompt: 'Routing all secondary database replication backups to non-DPF Singapore data center'
  }
];

export const SimulateView: React.FC<SimulateViewProps> = ({ onOpenSourceRef, onNavigateToRisks }) => {
  const [proposedChange, setProposedChange] = useState<string>(
    'Adding US-based sub-processor "BiometricAuth AI Solutions" for facial recognition user authentication'
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const handleRunSimulation = async (customPrompt?: string) => {
    const changeToRun = customPrompt || proposedChange;
    if (!changeToRun.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposedChange: changeToRun })
      });
      const json = await res.json();
      if (json.success) {
        setSimulationResult(json.data);
      }
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="pb-6 border-b border-white/10">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#4fd8ff]/10 border border-[#4fd8ff]/30 text-[#4fd8ff] text-xs font-mono mb-2">
          <Cpu className="w-3.5 h-3.5" /> Agent Stage 03 • Impact Simulation Engine
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white">Policy & Regulatory Impact Simulator</h1>
        <p className="text-xs text-[#8792b0] mt-1">
          Proactively simulate proposed policy, vendor, or infrastructure changes against the compliance graph before adoption.
        </p>
      </div>

      {/* Preset Scenario Selector & Input */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        
        <div className="flex items-center justify-between">
          <span className="font-heading font-semibold text-sm text-white">Select Preset Scenario or Enter Proposed Change</span>
          <span className="text-xs font-mono text-[#8792b0]">Multi-Agent Graph Evaluation</span>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap gap-2">
          {PRESET_SCENARIOS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setProposedChange(preset.prompt);
                handleRunSimulation(preset.prompt);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#4fd8ff]/40 hover:text-[#4fd8ff] text-xs font-mono transition-all text-left"
            >
              ⚡ {preset.title}
            </button>
          ))}
        </div>

        {/* Prompt Text Input */}
        <div className="space-y-2">
          <textarea
            rows={3}
            value={proposedChange}
            onChange={e => setProposedChange(e.target.value)}
            placeholder="Describe proposed change (e.g. 'We are appointing a US sub-processor for user facial biometrics')..."
            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-[#4fd8ff] resize-none"
          />

          <button
            onClick={() => handleRunSimulation()}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#4fd8ff] via-[#8b7bff] to-[#ff8fc9] text-[#05060c] font-heading font-bold text-xs shadow-[0_0_24px_rgba(79,216,255,0.3)] hover:shadow-[0_0_32px_rgba(79,216,255,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#05060c]" />
                <span>Evaluating Downstream Graph Dependencies...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#05060c]" />
                <span>Simulate Policy Impact & Generate Risk Diff</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Simulation Results Display */}
      {simulationResult && (
        <div className="space-y-6">
          
          {/* Summary Banner */}
          <div className="glass-panel-hi p-6 rounded-2xl border border-[#ffb454]/40 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#ffb454] font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Impact Assessment Summary
              </span>
              <span className="text-[#8792b0]">{new Date(simulationResult.timestamp).toLocaleTimeString()}</span>
            </div>

            <p className="text-sm font-heading text-white leading-relaxed">
              {simulationResult.summary}
            </p>
          </div>

          {/* 2-Column Split View Component (Before vs After Diff per spec) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Column 1: Baseline Compliance Graph */}
            <div className="glass-panel p-6 rounded-2xl space-y-4 border border-white/10">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="font-heading font-semibold text-sm text-white">BEFORE: Baseline State</span>
                </div>
                <span className="text-[11px] font-mono text-[#8792b0]">Current Approved Graph</span>
              </div>

              <div className="space-y-3 text-xs font-mono text-[#8792b0]">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-white font-semibold block mb-0.5">EU GDPR Article 28(3)</span>
                  <span className="text-[11px]">Requires 30-day prior notice for sub-processors</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-white font-semibold block mb-0.5">Acme DPA 2024 (Section 8.1)</span>
                  <span className="text-[11px]">24-hour breach notice obligation</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-white font-semibold block mb-0.5">US-EU Data Privacy Framework</span>
                  <span className="text-[11px]">Mandatory certified transfer safeguards</span>
                </div>
              </div>
            </div>

            {/* Column 2: Simulated Diff & Triggered RiskFlags */}
            <div className="glass-panel p-6 rounded-2xl space-y-4 border border-rose-500/30 bg-rose-950/10">
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 pulse-glow"></span>
                  <span className="font-heading font-semibold text-sm text-rose-300">AFTER: Simulated Impact Diff</span>
                </div>
                <span className="text-[11px] font-mono text-rose-400 font-bold">
                  +{simulationResult.newRiskFlags.length} New Risk Flags
                </span>
              </div>

              {/* List of Triggered Risk Flags */}
              <div className="space-y-3">
                {simulationResult.newRiskFlags.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-300 text-xs font-mono text-center">
                    No new compliance risks detected for this scenario.
                  </div>
                ) : (
                  simulationResult.newRiskFlags.map(risk => (
                    <div key={risk.id} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-bold">{risk.severity} SEVERITY</span>
                        <span className="text-rose-300 font-mono">{risk.status}</span>
                      </div>

                      <h4 className="font-heading font-bold text-xs text-white leading-snug">{risk.title}</h4>
                      <p className="text-xs text-[#8792b0] leading-relaxed">{risk.description}</p>

                      <div className="pt-2 border-t border-white/10 text-[11px] font-mono text-[#4fd8ff] flex items-center justify-between">
                        <span>Citation: {risk.source_ref}</span>
                      </div>

                      {risk.remediation && (
                        <div className="p-2.5 rounded-lg bg-black/40 text-[11px] text-amber-200 font-mono">
                          <span className="font-bold block mb-0.5 text-amber-400">Remediation Recommendation:</span>
                          {risk.remediation}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Recommended Mitigation Steps */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Actionable Mitigation Roadmap
            </h3>

            <ul className="space-y-2 text-xs font-mono text-[#8792b0]">
              {simulationResult.mitigationSteps.map((step, idx) => (
                <li key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2">
                  <span className="text-[#8b7bff] font-bold">{idx + 1}.</span>
                  <span className="text-white leading-relaxed">{step}</span>
                </li>
              ))}
            </ul>

            {onNavigateToRisks && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={onNavigateToRisks}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-heading font-semibold transition-all flex items-center gap-1.5"
                >
                  <span>View All Active Risk Flags in Risk Feed</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
