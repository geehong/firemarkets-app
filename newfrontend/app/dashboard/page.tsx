export const metadata = {
  title: "Dashboard | FireMarkets",
  description: "Market overview with charts and tables.",
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="col-span-1">
          <div className="h-[220px] rounded-lg border bg-card text-card-foreground p-4">
            <div className="font-semibold mb-2">Mini Price Charts</div>
            <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">Placeholder</div>
          </div>
        </div>
        <div className="col-span-1">
          <div className="h-[220px] rounded-lg border bg-card text-card-foreground p-4">
            <div className="font-semibold mb-2">Real-time Widgets</div>
            <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">Placeholder</div>
          </div>
        </div>
        <div className="col-span-1">
          <div className="h-[220px] rounded-lg border bg-card text-card-foreground p-4">
            <div className="font-semibold mb-2">Top Performers</div>
            <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">Placeholder</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="col-span-1">
          <div className="h-[360px] rounded-lg border bg-card text-card-foreground p-4">
            <div className="font-semibold mb-2">Performance TreeMap</div>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Placeholder</div>
          </div>
        </div>
        <div className="col-span-1">
          <div className="h-[360px] rounded-lg border bg-card text-card-foreground p-4">
            <div className="font-semibold mb-2">Default Chart</div>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Placeholder</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground p-4">
        <div className="font-semibold mb-2">History Table</div>
        <div className="h-[420px] flex items-center justify-center text-muted-foreground text-sm">Placeholder</div>
      </div>
    </div>
  )
}


