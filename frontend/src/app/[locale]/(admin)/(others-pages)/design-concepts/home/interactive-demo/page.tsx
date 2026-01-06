import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interactive Demo Concept | FireMarkets",
  description: "Design proposal for Interactive Demo",
};

const InteractiveDemoPage = () => {
  return (
    <div className="mx-auto max-w-7xl">
        <PageBreadcrumb pageTitle="Interactive Demo Concept" />

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Design Concept: Interactive Demo
              </h3>
            </div>
            
            <div className="p-6.5 space-y-8">
                {/* Concept Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-primary">Interactive Demo</h2>
                    <p className="text-lg text-gray-500 italic">"Product-led growth, immediate value."</p>
                </div>

                {/* Wireframe / Mockup Container */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col shadow-2xl group hover:border-primary transition-colors">
                    
            <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                {/* Blurred Background Video Placeholder */}
                <div className="absolute inset-0 opacity-10 blur-md scale-110">
                     <div className="grid grid-cols-10 grid-rows-10 w-full h-full">
                         {[...Array(100)].map((_, i) => <div key={i} className={`bg-${Math.random() > 0.5 ? 'green' : 'red'}-500/40 m-1`}></div>)}
                     </div>
                </div>

                <div className="relative z-10 w-full max-w-2xl text-center">
                    <h1 className="text-5xl font-bold text-gray-900 mb-8">Just Search. We track everything.</h1>
                    
                    {/* The Giant Search Bar */}
                    <div className="bg-white rounded-full shadow-2xl p-2 flex items-center pl-8 transform hover:scale-105 transition-transform duration-300">
                        <span className="text-xl text-gray-400 mr-4">🔍</span>
                        <span className="text-2xl text-gray-800 font-medium border-r border-gray-200 pr-4 mr-4 animate-pulse">AAPL|</span>
                        <input className="flex-1 text-2xl outline-none bg-transparent" placeholder="Type any ticker..." disabled />
                        <button className="bg-blue-600 text-white rounded-full px-8 py-4 font-bold hover:bg-blue-700">Go</button>
                    </div>

                    {/* Pop-up result mock */}
                    <div className="mt-8 mx-auto w-3/4 bg-white rounded-xl shadow-xl p-4 flex items-center justify-between border border-gray-200 animate-[bounce_3s_infinite]">
                        <div className="flex items-center gap-4">
                            <div className="bg-gray-100 p-2 rounded-lg">🍎</div>
                            <div className="text-left">
                                <div className="font-bold">Apple Inc.</div>
                                <div className="text-xs text-gray-500">NASDAQ</div>
                            </div>
                        </div>
                         <div className="text-right">
                                <div className="font-bold text-green-600 text-xl">$185.34</div>
                                <div className="text-xs text-green-600">+1.23% Today</div>
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
                        This mockup is built entirely with Tailwind CSS to demonstrate the visual hierarchy, color palette, and structural layout of the <strong>Interactive Demo</strong> concept.
                     </p>
                </div>
            </div>
        </div>
      </div>
  );
};

export default InteractiveDemoPage;
