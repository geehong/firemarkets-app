import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Driven Concept | FireMarkets",
  description: "Design proposal for Community Driven",
};

const CommunityDrivenPage = () => {
  return (
    <div className="mx-auto max-w-7xl">
        <PageBreadcrumb pageTitle="Community Driven Concept" />

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Design Concept: Community Driven
              </h3>
            </div>
            
            <div className="p-6.5 space-y-8">
                {/* Concept Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-primary">Community Driven</h2>
                    <p className="text-lg text-gray-500 italic">"Social proof and live activity."</p>
                </div>

                {/* Wireframe / Mockup Container */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col shadow-2xl group hover:border-primary transition-colors">
                    
            <div className="w-full h-full bg-gray-900 flex text-white font-sans">
                {/* Left: Lifestyle / Hero */}
                <div className="w-1/2 p-12 flex flex-col justify-center relative overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=1000&auto=format&fit=crop" alt="Trading Lifestyle" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                    <div className="relative z-10">
                        <div className="bg-green-500 text-black font-extrabold inline-block px-4 py-1 skew-x-[-10deg] mb-6 shadow-[5px_5px_0px_white]">LIVE NOW</div>
                        <h1 className="text-6xl font-black mb-6 leading-none">JOIN<br/>THE<br/>WINNING<br/>SIDE.</h1>
                        <p className="text-xl opacity-80 mb-8">Don't trade alone. See what 12,000+ traders are buying right now.</p>
                        <div className="flex -space-x-4">
                            {[1,2,3,4,5].map(i => <div key={i} className="w-12 h-12 rounded-full border-2 border-gray-900 bg-gray-700"></div>)}
                            <div className="w-12 h-12 rounded-full border-2 border-gray-900 bg-green-500 text-black flex items-center justify-center font-bold text-xs">+12k</div>
                        </div>
                    </div>
                </div>

                {/* Right: Chat / Feed */}
                <div className="w-1/2 bg-gray-800 border-l border-gray-700 flex flex-col">
                    <div className="h-16 border-b border-gray-700 flex items-center justify-between px-6 bg-gray-800">
                        <span className="font-bold">🔥 Hot Topics</span>
                        <span className="text-green-400 text-sm">● 4,302 Online</span>
                    </div>
                    
                    {/* Poll Widget */}
                    <div className="p-6 bg-gray-900/50 m-4 rounded-xl border border-gray-700">
                        <div className="text-sm font-bold mb-4 text-gray-300">POLL: Will BTC hit 100k in 2024?</div>
                        <div className="space-y-2">
                             <div className="h-8 bg-green-900/50 rounded flex items-center px-4 justify-between relative overflow-hidden">
                                 <div className="absolute left-0 top-0 bottom-0 bg-green-500/20 w-[75%]"></div>
                                 <span className="relative z-10 font-bold text-green-400">YES</span>
                                 <span className="relative z-10">75%</span>
                             </div>
                             <div className="h-8 bg-red-900/50 rounded flex items-center px-4 justify-between relative overflow-hidden">
                                 <div className="absolute left-0 top-0 bottom-0 bg-red-500/20 w-[25%]"></div>
                                 <span className="relative z-10 font-bold text-red-400">NO</span>
                                 <span className="relative z-10">25%</span>
                             </div>
                        </div>
                    </div>

                    {/* Chat Stream */}
                    <div className="flex-1 overflow-hidden p-6 space-y-4">
                        {[
                            {u: 'ElonFan', m: 'Doge to the moon! 🚀', c: 'text-yellow-400'},
                            {u: 'TraderPro', m: 'Shorting this resistance.', c: 'text-blue-400'},
                            {u: 'WhaleWatcher', m: 'Large inflow detected on Binance.', c: 'text-purple-400'},
                            {u: 'Newbie101', m: 'Is it good time to buy?', c: 'text-gray-400'}
                        ].map((msg, i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-8 h-8 rounded bg-gray-700"></div>
                                <div>
                                    <div className={`text-xs font-bold ${msg.c}`}>{msg.u}</div>
                                    <div className="text-sm text-gray-300">{msg.m}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        
                    
                     {/* Interactive Overlay Hint */}
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                         <span className="bg-primary/80 backdrop-blur text-white text-xs px-2 py-1 rounded shadow-lg">Live CSS Mockup</span>
                    </div>
                </div>

                {/* Description Text */}
                <div className="bg-gray-50 dark:bg-meta-4 p-6 rounded-lg">
                    <h5 className="font-semibold mb-3">Implemented Layout Features:</h5>
                     <p className="text-gray-600 dark:text-gray-300 text-sm">
                        This mockup is built entirely with Tailwind CSS to demonstrate the visual hierarchy, color palette, and structural layout of the <strong>Community Driven</strong> concept.
                     </p>
                </div>
            </div>
        </div>
      </div>
  );
};

export default CommunityDrivenPage;
