import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Brain, CheckCircle2, XCircle, GitBranch, Sparkles, User, Target, Loader2, Link2 } from 'lucide-react';
import './ThoughtNode.css';

export interface ThoughtNodeData {
    thought: string;
    status: 'active' | 'validated' | 'rejected' | 'branching';
    score: number;
    metadata?: Record<string, unknown>;
    authorId?: string;
    agentTarget?: string;
    executionState?: 'queued' | 'processing' | 'done';
    dependencies?: string[];
}

const statusConfig = {
    active: {
        icon: Brain,
        color: 'var(--color-active)',
        glow: 'var(--glow-active)',
        label: 'Active',
    },
    validated: {
        icon: CheckCircle2,
        color: 'var(--color-validated)',
        glow: 'var(--glow-validated)',
        label: 'Validated',
    },
    rejected: {
        icon: XCircle,
        color: 'var(--color-rejected)',
        glow: 'var(--glow-rejected)',
        label: 'Rejected',
    },
    branching: {
        icon: GitBranch,
        color: 'var(--color-branching)',
        glow: 'var(--glow-branching)',
        label: 'Branching',
    },
};

function ThoughtNode({ data, id }: NodeProps) {
    const nodeData = data as unknown as ThoughtNodeData;
    const config = statusConfig[nodeData.status] || statusConfig.active;
    const Icon = config.icon;

    const scorePercentage = Math.round((nodeData.score || 0.5) * 100);

    const style = useMemo(() => ({
        '--status-color': config.color,
        '--status-glow': config.glow,
    } as React.CSSProperties), [config]);

    return (
        <div className="thought-node" style={style} data-status={nodeData.status}>
            {/* Input handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="thought-node-handle"
            />

            {/* Glow effect layer */}
            <div className="thought-node-glow" />

            {/* Main card */}
            <div className="thought-node-card">
                {/* Header */}
                <div className="thought-node-header">
                    <div className="thought-node-icon">
                        <Icon size={16} />
                    </div>
                    <span className="thought-node-id">{id}</span>
                    <div className="thought-node-status-badge">
                        <Sparkles size={10} />
                        {config.label}
                    </div>
                </div>

                {/* Content */}
                <div className="thought-node-content">
                    <p className="thought-node-text">{nodeData.thought}</p>
                </div>

                {/* Swarm Meta (Framework C) */}
                {(nodeData.authorId || nodeData.agentTarget || (nodeData.dependencies && nodeData.dependencies.length > 0)) && (
                    <div className="thought-node-swarm-meta">
                        {nodeData.authorId && (
                            <div className="swarm-badge author-badge">
                                <User size={12} /> {nodeData.authorId}
                            </div>
                        )}
                        {nodeData.agentTarget && (
                            <div className="swarm-badge target-badge">
                                <Target size={12} /> {nodeData.agentTarget}
                                {nodeData.executionState === 'queued' && <span className="swarm-state queued">(Queued)</span>}
                                {nodeData.executionState === 'processing' && <Loader2 size={12} className="lucide-spin swarm-state processing" />}
                                {nodeData.executionState === 'done' && <CheckCircle2 size={12} className="swarm-state done" />}
                            </div>
                        )}
                        {nodeData.dependencies && nodeData.dependencies.length > 0 && (
                            <div className="swarm-badge deps-badge">
                                <Link2 size={12} /> {nodeData.dependencies.length} Dep(s)
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="thought-node-footer">
                    <div className="thought-node-score">
                        <div className="thought-node-score-bar">
                            <div
                                className="thought-node-score-fill"
                                style={{ width: `${scorePercentage}%` }}
                            />
                        </div>
                        <span className="thought-node-score-text">{scorePercentage}%</span>
                    </div>
                </div>
            </div>

            {/* Output handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="thought-node-handle"
            />
        </div>
    );
}

export default memo(ThoughtNode);
