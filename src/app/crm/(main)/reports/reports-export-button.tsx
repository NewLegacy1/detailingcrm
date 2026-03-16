'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface ReportsExportButtonProps {
  dailySales: [string, number][]
  revByServiceList: [string, number][]
  topServices: [string, number][]
  rebookRows: { id: string; name: string; count: number }[]
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n'))
    return `"${val.replace(/"/g, '""')}"`
  return val
}

export function ReportsExportButton({
  dailySales,
  revByServiceList,
  topServices,
  rebookRows,
}: ReportsExportButtonProps) {
  function exportCsv() {
    const lines: string[] = []
    lines.push('Report,Detail,Value')
    lines.push('Daily sales (last 7 days),,')
    dailySales.forEach(([date, amount]) => {
      lines.push(`${escapeCsv(date)},,${amount}`)
    })
    lines.push('Revenue by service,,')
    revByServiceList.forEach(([name, amount]) => {
      lines.push(`${escapeCsv(name)},,${amount}`)
    })
    lines.push('Top services (job count),,')
    topServices.forEach(([name, count]) => {
      lines.push(`${escapeCsv(name)},,${count}`)
    })
    lines.push('Rebook - Customer,Booking count,')
    rebookRows.forEach((r) => {
      lines.push(`${escapeCsv(r.name)},${r.count},`)
    })
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reports-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={exportCsv}>
      <Download className="mr-2 h-4 w-4" />
      Export to CSV
    </Button>
  )
}
