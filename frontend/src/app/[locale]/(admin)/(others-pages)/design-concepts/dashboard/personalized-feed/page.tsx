import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personalized Feed Concept | FireMarkets",
  description: "Design proposal for Personalized Feed",
};

const PersonalizedFeedPage = () => {
  return (
    <div className="mx-auto max-w-7xl">
        <PageBreadcrumb pageTitle="Personalized Feed Concept" />

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Design Concept: Personalized Feed
              </h3>
            </div>
            
            <div className="p-6.5 space-y-8">
                {/* Concept Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-primary">Personalized Feed</h2>
                    <p className="text-lg text-gray-500 italic">"Social-media style, customizable cards."</p>
                </div>

                {/* Wireframe / Mockup Container */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col shadow-2xl group hover:border-primary transition-colors">
                    
            <div className="w-full h-full bg-gray-100 dark:bg-gray-900 p-6 overflow-y-auto">
                <div className="columns-3 gap-6 space-y-6">
                    {/* Card 1: Chart */}
                    <div className="break-inside-avoid bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-4 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">B</div>
                                <span className="font-bold dark:text-white">Bitcoin</span>
                            </div>
                            <span className="text-green-500 bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full text-xs">+5.4%</span>
                        </div>
                        <div className="h-32 bg-gray-50 dark:bg-gray-700 rounded-xl mb-4"></div>
                        <div className="flex gap-2 text-sm text-gray-500">
                            <button className="flex-1 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">News</button>
                            <button className="flex-1 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-blue-500">Discuss (42)</button>
                        </div>
                    </div>

                    {/* Card 2: News Image */}
                    <div className="break-inside-avoid bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden">
                        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex items-end p-4">
                             <h3 className="text-white font-bold text-lg leading-tight">Ethereum ETF Approved: What you need to know</h3>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-500">The SEC has finally given the green light...</p>
                        </div>
                    </div>

                    {/* Card 3: Trending */}
                    <div className="break-inside-avoid bg-gradient-to-br from-pink-500 to-orange-500 rounded-3xl shadow-sm p-6 text-white">
                        <div className="text-sm uppercase font-bold opacity-80 mb-2">🔥 Trending Now</div>
                        <div className="text-3xl font-bold mb-1">Solana</div>
                        <div className="text-5xl font-black mb-4">$145.20</div>
                        <button className="w-full bg-white/20 hover:bg-white/30 rounded-xl py-2 backdrop-blur-sm">Trade Now</button>
                    </div>

                     {/* Card 4: Stats */}
                    <div className="break-inside-avoid bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-4">
                         <h4 className="font-bold mb-4 dark:text-white">Your Portfolio</h4>
                         <div className="flex items-end gap-2 h-20">
                             {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                                 <div key={i} className="flex-1 bg-blue-500 rounded-t-sm" style={{height: `${h}%`}}></div>
                             ))}
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
                        This mockup is built entirely with Tailwind CSS to demonstrate the visual hierarchy, color palette, and structural layout of the <strong>Personalized Feed</strong> concept.
                     </p>
                </div>
            </div>
        </div>
      </div>
  );
};

export default PersonalizedFeedPage;
