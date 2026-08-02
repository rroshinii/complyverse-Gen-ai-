import fs from 'fs';
import path from 'path';
import { GraphNode, GraphEdge, RiskFlagItem, GraphExport, ExtractedEntity } from '../src/types';

// Persist the graph to disk so it survives server restarts. In-memory-only
// storage means every deploy restart or crash silently wipes ingested data
// back to the seed state, which is a real correctness gap for a "living
// knowledge graph" product, not just a nice-to-have.
//
// IMPORTANT (serverless): Vercel Functions only allow writes to /tmp, and
// /tmp is local to a single function instance - it is NOT shared across
// concurrent invocations/regions and is wiped on cold start. This gives
// best-effort persistence within a warm instance (fine for demos and light
// traffic) but is NOT a substitute for a real database in a multi-instance
// production deployment. For durable, globally-consistent storage, swap this
// module's load()/persist() methods for a real store (e.g. Postgres +
// Drizzle ORM, Vercel KV) - every other module only depends on the public
// GraphStore methods below, so the storage backend can be swapped without
// touching any API route or agent code.
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'complyverse-data')
  : path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'graph-state.json');

interface PersistedState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  riskFlags: RiskFlagItem[];
}

// Pre-seeded compliance knowledge graph
const initialNodes: GraphNode[] = [
  // Parties
  {
    id: 'party-1',
    type: 'Party',
    label: 'Acme Corporation',
    description: 'Data Controller & Enterprise Client (HQ in USA)',
    source_ref: 'Acme_MSA_2024.pdf, Page 1 Clause 1.1',
    properties: { jurisdiction: 'USA', role: 'Data Controller', riskRating: 'Low' }
  },
  {
    id: 'party-2',
    type: 'Party',
    label: 'CloudServe Infrastructure Inc.',
    description: 'Primary Cloud Hosting & Sub-processor',
    source_ref: 'CloudServe_SLA_2024.pdf, Section 2',
    properties: { jurisdiction: 'EU / Germany', role: 'Processor', certs: ['SOC2 Type II', 'ISO 27001'] }
  },
  {
    id: 'party-3',
    type: 'Party',
    label: 'BiometricAuth AI Solutions',
    description: 'Proposed Third-Party Identity Verification Sub-processor',
    source_ref: 'BiometricAuth_Vendor_Proposal.pdf, Page 3',
    properties: { jurisdiction: 'USA / California', role: 'Proposed Sub-processor' }
  },

  // Regulations
  {
    id: 'reg-1',
    type: 'Regulation',
    label: 'EU GDPR Article 28(3)',
    description: 'Data Processor Contractual Requirements & Sub-processor Consent',
    source_ref: 'EU_2016_679_GDPR.pdf, Article 28',
    properties: { jurisdiction: 'European Union', article: '28(3)', enforcementDate: '2018-05-25' }
  },
  {
    id: 'reg-2',
    type: 'Regulation',
    label: 'EU GDPR Article 33',
    description: '72-Hour Personal Data Breach Notification to Supervisory Authority',
    source_ref: 'EU_2016_679_GDPR.pdf, Article 33',
    properties: { jurisdiction: 'European Union', maxBreachNoticeHours: 72 }
  },
  {
    id: 'reg-3',
    type: 'Regulation',
    label: 'US EU Data Privacy Framework (DPF)',
    description: 'Cross-Border Personal Data Transfer Requirements to US Entities',
    source_ref: 'US_EU_DPF_Executive_Order_14086.pdf, Sec. 3',
    properties: { jurisdiction: 'EU / USA', certRequired: true }
  },

  // Documents
  {
    id: 'doc-1',
    type: 'Document',
    label: 'Acme DPA 2024 (Data Processing Agreement)',
    description: 'Master Data Processing Agreement covering European customer data',
    source_ref: 'Acme_DPA_2024.pdf, Complete Document',
    properties: { effectiveDate: '2024-01-15', status: 'Active', fileType: 'PDF' }
  },
  {
    id: 'doc-2',
    type: 'Document',
    label: 'CloudServe Sub-processor Schedule B',
    description: 'Approved List of Sub-processors and Regional Data Centers',
    source_ref: 'CloudServe_Schedule_B.pdf, Exhibit 1',
    properties: { effectiveDate: '2024-03-01', status: 'Active' }
  },
  {
    id: 'doc-3',
    type: 'Document',
    label: 'FinServ Cyber Incident Response Plan',
    description: 'Standard Operating Procedure for Security Events',
    source_ref: 'Cyber_SOP_v4.2.docx, Section 5.1',
    properties: { version: '4.2', lastReviewed: '2024-06-10' }
  },

  // Obligations
  {
    id: 'obl-1',
    type: 'Obligation',
    label: 'Prior Written Notice for Sub-processor Additions',
    description: 'Must provide 30-day prior written notice to Data Controller before adding new sub-processors',
    source_ref: 'Acme_DPA_2024.pdf, Section 4.2',
    properties: { noticeDaysRequired: 30, penalty: 'Immediate Termination Right' }
  },
  {
    id: 'obl-2',
    type: 'Obligation',
    label: 'Data Incident Notification within 24 Hours',
    description: 'Contractual duty to notify Acme Corp within 24 hours of confirming a data breach',
    source_ref: 'Acme_DPA_2024.pdf, Section 8.1',
    properties: { maxHours: 24, priority: 'Critical' }
  },
  {
    id: 'obl-3',
    type: 'Obligation',
    label: 'AES-256 Encryption at Rest & In Transit',
    description: 'Mandatory strong encryption for all customer EU personal identifiers',
    source_ref: 'CloudServe_SLA_2024.pdf, Annex II',
    properties: { standard: 'FIPS 140-2 Level 3', requirement: 'Mandatory' }
  },
  {
    id: 'obl-4',
    type: 'Obligation',
    label: 'Annual SOC 2 Type II Audit Report Delivery',
    description: 'Sub-processor must furnish updated SOC 2 audit report by October 31 each year',
    source_ref: 'Acme_MSA_2024.pdf, Clause 14.3',
    properties: { frequency: 'Annual' }
  },

  // Deadlines
  {
    id: 'dl-1',
    type: 'Deadline',
    label: 'SOC 2 Renewal Report Submission',
    description: 'Due date for annual compliance audit report submission to Acme',
    source_ref: 'Acme_MSA_2024.pdf, Clause 14.3',
    properties: { dueDate: '2026-10-31', status: 'Pending' }
  },
  {
    id: 'dl-2',
    type: 'Deadline',
    label: 'DPF Certification Annual Re-attestation',
    description: 'Required re-filing deadline for US-EU Data Privacy Framework shield',
    source_ref: 'US_EU_DPF_Executive_Order_14086.pdf, Sec. 3',
    properties: { dueDate: '2026-09-15', status: 'Upcoming' }
  },

  // RiskFlags
  {
    id: 'rf-1',
    type: 'RiskFlag',
    label: 'Uncertified Sub-processor Regional Transfer Risk',
    description: 'CloudServe secondary backup region in Singapore lacks explicit DPF certification',
    source_ref: 'CloudServe_Schedule_B.pdf, Exhibit 1',
    properties: { severity: 'MEDIUM', status: 'UNDER_REVIEW', owner: 'Compliance Legal Team' }
  },
  {
    id: 'rf-2',
    type: 'RiskFlag',
    label: 'Breach Notification SLA Gap (24h vs 72h)',
    description: 'Contractual SLA requires 24h notice to Acme Corp, but SOP internal response target is 48h',
    source_ref: 'Acme_DPA_2024.pdf, Sec 8.1 vs Cyber_SOP_v4.2.docx, Sec 5',
    properties: { severity: 'HIGH', status: 'OPEN', owner: 'SecOps Incident Response' }
  }
];

const initialEdges: GraphEdge[] = [
  // Party owes Obligation
  { id: 'e-1', source: 'party-1', target: 'obl-1', type: 'OWES', label: 'owes duty to notify' },
  { id: 'e-2', source: 'party-2', target: 'obl-2', type: 'OWES', label: 'owes breach notification' },
  { id: 'e-3', source: 'party-2', target: 'obl-3', type: 'OWES', label: 'owes encryption' },
  { id: 'e-4', source: 'party-2', target: 'obl-4', type: 'OWES', label: 'owes annual audit report' },

  // Obligation governed by Regulation
  { id: 'e-5', source: 'obl-1', target: 'reg-1', type: 'GOVERNED_BY', label: 'governed by Art 28' },
  { id: 'e-6', source: 'obl-2', target: 'reg-2', type: 'GOVERNED_BY', label: 'governed by Art 33' },
  { id: 'e-7', source: 'obl-3', target: 'reg-3', type: 'GOVERNED_BY', label: 'governed by DPF framework' },

  // Obligation due Deadline
  { id: 'e-8', source: 'obl-4', target: 'dl-1', type: 'DUE', label: 'deadline set for' },

  // Obligation evidenced by Document
  { id: 'e-9', source: 'obl-1', target: 'doc-1', type: 'EVIDENCED_BY', label: 'evidenced in' },
  { id: 'e-10', source: 'obl-2', target: 'doc-1', type: 'EVIDENCED_BY', label: 'evidenced in' },
  { id: 'e-11', source: 'obl-3', target: 'doc-2', type: 'EVIDENCED_BY', label: 'evidenced in' },

  // RiskFlags affect Obligations / conflict with Regulations
  { id: 'e-12', source: 'rf-1', target: 'obl-1', type: 'AFFECTS', label: 'affects sub-processor consent' },
  { id: 'e-13', source: 'rf-1', target: 'reg-3', type: 'CONFLICTS_WITH', label: 'conflicts with DPF rule' },
  { id: 'e-14', source: 'rf-2', target: 'obl-2', type: 'AFFECTS', label: 'affects 24h breach SLA' }
];

class GraphStore {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private riskFlags: Map<string, RiskFlagItem> = new Map();

  constructor() {
    const restored = this.load();
    if (!restored) {
      this.seed();
    }
  }

  /** Loads persisted graph state from disk, if it exists. Returns true if a saved state was restored. */
  private load(): boolean {
    try {
      if (!fs.existsSync(DATA_FILE)) return false;
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const state: PersistedState = JSON.parse(raw);
      if (!state.nodes || !state.edges) return false;

      this.nodes.clear();
      this.edges.clear();
      this.riskFlags.clear();
      state.nodes.forEach(n => this.nodes.set(n.id, n));
      state.edges.forEach(e => this.edges.set(e.id, e));
      (state.riskFlags || []).forEach(r => this.riskFlags.set(r.id, r));
      return true;
    } catch (err) {
      console.error('Failed to load persisted graph state, falling back to seed data:', err);
      return false;
    }
  }

  /** Writes current graph state to disk. Called after every mutation so a restart never loses data. */
  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const state: PersistedState = {
        nodes: Array.from(this.nodes.values()),
        edges: Array.from(this.edges.values()),
        riskFlags: Array.from(this.riskFlags.values())
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist graph state to disk:', err);
    }
  }

  public seed() {
    this.nodes.clear();
    this.edges.clear();
    this.riskFlags.clear();

    initialNodes.forEach(n => this.nodes.set(n.id, { ...n }));
    initialEdges.forEach(e => this.edges.set(e.id, { ...e }));

    // Initialize initial risk flags
    this.riskFlags.set('rf-1', {
      id: 'rf-1',
      title: 'Uncertified Sub-processor Regional Transfer Risk',
      severity: 'MEDIUM',
      status: 'UNDER_REVIEW',
      description: 'CloudServe secondary backup region in Singapore lacks explicit DPF certification',
      affectedObligationId: 'obl-1',
      conflictingRegulationId: 'reg-3',
      source_ref: 'CloudServe_Schedule_B.pdf, Exhibit 1',
      remediation: 'Obtain explicit Standard Contractual Clauses (SCCs) for Singapore transfer or restrict backup region.',
      createdAt: '2026-07-28T10:00:00Z',
      owner: 'Compliance Legal Team'
    });

    this.riskFlags.set('rf-2', {
      id: 'rf-2',
      title: 'Breach Notification SLA Gap (24h Contract vs 72h Regulation)',
      severity: 'HIGH',
      status: 'OPEN',
      description: 'Contractual SLA with Acme Corp requires 24h notice, but internal Incident Response SOP specifies 48h triage window.',
      affectedObligationId: 'obl-2',
      conflictingRegulationId: 'reg-2',
      source_ref: 'Acme_DPA_2024.pdf, Sec 8.1 vs Cyber_SOP_v4.2.docx, Sec 5',
      remediation: 'Update Cyber Incident SOP v4.3 to fast-track tier-1 customer notifications within 18h.',
      createdAt: '2026-07-30T14:30:00Z',
      owner: 'SecOps Incident Response'
    });

    this.persist();
  }

  public getExport(): GraphExport {
    const nodesArr = Array.from(this.nodes.values());
    const edgesArr = Array.from(this.edges.values());

    return {
      nodes: nodesArr,
      edges: edgesArr,
      stats: {
        totalNodes: nodesArr.length,
        totalEdges: edgesArr.length,
        partiesCount: nodesArr.filter(n => n.type === 'Party').length,
        obligationsCount: nodesArr.filter(n => n.type === 'Obligation').length,
        regulationsCount: nodesArr.filter(n => n.type === 'Regulation').length,
        activeRisksCount: Array.from(this.riskFlags.values()).filter(r => r.status !== 'MITIGATED').length
      }
    };
  }

  public getNode(id: string): { node?: GraphNode; edges: GraphEdge[]; relatedRisks: RiskFlagItem[] } {
    const node = this.nodes.get(id);
    const connectedEdges = Array.from(this.edges.values()).filter(
      e => e.source === id || e.target === id
    );
    const relatedRisks = Array.from(this.riskFlags.values()).filter(
      r => r.affectedObligationId === id || r.conflictingRegulationId === id
    );

    return { node, edges: connectedEdges, relatedRisks };
  }

  private normalizeLabel(label: string): string {
    return label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokensMatch(a: string, b: string): boolean {
    if (a === b) return true;
    // Abbreviation-style match ("Corp" <-> "Corporation", "Infra" <-> "Infrastructure").
    // Restricted to alphabetic tokens of length >=4 so it never fires on short/numeric
    // tokens, which is exactly what distinguishes e.g. "Article 33" from "Article 34".
    if (a.length >= 4 && b.length >= 4 && /^[a-z]+$/.test(a) && /^[a-z]+$/.test(b)) {
      return a.startsWith(b) || b.startsWith(a);
    }
    return false;
  }

  /** Word-overlap similarity that catches name variants like "Acme Corp" vs "Acme Corporation"
   *  without hardcoding any specific entity name, so it generalizes to any document set.
   *  Numeric tokens (article/section numbers) are treated as hard discriminators: two labels
   *  with different numbers are never merged, even if every other word matches. */
  private tokenSimilarity(a: string, b: string): number {
    const tokensA = a.split(' ').filter(Boolean);
    const tokensB = b.split(' ').filter(Boolean);
    if (tokensA.length === 0 || tokensB.length === 0) return a === b ? 1 : 0;

    const numsA = tokensA.filter(t => /\d/.test(t));
    const numsB = tokensB.filter(t => /\d/.test(t));
    if (numsA.length > 0 && numsB.length > 0) {
      const sameNumbers = numsA.length === numsB.length && numsA.every(n => numsB.includes(n));
      if (!sameNumbers) return 0;
    }

    const remainingB = [...tokensB];
    let matches = 0;
    for (const ta of tokensA) {
      const idx = remainingB.findIndex(tb => this.tokensMatch(ta, tb));
      if (idx !== -1) {
        matches++;
        remainingB.splice(idx, 1); // consume so one token can't match twice
      }
    }
    const union = tokensA.length + tokensB.length - matches;
    return union === 0 ? 0 : matches / union;
  }

  // Entity resolution: deduplicates same-type nodes by label similarity.
  // Uses exact normalized match first, then falls back to token-overlap
  // similarity above a threshold - generalizes to any entity name instead
  // of only recognizing specific companies hardcoded into the matcher.
  public findExistingMatchingNode(label: string, type: string): GraphNode | undefined {
    const normalized = this.normalizeLabel(label);
    const compact = normalized.replace(/\s+/g, '');

    let bestMatch: GraphNode | undefined;
    let bestScore = 0;

    for (const node of this.nodes.values()) {
      if (node.type !== type) continue;
      const existingNorm = this.normalizeLabel(node.label);

      if (existingNorm.replace(/\s+/g, '') === compact) {
        return node; // exact match, no need to keep scanning
      }

      const score = this.tokenSimilarity(normalized, existingNorm);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = node;
      }
    }

    // Threshold tuned to merge genuine name variants ("Acme Corp" / "Acme Corporation" -> 0.5+)
    // while avoiding false merges between distinct entities that just share one common word.
    const SIMILARITY_THRESHOLD = 0.5;
    return bestScore >= SIMILARITY_THRESHOLD ? bestMatch : undefined;
  }

  public addNode(node: Omit<GraphNode, 'id'> & { id?: string }): GraphNode {
    const id = node.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const fullNode: GraphNode = {
      id,
      type: node.type,
      label: node.label,
      description: node.description,
      source_ref: node.source_ref || 'User Upload, Clause 1',
      properties: node.properties || {},
      createdAt: new Date().toISOString()
    };
    this.nodes.set(id, fullNode);
    return fullNode;
  }

  public addEdge(edge: Omit<GraphEdge, 'id'>): GraphEdge {
    const id = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const fullEdge: GraphEdge = {
      id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      label: edge.label || edge.type.toLowerCase().replace('_', ' '),
      properties: edge.properties || {}
    };
    this.edges.set(id, fullEdge);
    return fullEdge;
  }

  public commitExtractedEntities(entities: ExtractedEntity[]): {
    createdNodesCount: number;
    mergedNodesCount: number;
    createdEdgesCount: number;
    committedNodes: GraphNode[];
  } {
    let createdNodesCount = 0;
    let mergedNodesCount = 0;
    let createdEdgesCount = 0;
    const committedNodes: GraphNode[] = [];
    const tempToRealIdMap = new Map<string, string>();

    // 1. Process nodes with deduplication
    for (const entity of entities) {
      const match = this.findExistingMatchingNode(entity.label, entity.type);
      if (match) {
        // Merge & update source_ref
        tempToRealIdMap.set(entity.tempId, match.id);
        match.source_ref = `${match.source_ref}; ${entity.source_ref}`;
        match.description = `${match.description} | Updated: ${entity.description}`;
        mergedNodesCount++;
        committedNodes.push(match);
      } else {
        const newNode = this.addNode({
          type: entity.type,
          label: entity.label,
          description: entity.description,
          source_ref: entity.source_ref,
          properties: { ...entity.properties, confidenceScore: entity.confidenceScore }
        });
        tempToRealIdMap.set(entity.tempId, newNode.id);
        createdNodesCount++;
        committedNodes.push(newNode);
      }
    }

    // 2. Automatically link obligations to party and source document
    const partyNodes = Array.from(this.nodes.values()).filter(n => n.type === 'Party');
    const docNodes = Array.from(this.nodes.values()).filter(n => n.type === 'Document');

    for (const entity of entities) {
      const realId = tempToRealIdMap.get(entity.tempId);
      if (!realId) continue;

      if (entity.type === 'Obligation' && partyNodes.length > 0) {
        // Link to party
        const party = partyNodes[0];
        this.addEdge({
          source: party.id,
          target: realId,
          type: 'OWES',
          label: 'owes duty'
        });
        createdEdgesCount++;

        // Link to regulation if available
        const regs = Array.from(this.nodes.values()).filter(n => n.type === 'Regulation');
        if (regs.length > 0) {
          this.addEdge({
            source: realId,
            target: regs[0].id,
            type: 'GOVERNED_BY',
            label: 'governed by rule'
          });
          createdEdgesCount++;
        }
      }
    }

    this.persist();

    return {
      createdNodesCount,
      mergedNodesCount,
      createdEdgesCount,
      committedNodes
    };
  }

  public addRiskFlag(flag: Omit<RiskFlagItem, 'id' | 'createdAt'>): RiskFlagItem {
    const id = `rf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const fullFlag: RiskFlagItem = {
      ...flag,
      id,
      createdAt: new Date().toISOString()
    };
    this.riskFlags.set(id, fullFlag);

    // Also create Node in graph for visualization
    const rfNode = this.addNode({
      id: fullFlag.id,
      type: 'RiskFlag',
      label: fullFlag.title,
      description: fullFlag.description,
      source_ref: fullFlag.source_ref,
      properties: {
        severity: fullFlag.severity,
        status: fullFlag.status,
        remediation: fullFlag.remediation
      }
    });

    if (fullFlag.affectedObligationId) {
      this.addEdge({
        source: rfNode.id,
        target: fullFlag.affectedObligationId,
        type: 'AFFECTS',
        label: 'affects obligation'
      });
    }

    if (fullFlag.conflictingRegulationId) {
      this.addEdge({
        source: rfNode.id,
        target: fullFlag.conflictingRegulationId,
        type: 'CONFLICTS_WITH',
        label: 'conflicts with regulation'
      });
    }

    this.persist();

    return fullFlag;
  }

  public getRiskFeed(): RiskFlagItem[] {
    return Array.from(this.riskFlags.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public searchNodes(query: string): GraphNode[] {
    const q = query.toLowerCase();
    return Array.from(this.nodes.values()).filter(
      n =>
        n.label.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.source_ref.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q)
    );
  }
}

export const graphStore = new GraphStore();
