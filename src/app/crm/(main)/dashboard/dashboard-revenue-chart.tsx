'use client'

import { useIsMobile } from '@/hooks/use-media-query'
import { RevenueChart } from './revenue-chart'

interface DashboardRevenueChartProps {
  chartData: { date: string; revenue: number }[]
}

export function DashboardRevenueChart({ chartData }: DashboardRevenueChartProps) {
  const isMobile = useIsMobile()
  return (
    <RevenueChart chartData={chartData} mobile={isMobile} />
  )
}
