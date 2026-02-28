'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScheduleJobDetailModal } from '@/app/crm/(main)/schedule/schedule-job-detail-modal'

export function JobsNewJobButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        New job
      </Button>
      <ScheduleJobDetailModal
        open={open}
        jobId={null}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}
