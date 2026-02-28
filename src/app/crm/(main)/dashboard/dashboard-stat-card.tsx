'use client'

import {
  DollarSign,
  ClipboardList,
  TrendingUp,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const STAT_ICON_MAP: Record<string, LucideIcon> = {
  DollarSign,
  ClipboardList,
  TrendingUp,
  Star,
  Users,
}

export type StatCardIconName = keyof typeof STAT_ICON_MAP

interface DashboardStatCardProps {
  iconName: StatCardIconName
  label: string
  value: string | number
}

export function DashboardStatCard({
  iconName,
  label,
  value,
}: DashboardStatCardProps) {
  const Icon = STAT_ICON_MAP[iconName]
  if (!Icon) {
    return null
  }
  return (
    <Card className="transition-all duration-200 hover:translate-y-[-2px]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="section-label">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-white">
              {value}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
