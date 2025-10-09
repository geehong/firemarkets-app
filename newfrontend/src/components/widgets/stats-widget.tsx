"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity,
  Building2,
  Coins,
  PieChart
} from "lucide-react"

interface StatsWidgetProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  trend?: "up" | "down" | "neutral"
  description?: string
}

export function StatsWidget({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon, 
  trend = "neutral",
  description 
}: StatsWidgetProps) {
  const isPositive = trend === "up" || (change !== undefined && change >= 0)
  const isNegative = trend === "down" || (change !== undefined && change < 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : isNegative ? (
              <TrendingDown className="h-3 w-3 text-red-600" />
            ) : null}
            <span className={isPositive ? "text-green-600" : isNegative ? "text-red-600" : ""}>
              {isPositive ? "+" : ""}{change}%
            </span>
            {changeLabel && <span>from {changeLabel}</span>}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

// 미리 정의된 위젯들
export function MarketCapWidget() {
  return (
    <StatsWidget
      title="Total Market Cap"
      value="$2.1T"
      change={2.5}
      changeLabel="last month"
      icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
      trend="up"
    />
  )
}

export function ActiveAssetsWidget() {
  return (
    <StatsWidget
      title="Active Assets"
      value="1,234"
      change={12}
      changeLabel="this week"
      icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
      trend="up"
    />
  )
}

export function VolumeWidget() {
  return (
    <StatsWidget
      title="24h Volume"
      value="$89.2B"
      change={-1.2}
      changeLabel="yesterday"
      icon={<Activity className="h-4 w-4 text-muted-foreground" />}
      trend="down"
    />
  )
}

export function TopGainerWidget() {
  return (
    <StatsWidget
      title="Top Gainer"
      value="BTC"
      change={5.2}
      changeLabel="today"
      icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
      trend="up"
      description="Bitcoin leading the market"
    />
  )
}
