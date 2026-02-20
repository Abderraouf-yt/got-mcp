import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ThoughtNode from './components/ThoughtNode';
import { Network, Zap, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import './App.css';

// Bridge API endpoint
const BRIDGE_URL = 'http://localhost:3001';

interface ThoughtNodeData {
  id: string;
  thought: string;
  status: 'active' | 'validated' | 'rejected' | 'branching';
  score: number;
  metadata?: Record<string, unknown>;
}

interface ThoughtEdge {
  from: string;
  to: string;
  relation: 'refinement' | 'contradiction' | 'support' | 'branch';
}

interface GraphData {
  nodes: ThoughtNodeData[];
  edges: ThoughtEdge[];
}

// Edge styling per relation type
const edgeStyles = {
  refinement: { stroke: '#6366f1', strokeWidth: 2, animated: true },
  support: { stroke: '#10b981', strokeWidth: 2, animated: false },
  contradiction: { stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '5 5', animated: false },
  branch: { stroke: '#a78bfa', strokeWidth: 2, animated: true },
};

// Auto-layout: simple grid with staggering
function layoutNodes(nodes: ThoughtNodeData[]): Node[] {
  const HORIZONTAL_SPACING = 380;
  const VERTICAL_SPACING = 220;
  const COLS = 3;

  return nodes.map((node, index) => ({
    id: node.id,
    type: 'thoughtNode',
    position: {
      x: (index % COLS) * HORIZONTAL_SPACING + Math.random() * 40 - 20,
      y: Math.floor(index / COLS) * VERTICAL_SPACING + Math.random() * 30 - 15,
    },
    data: {
      thought: node.thought,
      status: node.status,
      score: node.score,
      metadata: node.metadata,
    },
  }));
}

function convertEdges(edges: ThoughtEdge[]): Edge[] {
  return edges.map((edge, index) => ({
    id: `e-${edge.from}-${edge.to}-${index}`,
    source: edge.from,
    target: edge.to,
    type: 'smoothstep',
    style: edgeStyles[edge.relation] || edgeStyles.refinement,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edgeStyles[edge.relation]?.stroke || '#6366f1',
    },
    label: edge.relation,
    labelStyle: {
      fontSize: 10,
      fontWeight: 600,
      fill: edgeStyles[edge.relation]?.stroke || '#6366f1',
      textTransform: 'uppercase' as const,
    },
    labelBgStyle: {
      fill: 'rgba(10, 10, 15, 0.9)',
      fillOpacity: 0.9,
    },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
  }));
}

const nodeTypes = { thoughtNode: ThoughtNode };

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [nodeCount, setNodeCount] = useState(0);

  // Fetch graph data
  const fetchGraph = useCallback(async () => {
    try {
      const response = await fetch(`${BRIDGE_URL}/api/graph`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data: GraphData = await response.json();

      setNodes(layoutNodes(data.nodes));
      setEdges(convertEdges(data.edges));
      setNodeCount(data.nodes.length);
      setConnected(true);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Bridge connection error:', error);
      setConnected(false);
    }
  }, [setNodes, setEdges]);

  // Poll for updates
  useEffect(() => {
    fetchGraph();
    const interval = setInterval(fetchGraph, 2000);
    return () => clearInterval(interval);
  }, [fetchGraph]);

  // Node status counts
  const statusCounts = useMemo(() => {
    const counts = { active: 0, validated: 0, rejected: 0, branching: 0 };
    nodes.forEach((node) => {
      const status = (node.data as { status: keyof typeof counts }).status;
      if (status in counts) counts[status]++;
    });
    return counts;
  }, [nodes]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">
            <Network size={20} />
          </div>
          <div className="brand-text">
            <h1>Thought Graph</h1>
            <span className="brand-subtitle">Graph of Thoughts Visualizer</span>
          </div>
        </div>

        <div className="header-stats">
          <div className="stat-item" data-status="active">
            <span className="stat-value">{statusCounts.active}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-item" data-status="validated">
            <span className="stat-value">{statusCounts.validated}</span>
            <span className="stat-label">Validated</span>
          </div>
          <div className="stat-item" data-status="rejected">
            <span className="stat-value">{statusCounts.rejected}</span>
            <span className="stat-label">Rejected</span>
          </div>
          <div className="stat-item" data-status="branching">
            <span className="stat-value">{statusCounts.branching}</span>
            <span className="stat-label">Branching</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="action-btn" onClick={fetchGraph} title="Refresh">
            <RefreshCw size={16} />
          </button>
          <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </header>

      {/* Flow Canvas */}
      <main className="flow-container">
        {nodeCount === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Zap size={48} />
            </div>
            <h2>Waiting for Thoughts</h2>
            <p>Use the thought-graph MCP tools to add reasoning nodes.</p>
            <code>propose_thought("Your idea here")</code>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="rgba(255, 255, 255, 0.03)"
            />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const status = (node.data as { status: string }).status;
                const colors: Record<string, string> = {
                  active: '#22d3ee',
                  validated: '#10b981',
                  rejected: '#f43f5e',
                  branching: '#a78bfa',
                };
                return colors[status] || '#6366f1';
              }}
              maskColor="rgba(0, 0, 0, 0.8)"
            />
          </ReactFlow>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-left">
          <span className="footer-label">Nodes:</span>
          <span className="footer-value">{nodeCount}</span>
          <span className="footer-divider">|</span>
          <span className="footer-label">Edges:</span>
          <span className="footer-value">{edges.length}</span>
        </div>
        <div className="footer-center">
          <span className="evolution-badge">
            <Zap size={12} />
            Evolution of Sequential Thinking
          </span>
        </div>
        <div className="footer-right">
          {lastUpdate && (
            <span className="last-update">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
