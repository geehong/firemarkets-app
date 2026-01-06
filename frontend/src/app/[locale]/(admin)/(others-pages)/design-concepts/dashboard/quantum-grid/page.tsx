import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Quantum Grid Concept | FireMarkets",
    description: "Design proposal for Quantum Grid Dashboard",
};

const QuantumGridPage = () => {
    return (
        <div className="mx-auto max-w-7xl">
            <PageBreadcrumb pageTitle="Quantum Grid Concept" />
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
                    <h3 className="font-medium text-black dark:text-white">Design Concept: Quantum Grid</h3>
                </div>
                <div className="p-6.5 space-y-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2 text-primary">Quantum Grid</h2>
                        <p className="text-lg text-gray-500 italic">&quot;Cyberpunk-inspired, neon-glow modular grid system.&quot;</p>
                    </div>
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 shadow-2xl group hover:border-primary transition-colors">
                        <div className="w-full h-full bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 text-white flex flex-col p-4 relative overflow-hidden">
                            {/* Grid Background */}
                            <div className="absolute inset-0 opacity-20">
                                <div className="grid grid-cols-12 grid-rows-8 h-full w-full">
                                    {[...Array(96)].map((_, i) => (<div key={i} className="border border-cyan-500/20"></div>))}
                                </div>
                            </div>
                            {/* Glowing Orbs */}
                            <div className="absolute top-10 left-20 w-32 h-32 bg-cyan-500/30 rounded-full blur-3xl animate-pulse"></div>
                            <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
                            {/* Top Nav */}
                            <div className="relative z-10 h-12 flex items-center justify-between border-b border-cyan-500/30 mb-4">
                                <div className="flex items-center gap-6">
                                    <span className="text-cyan-400 font-bold tracking-widest text-lg">QUANTUM<span className="text-pink-500">GRID</span></span>
                                    <div className="flex gap-4 text-sm text-gray-400">
                                        <span className="text-cyan-300 border-b border-cyan-400 pb-1">OVERVIEW</span>
                                        <span className="hover:text-cyan-300 cursor-pointer">ASSETS</span>
                                        <span className="hover:text-cyan-300 cursor-pointer">AI LAB</span>
                                    </div>
                                </div>
                            </div>
                            {/* Main Grid */}
                            <div className="relative z-10 flex-1 grid grid-cols-4 grid-rows-3 gap-3">
                                {/* Chart Panel */}
                                <div className="col-span-2 row-span-2 bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-cyan-500/30 p-4 relative">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-cyan-400 font-mono">BTC/USDT</span>
                                        <span className="text-green-400 text-sm">+4.25%</span>
                                    </div>
                                    <div className="h-full flex items-end gap-1 pb-8">
                                        {[45, 55, 40, 70, 60, 85, 75, 90, 82, 95, 88, 78, 92].map((h, i) => (<div key={i} className={`flex-1 rounded-t ${i > 8 ? 'bg-gradient-to-t from-green-500 to-green-400' : 'bg-gradient-to-t from-cyan-600 to-cyan-400'} opacity-80`} style={{ height: `${h}%` }}></div>))}
                                    </div>
                                    <div className="absolute bottom-4 left-4 text-3xl font-bold text-white">$67,842</div>
                                </div>
                                {/* Stats Cards */}
                                {[{ label: 'Portfolio', value: '$125K', color: 'from-purple-500 to-pink-500' }, { label: 'Volume 24h', value: '$2.4B', color: 'from-cyan-500 to-blue-500' }, { label: 'AI Score', value: '87/100', color: 'from-green-500 to-emerald-500' }, { label: 'Active', value: '14', color: 'from-orange-500 to-red-500' }].map((s, i) => (
                                    <div key={i} className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-4 relative overflow-hidden hover:border-purple-500/50 transition-colors">
                                        <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${s.color} opacity-20 rounded-bl-full`}></div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{s.label}</div>
                                        <div className="text-xl font-bold">{s.value}</div>
                                    </div>
                                ))}
                                {/* Token List */}
                                <div className="col-span-2 bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-4">
                                    <div className="text-sm text-gray-400 mb-3">TOP MOVERS</div>
                                    <div className="space-y-2">
                                        {[{ name: 'SOL', price: '$178', change: '+15%' }, { name: 'LINK', price: '$24', change: '+8%' }, { name: 'MATIC', price: '$1.2', change: '+6%' }].map((t, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">{t.name[0]}</div>
                                                    <span>{t.name}</span>
                                                </div>
                                                <div className="text-right"><div className="text-sm">{t.price}</div><div className="text-xs text-green-400">{t.change}</div></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* AI Panel */}
                                <div className="col-span-2 bg-gradient-to-r from-purple-900/40 to-pink-900/40 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-4">
                                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div><span className="text-sm text-purple-300">AI NEURAL NETWORK</span></div>
                                    <div className="text-sm text-gray-300">Bullish divergence detected. Confidence: <span className="text-green-400">94%</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="bg-primary/80 backdrop-blur text-white text-xs px-2 py-1 rounded shadow-lg">Live CSS Mockup</span>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-meta-4 p-6 rounded-lg">
                        <h5 className="font-semibold mb-3">Implemented Layout Features:</h5>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Cyberpunk neon aesthetics, glass-morphism panels, animated elements, and modular grid system.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuantumGridPage;
