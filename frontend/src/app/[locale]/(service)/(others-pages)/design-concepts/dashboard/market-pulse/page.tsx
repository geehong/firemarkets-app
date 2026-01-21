import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Pulse Concept | FireMarkets",
  description: "Design proposal for Market Pulse",
};

const MarketPulsePage = () => {
  return (
    <div className="mx-auto max-w-none">
        <PageBreadcrumb pageTitle="Market Pulse Concept" />

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Design Concept: Market Pulse
              </h3>
            </div>
            
            <div className="p-6.5 space-y-8">
                {/* Concept Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-primary">Market Pulse</h2>
                    <p className="text-lg text-gray-500 italic">"Visualization-centric, color-coded heatmaps."</p>
                </div>

                {/* Wireframe / Mockup Container */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col shadow-2xl group hover:border-primary transition-colors">
                    
            <div className="w-full h-full bg-slate-900 text-white flex flex-col p-6">
                {/* Header Tabs */}
                <div className="flex space-x-6 mb-6 text-xl font-light">
                    <span className="border-b-2 border-white pb-1">Crypto</span>
                    <span className="text-slate-500 hover:text-white transition-colors cursor-pointer">Stocks</span>
                    <span className="text-slate-500 hover:text-white transition-colors cursor-pointer">ETFs</span>
                </div>

                <div className="flex-1 flex gap-6">
                    {/* Main Treemap Area */}
                    <div className="flex-1 rounded-2xl overflow-hidden bg-slate-800 relative flex flex-wrap content-start">
                        <div className="absolute inset-0 animate-pulse bg-green-500/10 z-0"></div>
                        {/* Simulated Treemap Blocks */}
                        <div className="w-2/3 h-2/3 bg-green-600 border border-slate-900 p-4 flex items-center justify-center text-4xl font-bold hover:brightness-110 cursor-pointer transition-all">BTC +5%</div>
                        <div className="w-1/3 h-2/3 bg-red-500 border border-slate-900 p-4 flex items-center justify-center text-2xl font-bold">ETH -2%</div>
                        <div className="w-1/3 h-1/3 bg-green-500 border border-slate-900 p-2 flex items-center justify-center text-xl">SOL</div>
                        <div className="w-1/3 h-1/3 bg-green-700 border border-slate-900 p-2 flex items-center justify-center text-xl">BNB</div>
                        <div className="w-1/3 h-1/3 bg-red-600 border border-slate-900 p-2 flex items-center justify-center text-xl">XRP</div>
                    </div>

                    {/* Right Detail Panel */}
                    <div className="w-80 bg-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col">
                        <div className="h-32 bg-slate-700 rounded-xl mb-4 animate-pulse"></div>
                        <h3 className="text-2xl font-bold mb-2">Bitcoin</h3>
                        <div className="text-4xl font-mono mb-4 text-green-400">$64,230</div>
                        <div className="space-y-2 mt-auto">
                           <div className="h-2 bg-slate-600 rounded w-full"></div>
                           <div className="h-2 bg-slate-600 rounded w-2/3"></div>
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
                        This mockup is built entirely with Tailwind CSS to demonstrate the visual hierarchy, color palette, and structural layout of the <strong>Market Pulse</strong> concept.
                     </p>
                </div>
            </div>
        </div>
      </div>
  );
};

export default MarketPulsePage;
