import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Nebula Station Concept | FireMarkets",
    description: "Design proposal for Nebula Station Dashboard",
};

const NebulaStationPage = () => {
    return (
        <div className="mx-auto max-w-7xl">
            <PageBreadcrumb pageTitle="Nebula Station Concept" />
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
                    <h3 className="font-medium text-black dark:text-white">Design Concept: Nebula Station</h3>
                </div>
                <div className="p-6.5 space-y-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2 text-primary">Nebula Station</h2>
                        <p className="text-lg text-gray-500 italic">&quot;Space-themed command center with floating data panels.&quot;</p>
                    </div>
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 shadow-2xl group hover:border-primary transition-colors">
                        <div className="w-full h-full relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #1a1a3e 0%, #0a0a1a 100%)' }}>
                            {/* Stars */}
                            <div className="absolute inset-0">{[...Array(40)].map((_, i) => (<div key={i} className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s`, opacity: Math.random() * 0.8 + 0.2 }}></div>))}</div>
                            {/* Nebula */}
                            <div className="absolute inset-0 opacity-30">
                                <div className="absolute top-10 left-1/4 w-64 h-64 bg-purple-600 rounded-full blur-[80px]"></div>
                                <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-blue-600 rounded-full blur-[100px]"></div>
                            </div>
                            <div className="relative z-10 h-full flex flex-col p-6">
                                {/* Nav */}
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-0.5"><div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-white font-bold">N</div></div>
                                        <span className="text-white font-light text-xl tracking-widest">NEBULA</span>
                                    </div>
                                </div>
                                {/* Grid */}
                                <div className="flex-1 grid grid-cols-12 grid-rows-3 gap-4">
                                    {/* Orbital Stats */}
                                    <div className="col-span-4 row-span-2 flex items-center justify-center">
                                        <div className="relative w-40 h-40 rounded-full border-4 border-purple-500/30 flex items-center justify-center">
                                            <div className="absolute inset-2 rounded-full border-2 border-dashed border-pink-500/40 animate-spin" style={{ animationDuration: '20s' }}></div>
                                            <div className="text-center"><div className="text-white/50 text-xs mb-1">TOTAL VALUE</div><div className="text-2xl font-bold text-white">$847K</div><div className="text-green-400 text-sm">+14.5%</div></div>
                                        </div>
                                    </div>
                                    {/* Cards */}
                                    {[{ label: 'Bitcoin', value: '$67,842', change: '+4.2%' }, { label: 'Ethereum', value: '$3,542', change: '+2.8%' }, { label: 'Solana', value: '$178', change: '+8.4%' }, { label: 'P&L', value: '+$24K', change: 'Today' }].map((c, i) => (
                                        <div key={i} className="col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-3 hover:border-purple-500/50 transition-all">
                                            <div className="text-white/50 text-xs">{c.label}</div><div className="text-white font-bold">{c.value}</div><div className="text-green-400 text-xs">{c.change}</div>
                                        </div>
                                    ))}
                                    {/* Chart */}
                                    <div className="col-span-6 row-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
                                        <div className="text-white mb-2">Portfolio History</div>
                                        <svg className="w-full h-24" preserveAspectRatio="none">
                                            <defs><linearGradient id="nG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#EC4899" /></linearGradient></defs>
                                            <path d="M0,80 C50,60 100,70 150,40 S250,20 300,30 S400,10 500,15" fill="none" stroke="url(#nG)" strokeWidth="3" />
                                        </svg>
                                    </div>
                                    {/* Holdings */}
                                    <div className="col-span-4 row-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
                                        <div className="text-white mb-2">Holdings</div>
                                        {[{ name: 'BTC', pct: 45, color: 'from-orange-400 to-yellow-500' }, { name: 'ETH', pct: 25, color: 'from-purple-400 to-indigo-500' }, { name: 'SOL', pct: 15, color: 'from-green-400 to-emerald-500' }].map((h, i) => (
                                            <div key={i} className="flex items-center gap-2 mb-2"><span className="text-white/70 text-xs w-8">{h.name}</span><div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden"><div className={`h-full bg-gradient-to-r ${h.color} rounded-full`} style={{ width: `${h.pct}%` }}></div></div><span className="text-white/50 text-xs">{h.pct}%</span></div>
                                        ))}
                                    </div>
                                    {/* Activity */}
                                    <div className="col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-3">
                                        <div className="text-white/80 text-sm mb-2">Activity</div>
                                        {[{ action: 'Bought', asset: 'BTC' }, { action: 'Sold', asset: 'ETH' }].map((a, i) => (<div key={i} className="flex items-center gap-1 text-xs text-white/70"><div className={`w-1 h-1 rounded-full ${a.action === 'Bought' ? 'bg-green-400' : 'bg-red-400'}`}></div>{a.action} {a.asset}</div>))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"><span className="bg-primary/80 backdrop-blur text-white text-xs px-2 py-1 rounded shadow-lg">Live CSS</span></div>
                    </div>
                    <div className="bg-gray-50 dark:bg-meta-4 p-6 rounded-lg">
                        <h5 className="font-semibold mb-3">Implemented Layout Features:</h5>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Space-themed design with floating panels, orbital stats, and cosmic gradients.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NebulaStationPage;
