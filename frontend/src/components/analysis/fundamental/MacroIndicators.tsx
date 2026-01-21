
"use client";

import React from "react";

interface MacroIndicatorsProps {
  indicators: {
    GDP: any[];
    CPI: any[];
    unemploymentRate: any[];
  };
}

export default function MacroIndicators({ indicators }: MacroIndicatorsProps) {
  const gdpData = indicators?.GDP || [];
  const cpiData = indicators?.CPI || [];
  const unemploymentData = indicators?.unemploymentRate || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GDP Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
           <h4 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Latest GDP</h4>
           <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
             {gdpData[0]?.value ? `$${(gdpData[0].value).toLocaleString()}B` : 'N/A'}
           </div>
           <div className="text-sm text-gray-500 mt-1">{gdpData[0]?.date}</div>
        </div>

         {/* CPI Card */}
         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
           <h4 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">CPI (Inflation)</h4>
           <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
             {cpiData[0]?.value ? `${cpiData[0].value}` : 'N/A'}
           </div>
           <div className="text-sm text-gray-500 mt-1">{cpiData[0]?.date}</div>
        </div>

        {/* Unemployment Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
           <h4 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Unemployment Rate</h4>
           <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
             {unemploymentData[0]?.value ? `${unemploymentData[0].value}%` : 'N/A'}
           </div>
           <div className="text-sm text-gray-500 mt-1">{unemploymentData[0]?.date}</div>
        </div>
    </div>
  );
}
