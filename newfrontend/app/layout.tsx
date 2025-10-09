import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Sidebar } from "@/components/sidebar"
import { TopNav } from "@/components/top-nav"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SettingsProvider } from "@/contexts/settings-context"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: {
    default: "FireMarkets",
    template: "%s | FireMarkets",
  },
  description: "Real-time market data and analytics dashboard",
  metadataBase: new URL("https://firemarkets.net"),
  openGraph: {
    title: "FireMarkets",
    description: "Real-time market data and analytics dashboard",
    url: "https://firemarkets.net",
    siteName: "FireMarkets",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FireMarkets",
    description: "Real-time market data and analytics dashboard",
  },
}

// Force server-side rendering for all routes by default
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SettingsProvider>
            <TooltipProvider delayDuration={0}>
              <div className="min-h-screen flex">
                <Sidebar />
                <div className="flex-1">
                  <TopNav />
                  <div className="container mx-auto p-6 max-w-7xl">
                    <main className="w-full">{children}</main>
                  </div>
                </div>
              </div>
            </TooltipProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
