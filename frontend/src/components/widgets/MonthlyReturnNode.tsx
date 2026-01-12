
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CryptoPriceCard } from './PriceCards';

const MonthlyReturnNode = ({ data }: NodeProps) => {
    return (
        <div className="relative">
            {/* Input Handle (Left) */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-gray-400"
                style={{ left: -15, background: '#555' }}
            />

            {/* Content Card */}
            <div className="min-w-[200px]">
                <CryptoPriceCard
                    symbol="BTC"
                    name={data.label}
                    price={data.price}
                    change24h={data.value} // passing monthly return as change
                    showIcon={false}
                    size="small"
                    className="text-sm border border-gray-700 shadow-xl"
                    customBackgroundColor={data.color}
                    textColor='text-white'
                />
            </div>

            {/* Output Handle (Right) */}
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 bg-gray-400"
                style={{ right: -15, background: '#555' }}
            />
        </div>
    );
};

export default memo(MonthlyReturnNode);
