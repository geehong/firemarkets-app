import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Command Center Concept | FireMarkets",
  description: "Design proposal for Command Center",
};

const CommandCenterPage = () => {
  return (
    <div className="mx-auto max-w-none">
        <PageBreadcrumb pageTitle="Command Center Concept" />

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Design Concept: Command Center
              </h3>
            </div>
            
            <div className="p-6.5 space-y-8">
                {/* Concept Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-primary">Command Center</h2>
                    <p className="text-lg text-gray-500 italic">"Information-dense, professional, Bloomberg-style."</p>
                </div>

                {/* Wireframe / Mockup Container */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col shadow-2xl group hover:border-primary transition-colors">
                    
            <div className="w-full h-full bg-gray-950 text-xs text-green-400 font-mono flex flex-col">
                {/* Top Nav */}
                <div className="h-8 border-b border-gray-800 flex items-center px-4 bg-gray-900">
                    <span className="font-bold text-white mr-4">FIRE.TERMINAL</span>
                    <div className="space-x-4 text-gray-500">
                        <span>MARKETS</span><span>NEWS</span><span>ANALYTICS</span>
                    </div>
                </div>
                
                {/* Main Grid */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Orderbook */}
                    <div className="w-1/5 border-r border-gray-800 flex flex-col p-2 space-y-1">
                        <div className="text-white bg-gray-900 p-1 mb-2">ORDER BOOK</div>
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="flex justify-between opactiy-80">
                                <span>{10000 + i * 5}</span>
                                <span className="text-white">{i % 2 === 0 ? '0.45' : '1.2'}</span>
                            </div>
                        ))}
                    </div>

                    {/* Center: 4x Charts */}
                    <div className="w-3/5 flex flex-wrap border-r border-gray-800">
                        {['BTC/USD', 'ETH/USD', 'NQ100', 'XAU/USD'].map((ticker) => (
                            <div key={ticker} className="w-1/2 h-1/2 border-b border-r border-gray-800 p-2 relative group hover:bg-gray-900 transition-colors">
                                <div className="absolute top-2 left-2 font-bold text-white">{ticker}</div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40">
                                    <svg viewBox="0 0 100 50" className="w-full h-full stroke-green-500 fill-none" strokeWidth="2">
                                        <path d="M0,50 Q25,0 50,25 T100,10" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: News */}
                    <div className="w-1/5 flex flex-col p-2 bg-gray-900">
                        <div className="text-white mb-2 pb-1 border-b border-gray-700">AI FEED</div>
                        <div className="space-y-4">
                             {[1,2,3].map(i => (
                                <div key={i} className="border-l-2 border-yellow-500 pl-2">
                                    <div className="text-gray-400 mb-1">12:0{i}:45</div>
                                    <div className="text-white leading-tight">Fed announces new rate hike expectations...</div>
                                </div>
                             ))}
                        </div>
                    </div>
                </div>

                {/* Bottom: Ticker Tape */}
                <div className="h-8 border-t border-gray-800 bg-black flex items-center overflow-hidden whitespace-nowrap">
                   <div className="animate-marquee-ltr flex space-x-8 px-4">
                        {[...Array(10)].map((_, i) => (
                            <span key={i} className="flex space-x-2">
                                <span className="text-white">BTC</span>
                                <span className="text-green-500">+1.2%</span>
                            </span>
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
                        This mockup is built entirely with Tailwind CSS to demonstrate the visual hierarchy, color palette, and structural layout of the <strong>Command Center</strong> concept.
                     </p>
                </div>
            </div>
        </div>
      </div>
  );
};

export default CommandCenterPage;
