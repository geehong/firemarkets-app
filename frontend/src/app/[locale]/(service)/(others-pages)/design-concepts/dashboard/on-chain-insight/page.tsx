import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "On-Chain Insight Concept | FireMarkets",
  description: "Design proposal for On-Chain Insight",
};

const OnChainInsightPage = () => {
  return (
    <div className="mx-auto max-w-none">
        <PageBreadcrumb pageTitle="On-Chain Insight Concept" />

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Design Concept: On-Chain Insight
              </h3>
            </div>
            
            <div className="p-6.5 space-y-8">
                {/* Concept Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-primary">On-Chain Insight</h2>
                    <p className="text-lg text-gray-500 italic">"Data-driven analysis layout."</p>
                </div>

                {/* Wireframe / Mockup Container */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col shadow-2xl group hover:border-primary transition-colors">
                    
            <div className="w-full h-full bg-[#0B1120] text-gray-300 p-4 font-sans">
                {/* Top Gauges */}
                <div className="grid grid-cols-4 gap-4 mb-4 h-32">
                    {['MVRV Z-Score', 'Fear & Greed', 'Exchange Reserve', 'Hash Rate'].map((title, i) => (
                        <div key={i} className="bg-[#151E32] rounded-lg p-3 relative overflow-hidden border border-gray-800">
                             <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">{title}</div>
                             <div className="absolute bottom-[-20px] right-[-20px] w-24 h-24 rounded-full border-4 border-blue-500/20"></div>
                             <div className="text-3xl font-bold text-white mt-4">{70 + i * 5}</div>
                        </div>
                    ))}
                </div>

                {/* Main Analysis Area */}
                <div className="flex h-[400px] gap-4">
                     {/* Chart */}
                     <div className="flex-1 bg-[#151E32] rounded-lg border border-gray-800 p-4 relative">
                        {/* Grid lines */}
                        <div className="absolute inset-4 grid grid-cols-6 grid-rows-4 gap-4 pointer-events-none opacity-10">
                             {[...Array(24)].map((_, i) => <div key={i} className="border border-gray-100"></div>)}
                        </div>
                        {/* Chart Line with Overlay */}
                        <svg className="w-full h-full" preserveAspectRatio="none">
                            <path d="M0,350 C100,300 200,380 300,200 S500,100 800,50" fill="none" stroke="white" strokeWidth="2" />
                            <path d="M0,380 C100,350 200,300 300,250 S500,200 800,150" fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="5,5" />
                        </svg>
                        <div className="absolute top-4 right-4 flex flex-col gap-2">
                             <span className="text-xs text-white">● Price</span>
                             <span className="text-xs text-yellow-500">--- Realized Price</span>
                        </div>
                     </div>
                     
                     {/* Right Signal Box */}
                     <div className="w-64 bg-[#1e1414] rounded-lg border border-red-900/50 p-4 animate-pulse">
                        <div className="text-red-500 font-bold mb-4 flex items-center gap-2">
                            <span>⚠️ ALERT</span>
                        </div>
                        <div className="text-sm text-gray-400">
                            High Whale Accumulation Detected.
                            <br/><br/>
                            Exchange Inflow spike &gt; 2000 BTC
                        </div>
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
                        This mockup is built entirely with Tailwind CSS to demonstrate the visual hierarchy, color palette, and structural layout of the <strong>On-Chain Insight</strong> concept.
                     </p>
                </div>
            </div>
        </div>
      </div>
  );
};

export default OnChainInsightPage;
