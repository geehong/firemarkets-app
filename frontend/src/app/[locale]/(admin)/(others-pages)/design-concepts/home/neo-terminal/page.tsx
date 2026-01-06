import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neo-Terminal Concept | FireMarkets",
  description: "Design proposal for Neo-Terminal",
};

const NeoTerminalPage = () => {
  return (
    <div className="mx-auto max-w-7xl">
        <PageBreadcrumb pageTitle="Neo-Terminal Concept" />

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Design Concept: Neo-Terminal
              </h3>
            </div>
            
            <div className="p-6.5 space-y-8">
                {/* Concept Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-primary">Neo-Terminal</h2>
                    <p className="text-lg text-gray-500 italic">"Cyberpunk, futuristic trading tool."</p>
                </div>

                {/* Wireframe / Mockup Container */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col shadow-2xl group hover:border-primary transition-colors">
                    
            <div className="w-full h-full bg-[#050505] flex items-center justify-center relative overflow-hidden perspective-[2000px]">
                {/* Neon Grid Floor */}
                <div className="absolute bottom-0 w-[200%] h-1/2 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [transform:rotateX(60deg)_translateZ(-100px)]"></div>

                {/* Floating Panels */}
                <div className="relative z-10 grid grid-cols-12 grid-rows-6 gap-4 w-3/4 h-3/4 [transform:rotateY(-10deg)_rotateX(5deg)] transition-transform hover:[transform:rotateY(0deg)_rotateX(0deg)] duration-1000">
                    
                    {/* Main Window */}
                    <div className="col-span-8 row-span-4 bg-black/60 backdrop-blur-md border border-cyan-500/50 rounded-lg p-6 flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                        <div className="flex justify-between text-cyan-500 font-mono text-xs mb-4">
                            <span>TERMINAL_V.2.0</span>
                            <span className="animate-pulse">CONNECTED</span>
                        </div>
                        <div className="text-6xl font-black text-white italic">TRADE <span className="text-cyan-400">FUTURE</span></div>
                        <div className="mt-auto flex gap-4">
                             <div className="bg-cyan-900/40 text-cyan-300 px-4 py-2 rounded border border-cyan-500/30">L: 1.2ms</div>
                             <div className="bg-cyan-900/40 text-cyan-300 px-4 py-2 rounded border border-cyan-500/30">Uptime: 99.9%</div>
                        </div>
                    </div>

                    {/* Side Data */}
                    <div className="col-span-4 row-span-3 bg-black/80 border border-fuchsia-500/50 rounded-lg p-4 font-mono text-fuchsia-400 text-xs overflow-hidden">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="mb-2 border-b border-fuchsia-500/20 pb-1">
                                TX_HASH_{1000+i} .... CONFIRMED
                            </div>
                        ))}
                    </div>

                    {/* Bottom Action */}
                    <div className="col-span-12 row-span-2 bg-gradient-to-r from-cyan-600 to-blue-700 rounded-lg flex items-center justify-between px-12 border border-white/20">
                         <span className="text-3xl font-bold text-white">GET STARTED NOW</span>
                         <div className="h-12 w-12 rounded-full border-2 border-white flex items-center justify-center">→</div>
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
                        This mockup is built entirely with Tailwind CSS to demonstrate the visual hierarchy, color palette, and structural layout of the <strong>Neo-Terminal</strong> concept.
                     </p>
                </div>
            </div>
        </div>
      </div>
  );
};

export default NeoTerminalPage;
