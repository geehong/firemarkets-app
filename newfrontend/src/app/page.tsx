"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import TopNavbar from "@/components/layout/dynamic-top-navbar"
import { 
  TrendingUp, 
  BarChart3, 
  Building2, 
  PieChart,
  ArrowRight,
  Star
} from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <TopNavbar />

      {/* Hero Section */}
      <section className="container py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <Badge variant="secondary" className="mb-4">
            <Star className="h-3 w-3 mr-1" />
            Real-time Financial Data
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
            Your Gateway to{" "}
            <span className="text-primary">Financial Markets</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Access real-time stock, crypto, and ETF data with advanced analytics, 
            charts, and portfolio management tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto">
                Explore Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/assets">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Browse Assets
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Everything you need for market analysis
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools and data to make informed investment decisions
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Building2 className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Asset Management</CardTitle>
              <CardDescription>
                Track stocks, cryptocurrencies, and ETFs with real-time data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Real-time price updates</li>
                <li>• Market cap tracking</li>
                <li>• Volume analysis</li>
                <li>• Historical data</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Advanced Analytics</CardTitle>
              <CardDescription>
                Powerful charts and technical indicators for market analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Interactive charts</li>
                <li>• Technical indicators</li>
                <li>• On-chain metrics</li>
                <li>• Performance tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <PieChart className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Portfolio Management</CardTitle>
              <CardDescription>
                Monitor your investments and track performance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Portfolio overview</li>
                <li>• Performance metrics</li>
                <li>• Risk analysis</li>
                <li>• Transaction history</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-16">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Ready to get started?</CardTitle>
            <CardDescription>
              Join thousands of investors using FireMarkets for their financial data needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button size="lg">
                Access Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2024 FireMarkets. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
