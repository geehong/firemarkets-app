import { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'FireMarkets - Advanced Financial Data Platform',
    template: '%s | FireMarkets'
  },
  description: 'Comprehensive financial data platform with real-time market data, advanced analytics, and onchain insights for informed trading decisions.',
  keywords: 'financial data, market analysis, trading, cryptocurrency, stocks, ETFs, onchain analysis, blockchain metrics',
  authors: [{ name: 'FireMarkets Team' }],
  creator: 'FireMarkets',
  publisher: 'FireMarkets',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://firemarkets.net'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://firemarkets.net',
    siteName: 'FireMarkets',
    title: 'FireMarkets - Advanced Financial Data Platform',
    description: 'Comprehensive financial data platform with real-time market data and advanced analytics.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FireMarkets - Financial Data Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FireMarkets - Advanced Financial Data Platform',
    description: 'Comprehensive financial data platform with real-time market data and advanced analytics.',
    images: ['/og-image.png'],
    creator: '@firemarkets',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

import { getNavigationMenu } from '@/lib/data/menus'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigationData = await getNavigationMenu()

  return (
    <html lang="ko">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1f2937" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
