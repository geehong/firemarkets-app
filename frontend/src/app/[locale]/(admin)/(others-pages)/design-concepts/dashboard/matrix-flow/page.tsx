import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Matrix Flow Concept | FireMarkets",
    description: "Design proposal for Matrix Flow Dashboard",
};

const MatrixFlowPage = () => {
    return (
        <div className="mx-auto max-w-7xl">
            <PageBreadcrumb pageTitle="Matrix Flow Concept" />
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
                    <h3 className="font-medium text-black dark:text-white">Design Concept: Matrix Flow</h3>
                </div>
                <div className="p-6.5 space-y-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2 text-primary">Matrix Flow</h2>
                        <p className="text-lg text-gray-500 italic">&quot;Real-time streaming data with trading terminal aesthetics.&quot;</p>
                    </div>
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 shadow-2xl group hover:border-primary transition-colors">
                        <div className="w-full h-full bg-black relative overflow-hidden font-mono">
                            {/* Matrix Rain */}
                            <div className="absolute inset-0 opacity-10">
                                {[...Array(15)].map((_, i) => (<div key={i} className="absolute text-green-500 text-xs animate-pulse" style={{ left: `${i * 7}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }}>{[...Array(10)].map((_, j) => (<div key={j} style={{ opacity: 1 - j * 0.1 }}>{Math.random() > 0.5 ? '1' : '0'}</div>))}</div>))}
                            </div>
                            <div className="relative z-10 h-full flex flex-col p-4">
                                {/* Header */}
                                <div className="flex justify-between items-center mb-4 border-b border-green-500/30 pb-3">
                                    <div className="flex items-center gap-4">
                                        <span className="text-green-400 font-bold text-xl">MATRIX<span className="text-green-600">FLOW</span></span>
                                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400 animate-ping"></div><span className="text-green-500 text-xs">LIVE DATA</span></div>
                                    </div>
                                    <div className="text-green-500/70 text-sm">LATENCY: 12ms | BLOCKS: 847,293</div>
                                </div>
                                {/* Main Grid */}
                                <div className="flex-1 grid grid-cols-12 gap-3">
                                    {/* Order Flow */}
                                    <div className="col-span-3 bg-green-950/30 rounded-lg border border-green-500/20 p-3">
                                        <div className="text-green-300 text-xs mb-2">ORDER FLOW</div>
                                        <div className="space-y-1">
                                            {[80, 60, 45, 30, 20].map((w, i) => (<div key={i} className="flex items-center gap-2"><div className="h-2 bg-red-500/60 rounded-r" style={{ width: `${w}%` }}></div><span className="text-red-400 text-xs">${67850 - i * 10}</span></div>))}
                                            <div className="border-t border-green-500/30 my-2"></div>
                                            {[25, 40, 55, 70, 90].map((w, i) => (<div key={i} className="flex items-center gap-2"><div className="h-2 bg-green-500/60 rounded-r" style={{ width: `${w}%` }}></div><span className="text-green-400 text-xs">${67800 - i * 10}</span></div>))}
                                        </div>
                                    </div>
                                    {/* Main Chart */}
                                    <div className="col-span-6 bg-green-950/30 rounded-lg border border-green-500/20 p-3 relative">
                                        <div className="absolute top-3 left-3 flex items-center gap-4">
                                            <span className="text-green-400">BTC/USD</span>
                                            <span className="text-3xl font-bold text-green-300">$67,842</span>
                                            <span className="text-green-500 text-sm">↑ +2.34%</span>
                                        </div>
                                        <div className="h-full pt-12 flex items-end justify-center gap-1">
                                            {[{ o: 50, c: 70 }, { o: 70, c: 60 }, { o: 60, c: 75 }, { o: 75, c: 65 }, { o: 65, c: 85 }, { o: 85, c: 80 }, { o: 80, c: 90 }, { o: 90, c: 85 }, { o: 85, c: 95 }, { o: 95, c: 88 }, { o: 88, c: 92 }, { o: 92, c: 98 }].map((candle, i) => {
                                                const isGreen = candle.c > candle.o;
                                                return (<div key={i} className={`relative w-4 ${isGreen ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${Math.abs(candle.c - candle.o) + 20}%`, marginTop: 'auto' }}></div>);
                                            })}
                                        </div>
                                    </div>
                                    {/* Trade Feed */}
                                    <div className="col-span-3 bg-green-950/30 rounded-lg border border-green-500/20 p-3">
                                        <div className="text-green-300 text-xs mb-2">LIVE TRADES</div>
                                        <div className="space-y-1">
                                            {[{ price: 67845, size: 0.5, side: 'buy' }, { price: 67842, size: 1.2, side: 'sell' }, { price: 67843, size: 0.3, side: 'buy' }, { price: 67840, size: 2.1, side: 'sell' }, { price: 67841, size: 0.8, side: 'buy' }, { price: 67844, size: 1.5, side: 'buy' }].map((t, i) => (
                                                <div key={i} className={`flex justify-between text-xs py-1 px-2 rounded ${t.side === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    <span>${t.price.toLocaleString()}</span><span>{t.size} BTC</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Bottom Stats */}
                                    <div className="col-span-12 grid grid-cols-6 gap-3">
                                        {[{ label: '24h Vol', value: '$42.8B' }, { label: 'Open Interest', value: '$18.2B' }, { label: 'Funding', value: '+0.012%' }, { label: 'Long/Short', value: '52/48' }, { label: 'Liq. 24h', value: '$124M' }, { label: 'Dom.', value: '54.2%' }].map((s, i) => (
                                            <div key={i} className="bg-green-950/30 rounded-lg border border-green-500/20 p-2 text-center">
                                                <div className="text-green-600 text-xs">{s.label}</div><div className="text-green-400 font-bold">{s.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="bg-primary/80 backdrop-blur text-white text-xs px-2 py-1 rounded shadow-lg">Live CSS Mockup</span>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-meta-4 p-6 rounded-lg">
                        <h5 className="font-semibold mb-3">Implemented Layout Features:</h5>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Trading terminal aesthetics, order flow visualization, candlestick charts, and live trade feeds.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatrixFlowPage;
