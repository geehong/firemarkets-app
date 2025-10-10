"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { AccountOverview } from "@/components/account-overview"
import { AccountsOverview } from "@/components/accounts-overview"
import { AddMoneyModal } from "@/components/add-money-modal"
import { BudgetTracker } from "@/components/budget-tracker"
import { BusinessMetrics } from "@/components/business-metrics"
import { Content } from "@/components/content"
import { DateRangePicker } from "@/components/date-range-picker"
import { FinancialChart } from "@/components/financial-chart"
import { FunctionModal } from "@/components/function-modal"
import { List01 } from "@/components/list01"
import { List02 } from "@/components/list02"
import { List03 } from "@/components/list03"
import { Modal } from "@/components/modal"
import { ModeToggle } from "@/components/mode-toggle"
import { Notifications } from "@/components/notifications"
import { PaymentModal } from "@/components/payment-modal"
import { ProfileModal } from "@/components/profile-modal"
import { Profile01 } from "@/components/profile01"
import { QuickActions } from "@/components/quick-actions"
import { QuickBillPay } from "@/components/quick-bill-pay"
import { RecentTransactions } from "@/components/recent-transactions"
import { RequestMoneyModal } from "@/components/request-money-modal"
import { SavingsGoals } from "@/components/savings-goals"
import { SendMoneyModal } from "@/components/send-money-modal"
import { Sidebar } from "@/components/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { TopNav } from "@/components/top-nav"
import { TopUpModal } from "@/components/top-up-modal"
import { UpcomingEvents } from "@/components/upcoming-events"

export default function ComponentsGalleryClient() {
  const noop = () => {}
  const items = [
    { title: "AccountOverview", element: <AccountOverview /> },
    { title: "AccountsOverview", element: <AccountsOverview /> },
    { title: "AddMoneyModal", element: <AddMoneyModal isOpen={false} onClose={noop} onAddMoney={noop} /> },
    { title: "BudgetTracker", element: <BudgetTracker /> },
    { title: "BusinessMetrics", element: <BusinessMetrics /> },
    { title: "Content", element: <Content /> },
    { title: "DateRangePicker", element: <DateRangePicker /> },
    { title: "FinancialChart", element: <FinancialChart /> },
    { title: "FunctionModal", element: <FunctionModal title="Do Thing" description="Describe the thing" actionText="Run" icon={<span>⭐</span>} /> },
    { title: "List01", element: <List01 /> },
    { title: "List02", element: <List02 /> },
    { title: "List03", element: <List03 /> },
    { title: "Modal", element: <Modal title="Example" description="Desc" trigger={<button>Open Modal</button>} /> },
    { title: "ModeToggle", element: <ModeToggle /> },
    { title: "Notifications", element: <Notifications /> },
    { title: "PaymentModal", element: <PaymentModal bill={{ name: 'Sample Bill', amount: 100 }} isOpen={false} onClose={noop} onPaymentSuccess={noop} /> },
    { title: "ProfileModal", element: <ProfileModal isOpen={false} onClose={noop} /> },
    { title: "Profile01", element: <Profile01 /> },
    { title: "QuickActions", element: <QuickActions /> },
    { title: "QuickBillPay", element: <QuickBillPay /> },
    { title: "RecentTransactions", element: <RecentTransactions /> },
    { title: "RequestMoneyModal", element: <RequestMoneyModal isOpen={false} onClose={noop} onRequestMoney={noop} /> },
    { title: "SavingsGoals", element: <SavingsGoals /> },
    { title: "SendMoneyModal", element: <SendMoneyModal isOpen={false} onClose={noop} onSendMoney={noop} accounts={[]} /> },
    { title: "Sidebar", element: <Sidebar /> },
    { title: "ThemeToggle", element: <ThemeToggle /> },
    { title: "TopNav", element: <TopNav /> },
    { title: "TopUpModal", element: <TopUpModal isOpen={false} onClose={noop} onTopUp={noop} /> },
    { title: "UpcomingEvents", element: <UpcomingEvents /> },
  ]

  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Components Gallery</h1>
      <div className="grid grid-cols-1 gap-6">
        {items.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.element}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


