'use client'

import { Plus } from 'lucide-react'

/** Dispatched from the schedule page header; `ScheduleView` listens and opens the create-job modal. */
export const SCHEDULE_OPEN_CREATE_EVENT = 'detailops-schedule-open-create'

export function ScheduleMobileAddButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(SCHEDULE_OPEN_CREATE_EVENT))}
      className="md:hidden flex items-center justify-center size-11 rounded-full shadow-md shrink-0 transition-[transform,opacity] active:scale-95"
      style={{ background: 'var(--accent)', color: '#fff' }}
      aria-label="Add job"
    >
      <Plus className="size-5" strokeWidth={2.5} aria-hidden />
    </button>
  )
}
