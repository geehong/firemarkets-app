"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export function ExportButton() {
  const handleExportData = () => {
    // Replace with real export logic
    console.log("Exporting data...")
  }

  return (
    <Button onClick={handleExportData} className="flex items-center gap-2">
      <Download className="h-4 w-4" />
      Export Data
    </Button>
  )
}


