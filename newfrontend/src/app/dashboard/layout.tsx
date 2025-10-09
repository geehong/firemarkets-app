import { SidebarProvider } from "@/components/dashboard/sidebar"
import TopNavbar from "@/components/layout/dynamic-top-navbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <TopNavbar />
      <div className="flex">
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </div>
    </div>
  )
}
