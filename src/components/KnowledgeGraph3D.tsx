import React, { useEffect, useRef, useState } from 'react';
import { GraphNode, GraphEdge, NodeType, RiskFlagItem } from '../types';
import { Search, Filter, ZoomIn, ZoomOut, RotateCcw, Shield, ExternalLink, AlertTriangle, Layers, X } from 'lucide-react';

interface KnowledgeGraph3DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode?: (node: GraphNode) => void;
  selectedNodeId?: string | null;
  onOpenSourceRef?: (sourceRef: string) => void;
}

const COLOR_MAP: Record<NodeType, string> = {
  Party: '#8b7bff',
  Document: '#4fd8ff',
  Obligation: '#10b981',
  Regulation: '#6366f1',
  Deadline: '#ffb454',
  RiskFlag: '#f43f5e'
};

export const KnowledgeGraph3D: React.FC<KnowledgeGraph3DProps> = ({
  nodes,
  edges,
  onSelectNode,
  selectedNodeId,
  onOpenSourceRef
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodeDetail, setNodeDetail] = useState<{ node?: GraphNode; edges: GraphEdge[]; relatedRisks: RiskFlagItem[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isRotating, setIsRotating] = useState<boolean>(true);

  // Rotation angles for 3D sphere
  const rotX = useRef<number>(0.2);
  const rotY = useRef<number>(0.3);
  const isDragging = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Store projected 2D coordinates for click picking
  const projectedNodesRef = useRef<
    { node: GraphNode; x2d: number; y2d: number; z3d: number; radius: number }[]
  >([]);

  // Fetch node detail when selectedNodeId changes
  useEffect(() => {
    if (selectedNodeId) {
      const match = nodes.find(n => n.id === selectedNodeId);
      if (match) {
        setSelectedNode(match);
        fetchNodeDetail(match.id);
      }
    }
  }, [selectedNodeId, nodes]);

  const fetchNodeDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/graph/node/${id}`);
      const json = await res.json();
      if (json.success) {
        setNodeDetail(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch node detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Main 3D Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Filter nodes
      const filteredNodes = nodes.filter(n => {
        const matchesType = filterType === 'ALL' || n.type === filterType;
        const matchesSearch =
          !searchQuery ||
          n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
      });

      const filteredIds = new Set(filteredNodes.map(n => n.id));
      const N = filteredNodes.length;

      if (N === 0) {
        ctx.fillStyle = '#8792b0';
        ctx.font = '14px Sora, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No graph nodes match the filter.', cx, cy);
        return;
      }

      // Auto rotation when not dragging
      if (isRotating && !isDragging.current) {
        rotY.current += 0.003;
        rotX.current += 0.001;
      }

      const rx = rotX.current;
      const ry = rotY.current;

      const sphereRadius = Math.min(width, height) * 0.32 * zoomScale;
      const projDist = 800;

      // Project nodes in 3D using Fibonacci sphere distribution
      const projected: { node: GraphNode; x2d: number; y2d: number; z3d: number; radius: number }[] = [];

      filteredNodes.forEach((node, i) => {
        // Fibonacci sphere distribution coordinates
        const y = 1 - (i / Math.max(1, N - 1)) * 2;
        const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = Math.PI * (3 - Math.sqrt(5)) * i;

        const origX = Math.cos(theta) * radiusAtY;
        const origY = y;
        const origZ = Math.sin(theta) * radiusAtY;

        // Apply 3D Rotation matrices
        // Y rotation
        const x1 = origX * Math.cos(ry) + origZ * Math.sin(ry);
        const y1 = origY;
        const z1 = -origX * Math.sin(ry) + origZ * Math.cos(ry);

        // X rotation
        const x2 = x1;
        const y2 = y1 * Math.cos(rx) - z1 * Math.sin(rx);
        const z2 = y1 * Math.sin(rx) + z1 * Math.cos(rx);

        // Perspective projection
        const scale = projDist / (projDist + z2 * sphereRadius);
        const x2d = cx + x2 * sphereRadius * scale;
        const y2d = cy + y2 * sphereRadius * scale;

        const isSelected = selectedNode?.id === node.id;
        const baseRadius = node.type === 'Party' || node.type === 'Regulation' ? 12 : 9;
        const finalRadius = (isSelected ? baseRadius * 1.5 : baseRadius) * scale;

        projected.push({ node, x2d, y2d, z3d: z2, radius: finalRadius });
      });

      // Sort by depth z3d (furthest first, closest last)
      projected.sort((a, b) => a.z3d - b.z3d);
      projectedNodesRef.current = projected;

      const nodePosMap = new Map<string, { x2d: number; y2d: number; z3d: number }>();
      projected.forEach(p => nodePosMap.set(p.node.id, { x2d: p.x2d, y2d: p.y2d, z3d: p.z3d }));

      // 1. Draw Edges
      edges.forEach(edge => {
        if (filteredIds.has(edge.source) && filteredIds.has(edge.target)) {
          const p1 = nodePosMap.get(edge.source);
          const p2 = nodePosMap.get(edge.target);

          if (p1 && p2) {
            const isHighlighted =
              selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);

            const isConflict = edge.type === 'CONFLICTS_WITH' || edge.type === 'AFFECTS';

            ctx.beginPath();
            ctx.moveTo(p1.x2d, p1.y2d);
            ctx.lineTo(p2.x2d, p2.y2d);

            if (isHighlighted) {
              ctx.strokeStyle = '#4fd8ff';
              ctx.lineWidth = 2.5;
              ctx.shadowColor = '#4fd8ff';
              ctx.shadowBlur = 10;
            } else if (isConflict) {
              ctx.strokeStyle = 'rgba(255, 180, 84, 0.4)';
              ctx.lineWidth = 1.5;
              ctx.shadowColor = '#ffb454';
              ctx.shadowBlur = 6;
            } else {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
              ctx.lineWidth = 1;
              ctx.shadowBlur = 0;
            }

            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      });

      // 2. Draw Nodes
      projected.forEach(p => {
        const { node, x2d, y2d, z3d, radius } = p;
        const color = COLOR_MAP[node.type] || '#8b7bff';
        const isSelected = selectedNode?.id === node.id;

        // Depth opacity scaling
        const depthAlpha = Math.max(0.3, Math.min(1.0, (z3d + 1.2) / 2.2));

        ctx.save();
        ctx.globalAlpha = depthAlpha;

        // Glow ring
        ctx.beginPath();
        ctx.arc(x2d, y2d, radius + (isSelected ? 6 : 2), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isSelected ? 20 : 10;
        ctx.fill();

        // Inner circle
        ctx.beginPath();
        ctx.arc(x2d, y2d, radius, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#ffffff' : color;
        ctx.fill();

        // Selected border highlight
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Node Label text
        ctx.fillStyle = isSelected ? '#ffffff' : '#edeffb';
        ctx.font = `${isSelected ? 'bold 12px' : '11px'} Sora, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
          node.label.length > 20 ? node.label.substring(0, 18) + '...' : node.label,
          x2d,
          y2d + radius + 14
        );

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [nodes, edges, selectedNode, filterType, searchQuery, zoomScale, isRotating]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = Math.max(500, containerRef.current.clientHeight);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse Interaction handlers for canvas rotation & click picking
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    rotY.current += dx * 0.005;
    rotX.current += dy * 0.005;

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check hit against projected nodes (closest z first)
    const sorted = [...projectedNodesRef.current].reverse(); // top-most z first
    for (const p of sorted) {
      const dist = Math.hypot(p.x2d - clickX, p.y2d - clickY);
      if (dist <= p.radius + 6) {
        setSelectedNode(p.node);
        fetchNodeDetail(p.node.id);
        if (onSelectNode) onSelectNode(p.node);
        return;
      }
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-100px)] min-h-[600px] flex overflow-hidden rounded-3xl glass-panel border border-white/10" ref={containerRef}>
      
      {/* Canvas Area */}
      <div className="relative flex-1 h-full bg-[#05060c]">
        
        {/* Top Control Overlay Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl glass-panel bg-[#0a0e1c]/80 backdrop-blur-md">
          
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8792b0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search graph nodes (e.g. Acme, GDPR, Encryption)..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-[#5b6482] focus:outline-none focus:border-[#8b7bff]"
            />
          </div>

          {/* Node Type Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-mono">
            {['ALL', 'Party', 'Document', 'Obligation', 'Regulation', 'Deadline', 'RiskFlag'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-lg border transition-all ${
                  filterType === type
                    ? 'bg-[#8b7bff]/20 text-white border-[#8b7bff]'
                    : 'bg-white/5 text-[#8792b0] border-transparent hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Zoom and rotation controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoomScale(z => Math.min(2.0, z + 0.15))}
              className="p-1.5 rounded-lg bg-white/5 text-[#8792b0] hover:text-white border border-white/10"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomScale(z => Math.max(0.5, z - 0.15))}
              className="p-1.5 rounded-lg bg-white/5 text-[#8792b0] hover:text-white border border-white/10"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsRotating(r => !r)}
              className={`p-1.5 rounded-lg border transition-all ${
                isRotating ? 'bg-[#4fd8ff]/20 text-[#4fd8ff] border-[#4fd8ff]/40' : 'bg-white/5 text-[#8792b0] border-white/10'
              }`}
              title="Toggle Auto Rotation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* The 3D Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Legend Overlay at bottom left */}
        <div className="absolute bottom-4 left-4 z-20 p-3 rounded-xl glass-panel bg-[#0a0e1c]/90 text-[11px] font-mono space-y-1.5">
          <div className="text-[10px] text-[#8792b0] font-semibold uppercase tracking-wider mb-1">Graph Legend</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8b7bff]"></span>
            <span className="text-white">Party</span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#4fd8ff] ml-2"></span>
            <span className="text-white">Document</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-white">Obligation</span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 ml-2"></span>
            <span className="text-white">Regulation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-white">Deadline</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 ml-2"></span>
            <span className="text-white">RiskFlag</span>
          </div>
        </div>

      </div>

      {/* Slide-over Right Detail Glass Panel */}
      {selectedNode && (
        <div className="w-80 sm:w-96 border-l border-white/10 bg-[#0a0e1c]/95 backdrop-blur-xl h-full p-6 overflow-y-auto space-y-6 z-30 transition-all">
          
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLOR_MAP[selectedNode.type] || '#8b7bff' }}
              ></span>
              <span className="text-xs font-mono uppercase tracking-wider text-[#4fd8ff]">
                {selectedNode.type} Node
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded-lg text-[#8792b0] hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="font-heading font-bold text-lg text-white leading-snug">{selectedNode.label}</h3>
            <p className="text-xs text-[#8792b0] mt-2 leading-relaxed">{selectedNode.description}</p>
          </div>

          {/* Source Reference Citation Box */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#4fd8ff]">
              <span className="font-semibold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Mandatory source_ref
              </span>
              {onOpenSourceRef && (
                <button
                  onClick={() => onOpenSourceRef(selectedNode.source_ref)}
                  className="text-xs text-[#8b7bff] hover:underline flex items-center gap-1"
                >
                  View <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="text-xs font-mono text-emerald-300 break-words bg-black/40 p-2 rounded-lg">
              {selectedNode.source_ref}
            </div>
          </div>

          {/* Properties breakdown */}
          {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider text-[#8792b0]">Node Properties</div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs font-mono">
                {Object.entries(selectedNode.properties).map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-2">
                    <span className="text-[#8792b0] capitalize">{k}:</span>
                    <span className="text-white text-right font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Edges */}
          {nodeDetail && (
            <div className="space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-[#8792b0] flex items-center justify-between">
                <span>Connected Relationships ({nodeDetail.edges.length})</span>
              </div>

              <div className="space-y-2">
                {nodeDetail.edges.map(edge => {
                  const isSource = edge.source === selectedNode.id;
                  const otherId = isSource ? edge.target : edge.source;
                  const otherNode = nodes.find(n => n.id === otherId);

                  return (
                    <div
                      key={edge.id}
                      onClick={() => {
                        if (otherNode) {
                          setSelectedNode(otherNode);
                          fetchNodeDetail(otherNode.id);
                        }
                      }}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#8b7bff]/40 cursor-pointer transition-all text-xs"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px] text-[#4fd8ff] mb-1">
                        <span>{isSource ? '→ ' + edge.type : '← ' + edge.type}</span>
                        <span className="text-[#8792b0]">{edge.label}</span>
                      </div>
                      <div className="text-white font-medium truncate">{otherNode?.label || otherId}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Related Risk Flags */}
          {nodeDetail && nodeDetail.relatedRisks.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="text-xs font-mono uppercase tracking-wider text-[#ffb454] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Associated Compliance Risks
              </div>
              <div className="space-y-2">
                {nodeDetail.relatedRisks.map(r => (
                  <div key={r.id} className="p-3 rounded-xl bg-[#ffb454]/10 border border-[#ffb454]/30 space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-[#ffb454] text-[#05060c] font-bold">{r.severity}</span>
                      <span className="text-[#8792b0]">{r.status}</span>
                    </div>
                    <div className="text-xs font-semibold text-white">{r.title}</div>
                    <p className="text-[11px] text-[#8792b0] leading-normal">{r.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
