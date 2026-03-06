'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { ClipboardList, Users, Wrench, FileText, ChevronDown } from 'lucide-react'

export function DashboardHeroCreateButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface-2)',
          color: 'var(--text-1)',
        }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Create new
        <ChevronDown size={16} style={{ opacity: open ? 1 : 0.7 }} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-xl border py-2 shadow-lg"
          style={{
            background: 'var(--surface-1)',
            borderColor: 'var(--border)',
          }}
        >
          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
            Create new
          </p>
          <Link
            href={crmPath('/jobs/new')}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text-1)' }}
          >
            <ClipboardList size={18} style={{ color: 'var(--text-2)' }} />
            New Job
          </Link>
          <Link
            href={crmPath('/customers')}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text-1)' }}
          >
            <Users size={18} style={{ color: 'var(--text-2)' }} />
            New Customer
          </Link>
          <Link
            href={crmPath('/services')}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text-1)' }}
          >
            <Wrench size={18} style={{ color: 'var(--text-2)' }} />
            New Service
          </Link>
          <div className="my-1 h-px" style={{ background: 'var(--border)' }} />
          <Link
            href={crmPath('/invoices')}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--text-1)' }}
          >
            <FileText size={18} style={{ color: 'var(--text-2)' }} />
            New Invoice
          </Link>
        </div>
      )}
    </div>
  )
}
