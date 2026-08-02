import React from 'react';
import { Shield, FileText, Database, Cpu, SearchCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ActiveTab } from './Navbar';
import { GraphExport } from '../types';

interface LandingPageProps {
  setActiveTab: (tab: ActiveTab) => void;
  onTriggerSampleSim: () => void;
  graphData: GraphExport | null;
}

const AGENTS = [
  {
    icon: FileText,
    name: 'Ingestion agent',
    input: 'Raw documents',
    output: 'Structured entities',
    description: 'Parses PDFs, CSVs, and text sources. Extracts parties, obligations, regulations, and deadlines with a mandatory source_ref on every entity.'
  },
  {
    icon: Database,
    name: 'Graph agent',
    input: 'Extracted entities',
    output: 'Graph writes',
    description: 'Resolves duplicate entities by name similarity (for example "Acme Corp" and "Acme Corporation"), then writes deduplicated nodes and relationships.'
  },
  {
    icon: Cpu,
    name: 'Simulation agent',
    input: 'Proposed change',
    output: 'Risk diff',
    description: 'Evaluates a proposed policy or vendor change against the existing graph and surfaces any obligations or regulations it would conflict with.'
  },
  {
    icon: SearchCheck,
    name: 'Evidence agent',
    input: 'Compliance question',
    output: 'Cited answer',
    description: 'Answers questions using only retrieved graph nodes, checking every claim against a real source_ref before including it, and dropping the rest.'
  }
];

const SCHEMA_TYPES = [
  { label: 'Party', hint: 'Vendors, clients' },
  { label: 'Document', hint: 'Contracts, SLAs' },
  { label: 'Obligation', hint: 'Contractual duties' },
  { label: 'Regulation', hint: 'GDPR, DPF, HIPAA' },
  { label: 'Deadline', hint: 'Audit, notice dates' },
  { label: 'RiskFlag', hint: 'Breaches, gaps' }
];

export const LandingPage: React.FC<LandingPageProps> = ({ setActiveTab, graphData }) => {
  const stats = graphData?.stats;

  return (
    <div className="space-y-14 pb-16">

      {/* Hero */}
      <section className="pt-10 pb-4 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-heading font-semibold tracking-tight text-white leading-tight">
          A compliance knowledge graph that shows its work
        </h1>
        <p className="mt-4 text-base text-[var(--text-muted)] max-w-2xl leading-relaxed">
          ComplyVerse turns contracts, policies, and regulations into a queryable graph, then answers
          compliance questions with every claim traced back to a specific document and clause.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('upload')}
            className="px-4 py-2 rounded-md bg-[var(--accent)] text-[#0d1013] font-medium text-sm hover:bg-[var(--accent-dim)] transition-colors flex items-center gap-2"
          >
            <span>Ingest a document</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className="px-4 py-2 rounded-md border border-[var(--border-hairline)] text-[var(--text-primary)] text-sm hover:border-[var(--border-strong)] transition-colors"
          >
            View the graph
          </button>
          <button
            onClick={() => setActiveTab('simulate')}
            className="px-4 py-2 rounded-md border border-[var(--border-hairline)] text-[var(--text-primary)] text-sm hover:border-[var(--border-strong)] transition-colors"
          >
            Simulate a policy change
          </button>
        </div>

        {/* Real stats pulled from the live graph - not placeholder copy */}
        <div className="mt-9 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
          <div className="rounded-md bg-[var(--surface-1)] px-4 py-3">
            <div className="font-heading text-xl text-white">{stats?.totalNodes ?? '-'}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">Graph nodes</div>
          </div>
          <div className="rounded-md bg-[var(--surface-1)] px-4 py-3">
            <div className="font-heading text-xl text-white">{stats?.totalEdges ?? '-'}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">Relationships</div>
          </div>
          <div className="rounded-md bg-[var(--surface-1)] px-4 py-3">
            <div className="font-heading text-xl text-white">{stats?.regulationsCount ?? '-'}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">Regulations tracked</div>
          </div>
          <div className="rounded-md bg-[var(--surface-1)] px-4 py-3">
            <div className={`font-heading text-xl ${stats && stats.activeRisksCount > 0 ? 'text-[var(--warning)]' : 'text-white'}`}>
              {stats?.activeRisksCount ?? '-'}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">Open risk flags</div>
          </div>
        </div>
      </section>

      {/* Agent pipeline - shown as a real left-to-right flow, not decorative 01/02/03 cards */}
      <section>
        <h2 className="text-lg font-heading font-medium text-white mb-1">How a document becomes an answer</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">Four agents run in sequence over the graph store.</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-[var(--border-hairline)] rounded-lg overflow-hidden">
          {AGENTS.map((agent, i) => {
            const Icon = agent.icon;
            return (
              <div key={agent.name} className="bg-[var(--surface-1)] p-5 relative">
                <Icon className="w-4.5 h-4.5 text-[var(--accent)] mb-3" />
                <h3 className="font-heading font-medium text-sm text-white mb-1.5">{agent.name}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">{agent.description}</p>
                <div className="pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between text-[11px] font-mono text-[var(--text-faint)]">
                  <span>{agent.input}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{agent.output}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Graph schema */}
      <section className="glass-panel rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] mb-1">Graph schema</div>
            <h2 className="text-lg font-heading font-medium text-white">Node types and how they relate</h2>
          </div>
          <button
            onClick={() => setActiveTab('graph')}
            className="px-3 py-1.5 rounded-md border border-[var(--border-hairline)] text-[var(--text-primary)] text-xs font-medium hover:border-[var(--border-strong)] transition-colors flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>Open 3D view</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-xs">
          {SCHEMA_TYPES.map(t => (
            <div key={t.label} className="p-3 rounded-md bg-[var(--surface-2)] text-center">
              <div className="text-white font-medium">{t.label}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">{t.hint}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-[var(--border-hairline)] text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-x-6 gap-y-2 font-mono">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" /> (Party)-[OWES]-&gt;(Obligation)</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" /> (Obligation)-[GOVERNED_BY]-&gt;(Regulation)</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" /> (Obligation)-[EVIDENCED_BY]-&gt;(Document)</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[var(--warning)]" /> (RiskFlag)-[AFFECTS]-&gt;(Obligation)</span>
        </div>
      </section>

      {/* Quick entry points */}
      <section>
        <h2 className="text-lg font-heading font-medium text-white mb-5">Try it</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            onClick={() => setActiveTab('chat')}
            className="p-5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <SearchCheck className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="font-heading font-medium text-white text-sm">Evidence Q&amp;A</h3>
            </div>
            <p className="text-xs text-[var(--text-muted)]">"What are our encryption and breach notice obligations for EU data?"</p>
          </div>

          <div
            onClick={() => setActiveTab('simulate')}
            className="p-5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <Cpu className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="font-heading font-medium text-white text-sm">Impact simulator</h3>
            </div>
            <p className="text-xs text-[var(--text-muted)]">"We're adding a US sub-processor for biometric identity verification"</p>
          </div>

          <div
            onClick={() => setActiveTab('upload')}
            className="p-5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <FileText className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="font-heading font-medium text-white text-sm">Document ingestion</h3>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Upload a PDF or pick a preloaded sample contract</p>
          </div>
        </div>
      </section>

    </div>
  );
};
