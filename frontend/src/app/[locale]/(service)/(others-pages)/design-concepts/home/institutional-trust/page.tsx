import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Institutional Trust Concept | FireMarkets",
  description: "Design proposal for Institutional Trust",
};

const InstitutionalTrustPage = () => {
  return (
    <div className="mx-auto max-w-none">
        <PageBreadcrumb pageTitle="Institutional Trust Concept" />

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Design Concept: Institutional Trust
              </h3>
            </div>
            
            <div className="p-6.5 space-y-8">
                {/* Concept Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-primary">Institutional Trust</h2>
                    <p className="text-lg text-gray-500 italic">"Clean, high-trust, banking aesthetic."</p>
                </div>

                {/* Wireframe / Mockup Container */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col shadow-2xl group hover:border-primary transition-colors">
                    
            <div className="w-full h-full bg-white flex flex-col relative">
                {/* Navbar */}
                <div className="h-20 border-b border-gray-100 flex items-center justify-between px-12">
                    <div className="text-2xl font-serif font-bold text-slate-800">FireMarkets.</div>
                    <div className="space-x-8 text-sm font-medium text-slate-600">
                        <span>Solutions</span><span>Research</span><span>Institutional</span><span className="bg-slate-900 text-white px-4 py-2 rounded-sm">Contact Sales</span>
                    </div>
                </div>

                {/* Main */}
                <div className="flex-1 flex items-center px-12 gap-12">
                    <div className="w-1/2 space-y-8">
                        <div className="inline-block bg-slate-100 text-slate-600 px-3 py-1 text-xs font-bold tracking-widest uppercase">Enterprise Grade</div>
                        <h1 className="text-7xl font-bold text-slate-900 leading-tight">
                            Precision in <br/>Every Tick.
                        </h1>
                        <p className="text-xl text-slate-500 max-w-md leading-relaxed">
                            Trusted by 10,000+ financial institutions worldwide. The fastest data infrastructure for modern markets.
                        </p>
                        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                            <div>
                                <div className="text-4xl font-bold text-slate-900">0.05ms</div>
                                <div className="text-sm text-slate-500 uppercase tracking-wider">Latency</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-slate-900">$50B+</div>
                                <div className="text-sm text-slate-500 uppercase tracking-wider">Daily Volume</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Abstract Visual */}
                    <div className="w-1/2 h-[500px] bg-slate-50 rounded-tr-[100px] overflow-hidden relative p-12">
                         <div className="w-full h-full bg-white shadow-2xl rounded-lg p-6 flex flex-col border border-gray-100">
                             {/* Mock Graph */}
                             <div className="flex-1 flex items-end space-x-2">
                                {[30, 40, 35, 50, 45, 60, 55, 70, 65, 80, 75, 90, 85].map((h, i) => (
                                    <div key={i} className="flex-1 bg-slate-800" style={{height: `${h}%`}}></div>
                                ))}
                             </div>
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
                        This mockup is built entirely with Tailwind CSS to demonstrate the visual hierarchy, color palette, and structural layout of the <strong>Institutional Trust</strong> concept.
                     </p>
                </div>
            </div>
        </div>
      </div>
  );
};

export default InstitutionalTrustPage;
