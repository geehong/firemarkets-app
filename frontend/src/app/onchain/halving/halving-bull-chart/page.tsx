import { Metadata } from 'next'
import HalvingChart from '@/components/charts/onchaincharts/HalvingChart'

export const metadata: Metadata = {
  title: 'Bitcoin Halving Bull Chart | FireMarkets',
  description: 'Dedicated halving bull chart visualization using onchain halving data.',
  openGraph: {
    title: 'Bitcoin Halving Bull Chart | FireMarkets',
    description: 'Dedicated halving bull chart visualization using onchain halving data.',
    type: 'website',
    url: '/onchain/halving/halving-bull-chart',
  },
  alternates: {
    canonical: '/onchain/halving/halving-bull-chart',
  },
}

export default function HalvingBullChartPage() {
  return (
    
      <main className="container mx-auto px-4 py-8">
        <HalvingChart title="Bitcoin Halving Bull Chart" height={600} />
      </main>
    
  )
}



