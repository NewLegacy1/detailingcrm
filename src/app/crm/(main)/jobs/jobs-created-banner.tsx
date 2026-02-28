'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function JobsCreatedBanner() {
  const searchParams = useSearchParams()
  const createdId = searchParams.get('created')
  if (!createdId) return null

  return (
    <div className="shrink-0 flex items-center justify-between gap-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-white">
      <span className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-emerald-400" />
        Job created successfully.
      </span>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
          <Link href={crmPath(`/jobs/${createdId}`)}>View job</Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className="text-white/80 hover:text-white">
          <Link href={crmPath('/jobs')}>Dismiss</Link>
        </Button>
      </div>
    </div>
  )
}
