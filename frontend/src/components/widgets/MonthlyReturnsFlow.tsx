
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

export interface FlowMonthlyData {
    year: number;
    month: number;
    close_price: number;
    change_percent: number;
    timestamp_utc: string;
}

export interface MonthlyReturnsFlowProps {
    data: FlowMonthlyData[];
}

// Bitcoin Halving Dates
const HALVING_DATES = [
    { date: new Date('2009-01-03'), label: 'Genesis' },
    { date: new Date('2012-11-28'), label: '1st Halving' },
    { date: new Date('2016-07-09'), label: '2nd Halving' },
    { date: new Date('2020-05-11'), label: '3rd Halving' },
    { date: new Date('2024-04-20'), label: '4th Halving' },
];

const getEpochInfo = (dateStr: string) => {
    const date = new Date(dateStr);
    for (let i = HALVING_DATES.length - 1; i >= 0; i--) {
        if (date >= HALVING_DATES[i].date) {
            return {
                epoch: i,
                epochLabel: HALVING_DATES[i].label,
                startDate: HALVING_DATES[i].date
            };
        }
    }
    return { epoch: 0, epochLabel: 'Pre-Genesis', startDate: HALVING_DATES[0].date };
};

const MonthlyReturnsFlow: React.FC<MonthlyReturnsFlowProps> = ({ data }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        if (!data || data.length === 0) return;

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        // Sort data ascending by date
        const sortedData = [...data].sort((a, b) => new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime());

        const xOffset = 250; // Horizontal spacing
        const yOffset = 200; // Vertical spacing

        // Group data by epoch
        const epochGroups: Map<number, FlowMonthlyData[]> = new Map();
        
        sortedData.forEach(item => {
            const { epoch } = getEpochInfo(item.timestamp_utc);
            if (!epochGroups.has(epoch)) epochGroups.set(epoch, []);
            epochGroups.get(epoch)?.push(item);
        });


        // Process each epoch
        Array.from(epochGroups.keys()).sort((a, b) => a - b).forEach((epoch) => {
            const epochData = epochGroups.get(epoch) || [];
            const epochLabel = HALVING_DATES[epoch]?.label || `Epoch ${epoch}`;

            // Add an epoch label node
            newNodes.push({
                id: `label-epoch-${epoch}`,
                type: 'default',
                position: { x: -300, y: epoch * yOffset },
                data: { label: epochLabel },
                style: { 
                    background: '#2a2e39', 
                    color: '#00d4ff', 
                    fontWeight: 'bold', 
                    fontSize: '16px',
                    border: '1px solid #00d4ff',
                    width: 150,
                    textAlign: 'center'
                },
                draggable: false,
            });

            epochData.forEach((item, index) => {
                const dateStr = `${item.year}-${String(item.month).padStart(2, '0')}`;
                const id = `node-${item.timestamp_utc}`;

                // Create Node
                newNodes.push({
                    id: id,
                    type: 'monthlyReturn',
                    position: { x: index * xOffset, y: epoch * yOffset },
                    data: {
                        label: dateStr,
                        price: item.close_price,
                        value: item.change_percent,
                        color: interpolateColor(item.change_percent)
                    },
                });

                // Create Edge (connect to previous month in the same epoch)
                if (index > 0) {
                    const prevItem = epochData[index - 1];
                    const prevId = `node-${prevItem.timestamp_utc}`;
                    newEdges.push({
                        id: `edge-${prevId}-${id}`,
                        source: prevId,
                        target: id,
                        animated: true,
                        style: { stroke: '#00d4ff', strokeWidth: 2, opacity: 0.6 },
                        type: 'smoothstep',
                    });
                }

                // Connect across epochs? 
                // Let's connect the last month of previous epoch to the first month of current epoch for a continuous flow
                if (index === 0 && epoch > 0) {
                    const prevEpoch = epoch - 1;
                    const prevEpochData = epochGroups.get(prevEpoch) || [];
                    if (prevEpochData.length > 0) {
                        const prevItem = prevEpochData[prevEpochData.length - 1];
                        const prevId = `node-${prevItem.timestamp_utc}`;
                        newEdges.push({
                            id: `edge-cross-${prevId}-${id}`,
                            source: prevId,
                            target: id,
                            animated: true,
                            style: { stroke: '#ff00ff', strokeWidth: 1, opacity: 0.4, strokeDasharray: '5,5' },
                            type: 'smoothstep',
                        });
                    }
                }
            });
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }, [data, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    return (
        <div style={{ width: '100%', height: '800px' }} className="bg-[#1e1e24] rounded-lg border border-gray-700 overflow-hidden shadow-inner">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.1 }}
                minZoom={0.05}
                maxZoom={1.5}
            >
                <Background color="#333" gap={20} variant={'dots' as any} />
                <Controls className="bg-[#2a2e39] border-gray-600 border fill-white" />
                <MiniMap
                    nodeColor={(n: any) => n.data?.color || '#2a2e39'}
                    maskColor="rgba(0, 0, 0, 0.7)"
                    style={{ backgroundColor: '#1e1e24' }}
                />
            </ReactFlow>
        </div>
    );
};

export default MonthlyReturnsFlow;
