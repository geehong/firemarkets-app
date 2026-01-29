
"use client";

import React, { useEffect, useState } from "react";
import MultipleComparisonChart from "@/components/charts/ohlcvcharts/MultipleComparisonChart";
import { useMacroData } from "@/hooks/analysis/useMacroData";

export default function FundamentalAnalysisView() {
  const { data, loading } = useMacroData();

  if (loading) return <div className="p-10 text-center">Loading Macro Data...</div>;
  if (!data) return <div className="p-10 text-center text-red-500">No Data Available</div>;

  // Helper to convert date string to timestamp
  const toTimestamp = (dateStr: string) => new Date(dateStr).getTime();
  
  const indData = data.indicators || {};

  // 1. Yield Spread & Treasury Data (Grouped)
  // Combine all treasury yields + spread into one chart or similar
  const yieldSpreadSeries: any[] = [];
  
  // From Treasury Data
  const treasuryRaw = data.treasury?.data || [];
  if (treasuryRaw.length > 0) {
      // Map DGS10, DGS2, DGS1, FedFunds
      const dgs10 = treasuryRaw.map((d: any) => [toTimestamp(d.date), d.year10]).filter((p: any) => p[1]).reverse();
      const dgs2 = treasuryRaw.map((d: any) => [toTimestamp(d.date), d.year2]).filter((p: any) => p[1]).reverse();
      const dgs1 = treasuryRaw.map((d: any) => [toTimestamp(d.date), d.year1]).filter((p: any) => p[1]).reverse();
      const fedFunds = treasuryRaw.map((d: any) => [toTimestamp(d.date), d.fed_funds]).filter((p: any) => p[1]).reverse();

      // Yields on Right Axis (1), Spread on Left Axis (0)
      yieldSpreadSeries.push({ name: "10Y Yield", data: dgs10, yAxis: 1 });
      yieldSpreadSeries.push({ name: "2Y Yield", data: dgs2, yAxis: 1 });
      yieldSpreadSeries.push({ name: "1Y Yield", data: dgs1, yAxis: 1 });
      yieldSpreadSeries.push({ name: "Fed Funds Rate", data: fedFunds, yAxis: 1 });
  }
  
  // From Spread Data
  const spreadRaw = data.yield_spread?.data || [];
  if (spreadRaw.length > 0) {
      const spread = spreadRaw.map((d: any) => [toTimestamp(d.date), d.spread]);
      yieldSpreadSeries.push({ name: "10Y-2Y Spread", data: spread, yAxis: 0 });
  }

  // 2. Inflation & Prices
  const inflationSeries: any[] = [];
  if (indData.CPI) inflationSeries.push({ name: "CPI (All Items)", data: indData.CPI.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });
  if (indData.PCE) inflationSeries.push({ name: "PCE Price Index", data: indData.PCE.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });
  if (indData.PPI) inflationSeries.push({ name: "PPI (Final Demand)", data: indData.PPI.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });

  // 3. Labor Market
  const laborSeries: any[] = [];
  if (indData.unemploymentRate) laborSeries.push({ name: "Unemployment Rate (%)", data: indData.unemploymentRate.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });
  // Nonfarm is scale ~150,000. Initial Claims ~200,000. Scale ok for same chart with normalizing off? 
  // No, unemployment is %. Payrolls is absolute numbers. Better to keep % separate or use normalized?
  // User asked for "all". For labor, let's put Unemployment in one chart, and Payrolls/Claims in another or use normalized data.
  // Actually, let's stick to groups.
  if (indData.NonfarmPayrolls) laborSeries.push({ name: "Nonfarm Payrolls (Thousands)", data: indData.NonfarmPayrolls.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });
  if (indData.InitialClaims) laborSeries.push({ name: "Initial Claims", data: indData.InitialClaims.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });

  // 4. Output & Spending (GDP, IndPro, Retail)
  const outputSeries: any[] = [];
  if (indData.GDP) outputSeries.push({ name: "GDP (Billions)", data: indData.GDP.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });
  if (indData.RetailSales) outputSeries.push({ name: "Retail Sales (Millions)", data: indData.RetailSales.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });
  
  // IndPro is index ~100. GDP is ~30,000. Retail is ~700,000. 
  // Visualization without normalization will be hard. 
  // We'll set normalizeData={true} for mixed scale charts by default in these new groups, or separate them.
  // Let's use normalizeData={true} for "Output & Spending" to compare growth trends.
  if (indData.INDPRO) outputSeries.push({ name: "Industrial Production Index", data: indData.INDPRO.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });

  // 5. Money Supply (Already partially done, updating)
  // Re-doing money supply to include just money stock
  // 5. Money Supply (M1 vs M2)
  // User Example: "M1 Right, M2 Left"
  const moneySupplySeries: any[] = [];
  if (indData.M1) moneySupplySeries.push({ name: "M1", data: indData.M1.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });
  if (indData.M2) moneySupplySeries.push({ name: "M2", data: indData.M2.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });
  if (indData.M3) moneySupplySeries.push({ name: "M3", data: indData.M3.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });
  // M2 Growth
   if (indData.m2Growth) {
      moneySupplySeries.push({
          name: "M2 Growth (YoY %)",
          data: indData.m2Growth.map((d: any) => [toTimestamp(d.date), d.value]).reverse()
      });
  }
  
  // 6. Housing & Stress (Percent / Index)
  const financialStressSeries: any[] = [];
  if (indData.Mortgage30Y) financialStressSeries.push({ name: "30Y Fixed Mortgage (%)", data: indData.Mortgage30Y.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });
  if (indData.FinancialStress) financialStressSeries.push({ name: "Financial Stress Index", data: indData.FinancialStress.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });
  if (indData.m2Growth) financialStressSeries.push({ name: "M2 Growth YoY (%)", data: indData.m2Growth.map((d: any) => [toTimestamp(d.date), d.value]).reverse() });


  const description = (
    <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl border border-purple-100 dark:border-purple-800 mb-6">
      <h2 className="text-lg font-bold text-purple-800 dark:text-purple-300 mb-2">Fundamental Analysis</h2>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Comprehensive view of all collected economic indicators including Interest Rates, Inflation, Labor Market, and Economic Output.
      </p>
    </div>
  );

  return (
    <div className="space-y-8">
      {description}
      
      {/* Group 1: Interest Rates (Yields & Spread) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
         <MultipleComparisonChart 
            title="Interest Rates & Yield Spread (%)"
            externalSeries={yieldSpreadSeries} 
            normalizeData={false} 
            height={450} 
            assets={[]} 
         />
      </div>

       {/* Group 2: Inflation & Prices */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
         <MultipleComparisonChart 
            title="Inflation & Prices (Index)"
            externalSeries={inflationSeries} 
            normalizeData={false} 
            independentAxes={true}
            height={400} 
            assets={[]} 
         />
         <p className="mt-2 text-xs text-center text-gray-400">*Independent Scaling for Comparison</p>
      </div>

      {/* Group 3: Labor Market */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <MultipleComparisonChart 
                title="Unemployment (%)"
                externalSeries={laborSeries.filter(s => s.name.includes("Unemployment"))} 
                normalizeData={false} 
                height={350} 
                assets={[]} 
            />
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <MultipleComparisonChart 
                title="Job Market Volume (Claims/Payrolls)"
                externalSeries={laborSeries.filter(s => !s.name.includes("Unemployment"))} 
                normalizeData={false} 
                independentAxes={true}
                height={350} 
                assets={[]} 
            />
            <p className="mt-2 text-xs text-center text-gray-400">*Independent Scaling</p>
      </div>

      {/* Group 4: Money Supply */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
         <MultipleComparisonChart 
            title="Money Supply (M1, M2, M3)"
            externalSeries={moneySupplySeries} 
            normalizeData={false} 
            independentAxes={true}
            height={400} 
            assets={[]} 
         />
         <p className="mt-2 text-xs text-center text-gray-400">*Independent Scaling (Billions vs Percent)</p>
      </div>

      {/* Group 5: Output & Consumption */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
         <MultipleComparisonChart 
            title="Economic Output & Consumption"
            externalSeries={outputSeries} 
            normalizeData={false} 
            independentAxes={true}
            height={400} 
            assets={[]} 
         />
          <p className="mt-2 text-xs text-center text-gray-400">*Independent Scaling (Billions vs Index)</p>
      </div>

      {/* Group 6: Financial Stress & Mortgage */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
         <MultipleComparisonChart 
            title="Financial Stress & Liquidity"
            externalSeries={financialStressSeries} 
            normalizeData={false} 
            independentAxes={true}
            height={350} 
            assets={[]} 
         />
      </div>
    </div>
  );
}
