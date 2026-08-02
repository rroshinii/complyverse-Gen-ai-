import React, { useEffect, useState } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { KnowledgeGraph3D } from './components/KnowledgeGraph3D';
import { UploadReview } from './components/UploadReview';
import { SimulateView } from './components/SimulateView';
import { EvidenceChat } from './components/EvidenceChat';
import { RiskFeed } from './components/RiskFeed';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { GraphExport, GraphNode } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [graphData, setGraphData] = useState<GraphExport | null>(null);
  const [selectedSourceRef, setSelectedSourceRef] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const fetchGraph = async () => {
    try {
      const res = await fetch('/api/graph/export');
      const json = await res.json();
      if (json.success) {
        setGraphData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch graph data:', err);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const handleResetGraph = async () => {
    try {
      const res = await fetch('/api/graph/reset', { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setGraphData(json.data);
      }
    } catch (err) {
      console.error('Failed to reset graph:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#05060c] text-[#edeffb] font-sans selection:bg-[#8b7bff]/30">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalNodes={graphData?.stats.totalNodes || 0}
        totalEdges={graphData?.stats.totalEdges || 0}
        activeRisksCount={graphData?.stats.activeRisksCount || 0}
        onResetGraph={handleResetGraph}
      />

      {/* Main View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {activeTab === 'overview' && (
          <LandingPage
            setActiveTab={setActiveTab}
            onTriggerSampleSim={() => setActiveTab('simulate')}
            graphData={graphData}
          />
        )}

        {activeTab === 'graph' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h1 className="text-xl font-heading font-bold text-white">Interactive 3D Sphere Knowledge Graph</h1>
                <p className="text-xs text-[#8792b0]">
                  Click any node to view details, linked obligations, regulations, and exact source references.
                </p>
              </div>
            </div>

            <KnowledgeGraph3D
              nodes={graphData?.nodes || []}
              edges={graphData?.edges || []}
              selectedNodeId={selectedNodeId}
              onSelectNode={(node: GraphNode) => setSelectedNodeId(node.id)}
              onOpenSourceRef={(ref: string) => setSelectedSourceRef(ref)}
            />
          </div>
        )}

        {activeTab === 'upload' && (
          <UploadReview
            onCommitSuccess={() => {
              fetchGraph();
              setActiveTab('graph');
            }}
            onOpenSourceRef={(ref: string) => setSelectedSourceRef(ref)}
          />
        )}

        {activeTab === 'simulate' && (
          <SimulateView
            onOpenSourceRef={(ref: string) => setSelectedSourceRef(ref)}
            onNavigateToRisks={() => {
              fetchGraph();
              setActiveTab('risks');
            }}
          />
        )}

        {activeTab === 'chat' && (
          <EvidenceChat
            onOpenSourceRef={(ref: string) => setSelectedSourceRef(ref)}
          />
        )}

        {activeTab === 'risks' && (
          <RiskFeed
            onOpenSourceRef={(ref: string) => setSelectedSourceRef(ref)}
          />
        )}

      </main>

      {/* Source Document Viewer Slide-over Drawer */}
      <DocumentViewerModal
        sourceRef={selectedSourceRef}
        onClose={() => setSelectedSourceRef(null)}
      />

    </div>
  );
}
