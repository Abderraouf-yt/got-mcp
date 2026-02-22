import { useEffect, useMemo, useCallback, useRef } from 'react';
import useSWR from 'swr';
import dagre from 'dagre';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ThoughtNode from './components/ThoughtNode';
import { Network, Zap, Wifi, WifiOff } from 'lucide-react';
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

// Vercel Best Practice: `rendering-hoist-jsx` — Hoist static constants outside the component
const NODE_WIDTH = 300;
const NODE_HEIGHT = 200;

// Edge styling per relation type — hoisted for stable reference
const edgeStyles: Record<string, { stroke: string; strokeWidth: number; animated?: boolean; strokeDasharray?: string }> = {
  refinement: { stroke: '#6366f1', strokeWidth: 2, animated: true },
  support: { stroke: '#10b981', strokeWidth: 2, animated: false },
  contradiction: { stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '8 4', animated: false },
  branch: { stroke: '#a78bfa', strokeWidth: 2, animated: true },
};

/**
 * Dagre-based hierarchical layout engine.
 * Produces a clean top-to-bottom DAG layout that respects parent→child edge flow.
 */
function getLayoutedElements(
  nodes: ThoughtNodeData[],
  edges: ThoughtEdge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 80,      // horizontal spacing between nodes
    ranksep: 120,     // vertical spacing between ranks (levels)
    edgesep: 40,      // spacing between edges
    marginx: 40,
    marginy: 40,
  });

  // Register nodes with dagre
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  // Register edges with dagre so it knows the graph structure
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.from, edge.to);
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Map dagre output back to React Flow nodes
  const layoutedNodes: Node[] = nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    return {
      id: node.id,
      type: 'thoughtNode',
      position: {
        // dagre gives center coords; offset to top-left for React Flow
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      },
      data: {
        thought: node.thought,
        status: node.status,
        score: node.score,
        metadata: node.metadata,
      },
    };
  });

  // Convert edges with enhanced visual styling
  const layoutedEdges: Edge[] = edges.map((edge, index) => {
    const style = edgeStyles[edge.relation] || edgeStyles.refinement;
    return {
      id: `e-${edge.from}-${edge.to}-${index}`,
      source: edge.from,
      target: edge.to,
      type: 'smoothstep',
      animated: style.animated,
      style: {
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        strokeDasharray: style.strokeDasharray,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: style.stroke,
        width: 18,
        height: 18,
      },
      label: edge.relation.toUpperCase(),
      labelStyle: {
        fontSize: 9,
        fontWeight: 700,
        fill: style.stroke,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '1.5px',
      },
      labelBgStyle: {
        fill: 'rgba(5, 5, 8, 0.95)',
        fillOpacity: 0.95,
      },
      labelBgPadding: [8, 5] as [number, number],
      labelBgBorderRadius: 2,
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}

// Vercel Best Practice: `client-swr-dedup` — SWR fetcher hoisted outside component
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

// Vercel Best Practice: `rendering-hoist-jsx` — hoisted nodeTypes
const nodeTypes = { thoughtNode: ThoughtNode };

// Vercel Best Practice: `rerender-memo-with-default-value` — hoisted default fitView options
const fitViewOptions = { padding: 0.4, duration: 600 };

function GraphCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();
  const prevNodeCountRef = useRef(0);

  // Vercel Best Practice: `client-swr-dedup` — automatic request deduplication and caching
  const { data, error, isLoading } = useSWR<GraphData>(`${BRIDGE_URL}/api/graph`, fetcher, {
    refreshInterval: 2000,
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });

  const connected = !error && data !== undefined;
  const nodeCount = data?.nodes?.length || 0;

  // Vercel Best Practice: `rerender-functional-setstate` — stable callback using useCallback
  const applyLayout = useCallback((graphData: GraphData) => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      graphData.nodes,
      graphData.edges,
      'TB'
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (data && data.nodes.length > 0) {
      applyLayout(data);

      // Only re-fit the view when node count changes (new nodes added/removed)
      if (data.nodes.length !== prevNodeCountRef.current) {
        prevNodeCountRef.current = data.nodes.length;
        // Small delay to let React Flow render the new nodes before fitting
        setTimeout(() => fitView(fitViewOptions), 100);
      }
    } else if (data && data.nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      prevNodeCountRef.current = 0;
    }
  }, [data, applyLayout, fitView, setNodes, setEdges]);

  // Vercel Best Practice: `rerender-memo` — memoize derived state computation
  const statusCounts = useMemo(() => {
    const counts = { active: 0, validated: 0, rejected: 0, branching: 0 };
    if (!data?.nodes) return counts;
    // Vercel Best Practice: `js-combine-iterations` — single pass through array
    for (const node of data.nodes) {
      if (node.status in counts) counts[node.status as keyof typeof counts]++;
    }
    return counts;
  }, [data?.nodes]);

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
            fitViewOptions={fitViewOptions}
            minZoom={0.2}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { strokeWidth: 2 },
            }}
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
              style={{ borderRadius: 0, border: '1px solid var(--border-default)' }}
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
          <span className="last-update">
            {isLoading ? 'Syncing...' : connected ? 'Live Sync Active' : 'Disconnected'}
          </span>
        </div>
      </footer>
    </div>
  );
}

/**
 * App wrapper — ReactFlowProvider is required for useReactFlow() hook
 * Vercel Best Practice: `advanced-init-once` — Provider initialized once at app root
 */
function App() {
  return (
    <ReactFlowProvider>
      <GraphCanvas />
    </ReactFlowProvider>
  );
}

export default App;
