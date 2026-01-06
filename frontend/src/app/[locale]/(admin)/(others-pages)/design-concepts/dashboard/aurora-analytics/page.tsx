import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Aurora Analytics Concept | FireMarkets",
    description: "Design proposal for Aurora Analytics Dashboard",
};

const AuroraAnalyticsPage = () => {
    return (
        <div className="mx-auto max-w-7xl">
            <PageBreadcrumb pageTitle="Aurora Analytics Concept" />
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
                    <h3 className="font-medium text-black dark:text-white">Design Concept: Aurora Analytics</h3>
                </div>
                <div className="p-6.5 space-y-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-2 text-primary">Aurora Analytics</h2>
                        <p className="text-lg text-gray-500 italic">&quot;Elegant gradient flows with data-rich visualizations.&quot;</p>
                    </div>
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 shadow-2xl group hover:border-primary transition-colors">
                        <div className="w-full h-full bg-slate-950 relative overflow-hidden">
                            {/* Aurora Background */}
                            <div className="absolute inset-0">
                                <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-violet-500/20 via-fuchsia-500/10 to-transparent"></div>
                                <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse"></div>
                                <div className="absolute top-40 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
                            </div>
                            <div className="relative z-10 h-full flex flex-col p-6">
                                {/* Top Bar */}
                                <div className="flex justify-between items-center mb-6">
                                    <h1 className="text-2xl font-light text-white tracking-wide">Aurora<span className="font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Analytics</span></h1>
                                    <div className="flex items-center gap-4">
                                        <div className="flex gap-2">
                                            {['1D', '1W', '1M', '1Y'].map((t, i) => (<button key={t} className={`px-3 py-1 rounded-full text-xs ${i === 2 ? 'bg-white text-slate-900' : 'text-white/60 hover:text-white'}`}>{t}</button>))}
                                        </div>
                                    </div>
                                </div>
                                {/* Main Grid */}
                                <div className="flex-1 grid grid-cols-12 grid-rows-4 gap-4">
                                    {/* Portfolio Value */}
                                    <div className="col-span-4 row-span-1 bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
                                        <div className="text-white/50 text-sm mb-1">Total Portfolio Value</div>
                                        <div className="text-3xl font-light text-white mb-2">$248,540<span className="text-lg text-white/50">.80</span></div>
                                        <div className="flex items-center gap-2"><span className="text-green-400 text-sm">↑ +$24,320</span><span className="text-green-400/50 text-xs">(+10.8%)</span></div>
                                    </div>
                                    {/* Mini Stats */}
                                    {[{ label: 'Crypto', value: '$145K', icon: '₿' }, { label: 'Stocks', value: '$82K', icon: '📈' }, { label: 'ETFs', value: '$21K', icon: '📊' }].map((s, i) => (
                                        <div key={i} className="col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-xl">{s.icon}</div>
                                            <div><div className="text-white/50 text-xs">{s.label}</div><div className="text-white font-medium">{s.value}</div></div>
                                        </div>
                                    ))}
                                    <div className="col-span-2 bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 backdrop-blur-xl rounded-2xl p-4 border border-violet-400/30">
                                        <div className="text-violet-200 text-xs">Performance</div>
                                        <div className="text-white text-2xl font-bold">+28.4%</div>
                                    </div>
                                    {/* Chart Area */}
                                    <div className="col-span-8 row-span-3 bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 relative">
                                        <div className="flex justify-between items-center mb-4"><h3 className="text-white/80">Portfolio Performance</h3></div>
                                        <svg className="w-full h-40" preserveAspectRatio="none">
                                            <defs>
                                                <linearGradient id="aG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#D946EF" /></linearGradient>
                                                <linearGradient id="aF" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" /><stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" /></linearGradient>
                                            </defs>
                                            <path d="M0,120 C50,110 100,90 150,70 S250,40 300,35 S400,25 500,15 S600,30 700,20 S800,12 900,8" fill="url(#aF)" stroke="none" />
                                            <path d="M0,120 C50,110 100,90 150,70 S250,40 300,35 S400,25 500,15 S600,30 700,20 S800,12 900,8" fill="none" stroke="url(#aG)" strokeWidth="3" />
                                        </svg>
                                    </div>
                                    {/* Holdings */}
                                    <div className="col-span-4 row-span-3 bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
                                        <h3 className="text-white/80 mb-4">Top Holdings</h3>
                                        <div className="space-y-3">
                                            {[{ name: 'Bitcoin', symbol: 'BTC', value: '$45K', change: '+5.2%', color: 'from-orange-400 to-yellow-400' }, { name: 'Ethereum', symbol: 'ETH', value: '$32K', change: '+3.8%', color: 'from-violet-400 to-blue-400' }, { name: 'Apple', symbol: 'AAPL', value: '$28K', change: '+1.2%', color: 'from-gray-400 to-gray-200' }, { name: 'Solana', symbol: 'SOL', value: '$18K', change: '+12%', color: 'from-purple-400 to-pink-400' }].map((h, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${h.color} flex items-center justify-center font-bold text-slate-900 text-xs`}>{h.symbol[0]}</div>
                                                    <div className="flex-1"><div className="text-white text-sm">{h.name}</div><div className="text-white/40 text-xs">{h.symbol}</div></div>
                                                    <div className="text-right"><div className="text-white text-sm">{h.value}</div><div className="text-green-400 text-xs">{h.change}</div></div>
                                                </div>
                                            ))}
                                        </div>
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
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Aurora gradient backgrounds, glass panels, smooth data visualizations, and premium portfolio-focused design.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuroraAnalyticsPage;
