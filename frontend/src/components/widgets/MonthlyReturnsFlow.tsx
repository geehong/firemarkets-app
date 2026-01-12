
import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    Background,
    Controls,
    MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';
import MonthlyReturnNode from './MonthlyReturnNode';
import { interpolateColor } from '@/utils/colorUtils';

// Define custom node types
const nodeTypes = {
    monthlyReturn: MonthlyReturnNode,
};

interface YearlyData {
    year: number;
    yearClosePrice: number;
    totalReturn: number;
}

interface MonthlyReturnsFlowProps {
    data: YearlyData[];
}

const MonthlyReturnsFlow: React.FC<MonthlyReturnsFlowProps> = ({ data }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        if (!data || data.length === 0) return;

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        // Sort data ascending by year
        const sortedData = [...data].sort((a, b) => a.year - b.year);

        const xOffset = 300; // Horizontal spacing
        const yOffset = 180;   // Vertical spacing
        const columns = 5;     // Nodes per row

        sortedData.forEach((item, index) => {
            const year = item.year;
            const label = `${year}`;
            const id = `node-${year}`;

            const row = Math.floor(index / columns);
            const col = index % columns;

            // Create Node
            newNodes.push({
                id: id,
                type: 'monthlyReturn',
                position: { x: col * xOffset, y: row * yOffset },
                data: {
                    label: label,
                    price: item.yearClosePrice,
                    value: item.totalReturn,
                    color: interpolateColor(item.totalReturn)
                },
            });

            // Create Edge (connect to previous node)
            if (index > 0) {
                const prevItem = sortedData[index - 1];
                const prevId = `node-${prevItem.year}`;
                newEdges.push({
                    id: `edge-${prevId}-${id}`,
                    source: prevId,
                    target: id,
                    animated: true,
                    style: { stroke: '#888', strokeWidth: 2 },
                    type: 'smoothstep',
                });
            }
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }, [data, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    return (
        <div style={{ width: '100%', height: '600px' }} className="bg-[#1e1e24] rounded-lg border border-gray-700">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
            >
                <Background color="#444" gap={16} />
                <Controls className="bg-white text-black" />
                <MiniMap
                    nodeColor={() => '#2a2e39'}
                    maskColor="rgba(0, 0, 0, 0.7)"
                    style={{ backgroundColor: '#1e1e24' }}
                />
            </ReactFlow>
        </div>
    );
};

export default MonthlyReturnsFlow;
