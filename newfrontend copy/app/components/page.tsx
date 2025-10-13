export const revalidate = 600

import ComponentsGalleryClient from "@/components/ComponentsGalleryClient"
import { AccountsOverview } from "@/components/accounts-overview"
import { RecentTransactions } from "@/components/recent-transactions"
import { BusinessMetrics } from "@/components/business-metrics"
import { QuickBillPay } from "@/components/quick-bill-pay"

export default function ComponentsGalleryPage() {
  return (
    <div className="container mx-auto py-10 space-y-10">
      {/* Server-rendered key sections for SEO */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AccountsOverview />
        </div>
        <div className="lg:col-span-1">
          <RecentTransactions />
        </div>
        <div className="lg:col-span-1">
          <QuickBillPay />
        </div>
      </section>
      <BusinessMetrics />

      {/* Client gallery for interactive/demo components */}
      <ComponentsGalleryClient />
    </div>
  )
}


