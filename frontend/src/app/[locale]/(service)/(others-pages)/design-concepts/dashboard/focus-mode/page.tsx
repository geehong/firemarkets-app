import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Focus Mode Concept | FireMarkets",
  description: "Design proposal for Focus Mode",
};

const FocusModePage = () => {
  return (
    <div className="mx-auto max-w-none">
        <PageBreadcrumb pageTitle="Focus Mode Concept" />

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Design Concept: Focus Mode
              </h3>
            </div>
            
            <div className="p-6.5 space-y-8">
                {/* Concept Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-primary">Focus Mode</h2>
                    <p className="text-lg text-gray-500 italic">"Minimalist, Zen-like focus on one asset."</p>
                </div>

                {/* Wireframe / Mockup Container */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col shadow-2xl group hover:border-primary transition-colors">
                    
            <div className="w-full h-full bg-black relative flex flex-col items-center justify-center overflow-hidden">
                {/* Aurora Background */}
                <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-gradient-to-br from-purple-900/30 via-black to-blue-900/30 blur-3xl opacity-50"></div>

                {/* Main Content */}
                <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
                     <h1 className="text-6xl font-thin text-white mb-2 tracking-widest">BTC / USD</h1>
                     <div className="text-2xl text-gray-400 mb-12 font-light">$65,120.50</div>

                     {/* Giant Minimal Chart */}
                     <div className="w-full h-64 flex items-end justify-between space-x-1 px-8 mb-12 opacity-80">
                        {/* Simulated Candles */}
                        {[...Array(30)].map((_, i) => {
                             const h = Math.random() * 80 + 20;
                             const color = Math.random() > 0.4 ? 'bg-white' : 'bg-gray-600';
                             return <div key={i} className={`w-full rounded-sm ${color} transition-all duration-1000`} style={{ height: `${h}%` }}></div>
                        })}
                     </div>

                     {/* Minimal Bottom Bar */}
                     <div className="w-full h-16 border-t border-white/10 flex items-center justify-center space-x-10 text-white/40">
                        {['1H', '4H', '1D', '1W'].map(t => <span key={t} className="hover:text-white cursor-pointer hover:scale-125 transition-transform">{t}</span>)}
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
                        This mockup is built entirely with Tailwind CSS to demonstrate the visual hierarchy, color palette, and structural layout of the <strong>Focus Mode</strong> concept.
                     </p>
                </div>
            </div>
        </div>
      </div>
  );
};

export default FocusModePage;
