export type NodeType = 'Party' | 'Document' | 'Obligation' | 'Regulation' | 'Deadline' | 'RiskFlag';

export type RelationshipType = 'OWES' | 'GOVERNED_BY' | 'DUE' | 'EVIDENCED_BY' | 'AFFECTS' | 'CONFLICTS_WITH';

export type RiskSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type RiskStatus = 'OPEN' | 'UNDER_REVIEW' | 'MITIGATED';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  source_ref: string; // Document name + section/clause (e.g. "GDPR_Art28.pdf, Section 4.2")
  properties: Record<string, any>;
  createdAt?: string;
  // Position for 3D layout calculation
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphEdge {
  id: string;
  source: string; // source node id
  target: string; // target node id
  type: RelationshipType;
  label?: string;
  properties?: Record<string, any>;
}

export interface ExtractedEntity {
  tempId: string;
  type: NodeType;
  label: string;
  description: string;
  source_ref: string;
  confidenceScore: number; // 0.0 - 1.0
  properties: Record<string, any>;
}

export interface IngestionResult {
  documentId: string;
  documentTitle: string;
  sourceFile: string;
  extractedEntities: ExtractedEntity[];
  suggestedEdges: {
    sourceTempId: string;
    targetNodeIdOrTempId: string;
    type: RelationshipType;
  }[];
}

export interface RiskFlagItem {
  id: string;
  title: string;
  severity: RiskSeverity;
  status: RiskStatus;
  description: string;
  affectedObligationId: string;
  conflictingRegulationId?: string;
  source_ref: string;
  remediation?: string;
  createdAt: string;
  owner?: string;
}

export interface SimulationResult {
  proposedChange: string;
  timestamp: string;
  summary: string;
  newRiskFlags: RiskFlagItem[];
  affectedNodeIds: string[];
  affectedEdges: GraphEdge[];
  mitigationSteps: string[];
}

export interface Citation {
  id: string;
  documentName: string;
  sectionRef: string;
  excerpt: string;
  nodeId: string;
}

export interface ClaimWithConfidence {
  claim: string;
  confidenceScore: number;
  citations: Citation[];
}

export interface QAAnswer {
  id: string;
  question: string;
  answerText: string;
  claims: ClaimWithConfidence[];
  overallConfidence: number;
  relevantNodeIds: string[];
  timestamp: string;
}

export interface GraphExport {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    partiesCount: number;
    obligationsCount: number;
    regulationsCount: number;
    activeRisksCount: number;
  };
}
