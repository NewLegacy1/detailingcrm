'use client'

import { RevenueChart } from '@/app/crm/(main)/dashboard/revenue-chart'

interface ReportsChartsClientProps {
  chartData: { date: string; revenue: number }[]
}

export function ReportsChartsClient({ chartData }: ReportsChartsClientProps) {
  return (
    <div style={{ height: 240, width: '100%' }}>
      <RevenueChart chartData={chartData} />
    </div>
  )
}
