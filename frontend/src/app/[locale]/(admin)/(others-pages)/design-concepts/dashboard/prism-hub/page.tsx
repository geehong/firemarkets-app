import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Prism Hub Concept | FireMarkets",
    description: "Design proposal for Prism Hub Dashboard",
};

const PrismHubPage = () => {
    return (
        <div className="mx-auto max-w-7xl">
            <PageBreadcrumb pageTitle="Prism Hub Concept" />
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
                    <h3 className="font-medium text-black dark:text-white">Design Concept: Prism Hub</h3>
                </div>
                <div className="p-6.5 space-y-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2 text-primary">Prism Hub</h2>
                        <p className="text-lg text-gray-500 italic">&quot;Light-mode elegance with rainbow accent gradients.&quot;</p>
                    </div>
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 shadow-2xl group hover:border-primary transition-colors">
                        <div className="w-full h-full bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
                            {/* Rainbow Line */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500"></div>
                            <div className="relative z-10 h-full flex flex-col p-6">
                                {/* Header */}
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-xl">P</div>
                                        <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">Prism Hub</span>
                                    </div>
                                    <button className="px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-violet-500/25">+ Add Asset</button>
                                </div>
                                {/* Grid */}
                                <div className="flex-1 grid grid-cols-12 grid-rows-3 gap-4">
                                    {/* Portfolio */}
                                    <div className="col-span-5 bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-5 border border-slate-100">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-slate-400 text-sm mb-1">Total Portfolio</div>
                                                <div className="text-3xl font-bold text-slate-800">$156,842</div>
                                                <div className="text-green-500 text-sm font-medium mt-2">↑ +$12,340 (8.5%)</div>
                                            </div>
                                            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">+8%</div>
                                        </div>
                                    </div>
                                    {/* Stats */}
                                    {[{ label: 'Crypto', value: '$98K', color: 'from-violet-400 to-indigo-500' }, { label: 'Stocks', value: '$42K', color: 'from-pink-400 to-rose-500' }, { label: 'Cash', value: '$16K', color: 'from-amber-400 to-orange-500' }].map((s, i) => (
                                        <div key={i} className="col-span-2 bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-4 border border-slate-100 relative overflow-hidden">
                                            <div className={`absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br ${s.color} opacity-20 rounded-full blur-xl`}></div>
                                            <div className="text-slate-400 text-xs">{s.label}</div><div className="text-slate-800 font-bold text-lg">{s.value}</div>
                                        </div>
                                    ))}
                                    <div className="col-span-1 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg p-3 flex flex-col items-center justify-center text-white">
                                        <div className="w-4 h-4 rounded-full bg-white/30 animate-ping mb-1"></div><span className="text-xs">LIVE</span>
                                    </div>
                                    {/* Chart */}
                                    <div className="col-span-8 row-span-2 bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-5 border border-slate-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-slate-800 font-semibold">Performance</h3>
                                            <div className="flex gap-2">{['1D', '1W', '1M', '1Y', 'ALL'].map((t, i) => (<button key={t} className={`px-3 py-1 rounded-lg text-xs ${i === 2 ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{t}</button>))}</div>
                                        </div>
                                        <svg className="w-full h-28" preserveAspectRatio="none">
                                            <defs>
                                                <linearGradient id="pG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8B5CF6" /><stop offset="50%" stopColor="#EC4899" /><stop offset="100%" stopColor="#F97316" /></linearGradient>
                                                <linearGradient id="pF" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.2" /><stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" /></linearGradient>
                                            </defs>
                                            <path d="M0,90 C80,80 160,60 240,50 S400,25 480,35 S640,15 800,8" fill="url(#pF)" stroke="none" />
                                            <path d="M0,90 C80,80 160,60 240,50 S400,25 480,35 S640,15 800,8" fill="none" stroke="url(#pG)" strokeWidth="3" />
                                        </svg>
                                    </div>
                                    {/* Assets */}
                                    <div className="col-span-4 row-span-2 bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-5 border border-slate-100">
                                        <h3 className="text-slate-800 font-semibold mb-4">Top Assets</h3>
                                        <div className="space-y-3">
                                            {[{ name: 'Bitcoin', symbol: 'BTC', value: '$45K', change: '+4%', color: 'from-orange-400 to-amber-500' }, { name: 'Ethereum', symbol: 'ETH', value: '$28K', change: '+2%', color: 'from-indigo-400 to-blue-500' }, { name: 'Apple', symbol: 'AAPL', value: '$22K', change: '+1%', color: 'from-slate-400 to-gray-500' }, { name: 'Solana', symbol: 'SOL', value: '$18K', change: '+8%', color: 'from-purple-400 to-violet-500' }].map((a, i) => (
                                                <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-r ${a.color} flex items-center justify-center text-white font-bold text-sm`}>{a.symbol[0]}</div>
                                                    <div className="flex-1"><div className="text-slate-800 font-medium text-sm">{a.name}</div><div className="text-slate-400 text-xs">{a.symbol}</div></div>
                                                    <div className="text-right"><div className="text-slate-800 font-medium text-sm">{a.value}</div><div className="text-green-500 text-xs">{a.change}</div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"><span className="bg-primary/80 backdrop-blur text-white text-xs px-2 py-1 rounded shadow-lg">Live CSS</span></div>
                    </div>
                    <div className="bg-gray-50 dark:bg-meta-4 p-6 rounded-lg">
                        <h5 className="font-semibold mb-3">Implemented Layout Features:</h5>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Light-mode elegance with rainbow gradients, soft shadows, and premium card-based layout.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrismHubPage;
