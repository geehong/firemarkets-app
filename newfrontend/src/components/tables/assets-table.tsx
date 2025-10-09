"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  TrendingUp, 
  TrendingDown, 
  Search,
  MoreHorizontal,
  Star
} from "lucide-react"
import { useState } from "react"

interface Asset {
  id: string
  name: string
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  type: "Stock" | "Crypto" | "ETF"
  isFavorite?: boolean
}

interface AssetsTableProps {
  title?: string
  description?: string
  data?: Asset[]
}

const mockData: Asset[] = [
  {
    id: "1",
    name: "Bitcoin",
    symbol: "BTC",
    price: 43250.50,
    change: 2150.30,
    changePercent: 5.24,
    volume: 28500000000,
    marketCap: 850000000000,
    type: "Crypto",
    isFavorite: true
  },
  {
    id: "2", 
    name: "Ethereum",
    symbol: "ETH",
    price: 2650.30,
    change: 98.50,
    changePercent: 3.85,
    volume: 15200000000,
    marketCap: 320000000000,
    type: "Crypto"
  },
  {
    id: "3",
    name: "Apple Inc.",
    symbol: "AAPL", 
    price: 185.50,
    change: 3.85,
    changePercent: 2.12,
    volume: 8500000000,
    marketCap: 2900000000000,
    type: "Stock"
  },
  {
    id: "4",
    name: "Tesla Inc.",
    symbol: "TSLA",
    price: 245.30,
    change: 4.55,
    changePercent: 1.89,
    volume: 4200000000,
    marketCap: 780000000000,
    type: "Stock"
  },
  {
    id: "5",
    name: "SPDR S&P 500",
    symbol: "SPY",
    price: 485.20,
    change: 5.75,
    changePercent: 1.20,
    volume: 12000000000,
    marketCap: 450000000000,
    type: "ETF"
  }
]

export function AssetsTable({ 
  title = "Assets", 
  description = "Real-time asset data",
  data = mockData 
}: AssetsTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredData, setFilteredData] = useState(data)

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    const filtered = data.filter(asset => 
      asset.name.toLowerCase().includes(value.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredData(filtered)
  }

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`
    return `$${num.toLocaleString()}`
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Crypto": return "bg-orange-100 text-orange-800"
      case "Stock": return "bg-blue-100 text-blue-800"
      case "ETF": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Change</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>Market Cap</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                  >
                    <Star 
                      className={`h-4 w-4 ${
                        asset.isFavorite 
                          ? "fill-yellow-400 text-yellow-400" 
                          : "text-muted-foreground"
                      }`} 
                    />
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">{asset.symbol.slice(0, 2)}</span>
                    </div>
                    <div>
                      <div className="font-medium">{asset.name}</div>
                      <div className="text-sm text-muted-foreground">{asset.symbol}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  ${asset.price.toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className={`flex items-center ${asset.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {asset.changePercent >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    <span>
                      {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>{formatNumber(asset.volume)}</TableCell>
                <TableCell>{formatNumber(asset.marketCap)}</TableCell>
                <TableCell>
                  <Badge className={getTypeColor(asset.type)}>
                    {asset.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
