import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Earth Concept | FireMarkets",
  description: "Design proposal for Live Earth",
};

const LiveEarthPage = () => {
  return (
    <div className="mx-auto max-w-none">
        <PageBreadcrumb pageTitle="Live Earth Concept" />

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Design Concept: Live Earth
              </h3>
            </div>
            
            <div className="p-6.5 space-y-8">
                {/* Concept Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-primary">Live Earth</h2>
                    <p className="text-lg text-gray-500 italic">"Global scale visualization."</p>
                </div>

                {/* Wireframe / Mockup Container */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col shadow-2xl group hover:border-primary transition-colors">
                    
             <div className="w-full h-full bg-black flex items-center justify-center relative overflow-hidden">
                {/* Stars Background */}
                <div className="absolute inset-0 opacity-50" style={{backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '50px 50px'}}></div>
                
                {/* Globe */}
                <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-900 to-black relative shadow-[0_0_100px_rgba(59,130,246,0.5)] flex items-center justify-center">
                    {/* Continents overlay placeholder */}
                    <div className="opacity-30 blur-sm text-9xl">🌏</div>
                    
                    {/* Light Pillars */}
                    <div className="absolute top-1/4 left-1/4 w-1 h-32 bg-green-400 shadow-[0_0_20px_#4ade80] animate-bounce"></div>
                    <div className="absolute bottom-1/3 right-1/3 w-1 h-20 bg-red-400 shadow-[0_0_20px_#f87171] animate-pulse"></div>
                    <div className="absolute top-1/2 left-2/3 w-1 h-48 bg-blue-400 shadow-[0_0_20px_#60a5fa] animate-pulse delay-75"></div>
                </div>

                {/* Hero Text */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-10 mix-blend-difference">
                    <h1 className="text-8xl font-black text-white tracking-tighter mb-4">GLOBAL LIVE.</h1>
                    <p className="text-xl text-gray-400 tracking-[0.5em]">FASTEST MARKET DATA NETWORK</p>
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
                        This mockup is built entirely with Tailwind CSS to demonstrate the visual hierarchy, color palette, and structural layout of the <strong>Live Earth</strong> concept.
                     </p>
                </div>
            </div>
        </div>
      </div>
  );
};

export default LiveEarthPage;
