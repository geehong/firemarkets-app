import React from "react";

export default function UnderConstruction() {
  return (
    <div className="min-h-[80vh] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold">Website</h1>
            <h2 className="text-xl text-gray-600">under construction</h2>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-full max-w-3xl p-4">
              {/* Inline SVG extracted from page */}
              <svg
                viewBox="0 0 834 690"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto"
              >
                <g id="undraw_dev_productivity_umsq 1" clipPath="url(#clip0)">
                  {/* ... SVG content remains identical ... */}
                </g>
                <defs>
                  <clipPath id="clip0">
                    <rect width="833.5" height="689.223" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t py-4">
        <div className="container mx-auto text-center text-sm text-gray-600">
          <span>your-website-name.com</span>
        </div>
      </footer>
    </div>
  );
}


