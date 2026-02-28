'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-media-query'
import { ScheduleJobDetailModal } from '@/app/crm/(main)/schedule/schedule-job-detail-modal'

export function StickyJobsCTA() {
  const isMobile = useIsMobile()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  if (!isMobile) return null

  return (
    <>
      <div
        className="fixed left-0 right-0 z-30 flex items-center justify-center p-4 border-t md:hidden"
        style={{
          bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          background: 'var(--surface-1)',
          borderColor: 'var(--border)',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 w-full max-w-sm min-h-[48px] rounded-xl font-semibold text-white transition-opacity active:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          <Plus size={20} />
          Create Job
        </button>
      </div>
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
