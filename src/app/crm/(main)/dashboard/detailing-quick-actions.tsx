'use client'

import Link from 'next/link'
import { UserPlus, ClipboardList, FileText, Calendar, Users, ListTodo } from 'lucide-react'

export function DetailingQuickActions() {
  const viewActions = [
    { label: 'Jobs', href: '/jobs', icon: ListTodo },
    { label: 'Schedule', href: '/schedule', icon: Calendar },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Invoices', href: '/invoices', icon: FileText },
  ]
  const createActions = [
    { label: 'New job', href: '/jobs/new', icon: ClipboardList },
    { label: 'Add customer', href: '/customers', icon: UserPlus },
    { label: 'Send invoice', href: '/invoices', icon: FileText },
  ]

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Quick navigation</h3>
        <div className="flex flex-wrap gap-2">
          {viewActions.map(({ label, href, icon: Icon }) => (
            <Link
              key={href + label}
              href={href}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-sm font-medium text-[var(--text)] hover:bg-white/5 transition-colors min-h-[44px]"
            >
              <Icon className="h-4 w-4 text-[var(--accent)] shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Quick actions</h3>
        <div className="flex flex-wrap gap-2">
          {createActions.map(({ label, href, icon: Icon }) => (
            <Link
              key={href + label}
              href={href}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--text)] hover:bg-white/5 transition-colors min-h-[44px]"
            >
              <Icon className="h-4 w-4 text-[var(--accent)] shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
