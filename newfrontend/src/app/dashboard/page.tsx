import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  PieChart,
  Activity,
  Users,
  Building2
} from "lucide-react"
import { PriceChart } from "@/components/charts/price-chart"
import { 
  MarketCapWidget, 
  ActiveAssetsWidget, 
  VolumeWidget, 
  TopGainerWidget 
} from "@/components/widgets/stats-widget"
import { AssetsTable } from "@/components/tables/assets-table"

export default function DashboardPage() {
  // Mock chart data
  const chartData = [
    { date: "2024-01-01", price: 42000 },
    { date: "2024-01-02", price: 42500 },
    { date: "2024-01-03", price: 41800 },
    { date: "2024-01-04", price: 43200 },
    { date: "2024-01-05", price: 42800 },
    { date: "2024-01-06", price: 43500 },
    { date: "2024-01-07", price: 43250 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to FireMarkets - Your financial data hub
        </p>
      </div>

      {/* Stats Widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MarketCapWidget />
        <ActiveAssetsWidget />
        <VolumeWidget />
        <TopGainerWidget />
      </div>

      {/* Market Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <PriceChart 
            data={chartData}
            title="Bitcoin Price Chart"
            description="7-day price movement"
            height={300}
          />
        </div>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>
              Best performing assets today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Bitcoin", symbol: "BTC", change: "+5.2%", price: "$43,250" },
                { name: "Ethereum", symbol: "ETH", change: "+3.8%", price: "$2,650" },
                { name: "Apple Inc.", symbol: "AAPL", change: "+2.1%", price: "$185.50" },
                { name: "Tesla Inc.", symbol: "TSLA", change: "+1.9%", price: "$245.30" },
                { name: "SPDR S&P 500", symbol: "SPY", change: "+1.2%", price: "$485.20" },
              ].map((asset) => (
                <div key={asset.symbol} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">{asset.symbol.slice(0, 2)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{asset.price}</p>
                    <Badge variant="secondary" className="text-green-600 bg-green-50">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {asset.change}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <AssetsTable 
        title="Market Assets"
        description="Real-time asset data and performance"
      />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and navigation shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col">
              <Building2 className="h-6 w-6 mb-2" />
              <span>Browse Assets</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <BarChart3 className="h-6 w-6 mb-2" />
              <span>View Analytics</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <PieChart className="h-6 w-6 mb-2" />
              <span>Portfolio</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Activity className="h-6 w-6 mb-2" />
              <span>Market Data</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
