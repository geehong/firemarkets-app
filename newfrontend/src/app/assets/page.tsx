import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search,
  TrendingUp, 
  TrendingDown,
  Building2,
  Coins,
  PieChart
} from "lucide-react"

export default function AssetsPage() {
  const mockAssets = [
    {
      name: "Bitcoin",
      symbol: "BTC",
      price: 43250.50,
      change: 5.2,
      type: "Crypto",
      marketCap: "850B"
    },
    {
      name: "Ethereum", 
      symbol: "ETH",
      price: 2650.30,
      change: 3.8,
      type: "Crypto",
      marketCap: "320B"
    },
    {
      name: "Apple Inc.",
      symbol: "AAPL", 
      price: 185.50,
      change: 2.1,
      type: "Stock",
      marketCap: "2.9T"
    },
    {
      name: "Tesla Inc.",
      symbol: "TSLA",
      price: 245.30,
      change: 1.9,
      type: "Stock", 
      marketCap: "780B"
    },
    {
      name: "SPDR S&P 500",
      symbol: "SPY",
      price: 485.20,
      change: 1.2,
      type: "ETF",
      marketCap: "450B"
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
        <p className="text-muted-foreground">
          Browse and analyze financial assets including stocks, cryptocurrencies, and ETFs
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Assets</CardTitle>
          <CardDescription>
            Find assets by name, symbol, or type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search assets, tickers..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Building2 className="h-4 w-4 mr-2" />
                Stocks
              </Button>
              <Button variant="outline" size="sm">
                <Coins className="h-4 w-4 mr-2" />
                Crypto
              </Button>
              <Button variant="outline" size="sm">
                <PieChart className="h-4 w-4 mr-2" />
                ETFs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockAssets.map((asset) => (
          <Card key={asset.symbol} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">{asset.symbol.slice(0, 2)}</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{asset.name}</CardTitle>
                    <CardDescription>{asset.symbol}</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">{asset.type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">${asset.price.toLocaleString()}</span>
                  <div className={`flex items-center ${asset.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {asset.change >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    <span className="font-medium">
                      {asset.change >= 0 ? '+' : ''}{asset.change}%
                    </span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Market Cap: ${asset.marketCap}
                </div>
                <Button className="w-full" size="sm">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon Notice */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">More Features Coming Soon</h3>
            <p className="text-muted-foreground mb-4">
              Real-time data integration, advanced filtering, and detailed asset analysis will be available soon.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Price Charts
              </Button>
              <Button variant="outline" size="sm">
                <PieChart className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
