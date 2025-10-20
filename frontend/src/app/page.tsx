import type { Metadata } from "next";
import React from "react";
// import UnderConstruction from "@/components/blank/UnderConstruction";
import ClientLayout from "@/components/layout/ClientLayout";

export const metadata: Metadata = {
  title: "FireMarkets - Advanced Financial Data Platform",
  description: "Comprehensive financial data platform with real-time market data, advanced analytics, and onchain insights for informed trading decisions.",
};

export default function HomePage() {
  console.log('🔍 [SSR DEBUG] HomePage rendering on server')
  console.log('🔍 [SSR DEBUG] NODE_ENV:', process.env.NODE_ENV)
  console.log('🔍 [SSR DEBUG] BACKEND_API_BASE:', process.env.BACKEND_API_BASE)
  
  return (
    <ClientLayout>
      <main className="container mx-auto px-4 py-8">
        {/* SEO Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "FireMarkets",
              "description": "Advanced Financial Data Platform with real-time market data, analytics, and onchain insights",
              "url": "https://firemarkets.net",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://firemarkets.net/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        
        <div className="text-center space-y-8">
          {/* Hero Section with SEO Elements */}
          <header className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white">
              FireMarkets - Advanced Financial Data Platform
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-600 dark:text-gray-300">
              Real-time Market Data & Onchain Analysis
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-3xl mx-auto">
              Comprehensive financial data platform with real-time market data, advanced analytics, 
              and onchain insights for informed trading decisions. Access live data for stocks, 
              cryptocurrencies, ETFs, and commodities with professional-grade analysis tools.
            </p>
          </header>

          {/* Features Grid with SEO Structure */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12" aria-labelledby="features-heading">
            <h2 id="features-heading" className="sr-only">Platform Features</h2>
            
            <article className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-3xl mb-4" aria-hidden="true">📊</div>
              <h3 className="text-xl font-semibold mb-2">Real-time Market Data</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Live market data for stocks, cryptocurrencies, ETFs, and commodities with real-time price updates. 
                Professional-grade data feeds for institutional and retail traders.
              </p>
            </article>
            
            <article className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-3xl mb-4" aria-hidden="true">🔗</div>
              <h3 className="text-xl font-semibold mb-2">Onchain Analysis</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Advanced blockchain metrics and correlation analysis for Bitcoin and cryptocurrency markets. 
                Track network health, miner behavior, and institutional activity.
              </p>
            </article>
            
            <article className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-3xl mb-4" aria-hidden="true">📈</div>
              <h3 className="text-xl font-semibold mb-2">Advanced Charts</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Interactive charts with technical indicators, volume analysis, and historical data visualization. 
                Professional trading tools for market analysis and decision making.
              </p>
            </article>
          </section>

          {/* CTA Section with SEO Structure */}
          <section className="mt-12 space-y-4" aria-labelledby="cta-heading">
            <h2 id="cta-heading" className="text-2xl font-semibold">Get Started with FireMarkets</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Start your financial data journey with our comprehensive platform. 
              Access real-time market data, advanced analytics, and professional trading tools.
            </p>
            <nav className="flex flex-col sm:flex-row gap-4 justify-center" aria-label="Main navigation">
              <a 
                href="/assets" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                aria-label="Explore financial assets and market data"
              >
                Explore Assets
              </a>
              <a 
                href="/onchain" 
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                aria-label="Access onchain analysis and blockchain metrics"
              >
                Onchain Analysis
              </a>
              <a 
                href="/blog" 
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                aria-label="Read financial market insights and analysis"
              >
                Read Blog
              </a>
            </nav>
          </section>
        </div>
      </main>
    </ClientLayout>
  );
}
