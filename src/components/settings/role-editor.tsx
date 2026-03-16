'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PERMISSIONS } from '@/lib/permissions'

interface Role {
  id: string
  name: string
  key: string
}

const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.SETTINGS_VIEW]: 'View settings',
  [PERMISSIONS.SETTINGS_EDIT]: 'Edit settings',
  [PERMISSIONS.TEAM_VIEW]: 'View team',
  [PERMISSIONS.TEAM_MANAGE]: 'Manage team & roles',
  [PERMISSIONS.INVOICES_VIEW]: 'View invoices',
  [PERMISSIONS.INVOICES_CREATE]: 'Create invoices',
  [PERMISSIONS.INVOICES_SEND]: 'Send invoices',
  [PERMISSIONS.INVOICES_EDIT]: 'Edit invoices',
  [PERMISSIONS.INVOICES_DELETE]: 'Delete invoices',
  [PERMISSIONS.PAYMENTS_CHARGE]: 'Record payments',
  [PERMISSIONS.PAYMENTS_REFUND]: 'Refunds',
  [PERMISSIONS.SERVICES_MANAGE]: 'Manage services',
  [PERMISSIONS.SCHEDULE_MANAGE]: 'Manage schedule',
  [PERMISSIONS.CUSTOMERS_MANAGE]: 'Manage customers',
  [PERMISSIONS.STRIPE_CONNECT]: 'Connect Stripe',
  [PERMISSIONS.STRIPE_MANAGE]: 'Manage in Stripe',
  [PERMISSIONS.STRIPE_DISCONNECT]: 'Disconnect Stripe',
}

export function RoleEditor() {
  const [open, setOpen] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissionsByRole, setPermissionsByRole] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/settings/roles')
      .then((r) => (r.ok ? r.json() : { roles: [], permissionsByRole: {} }))
      .then((data) => {
        setRoles(data.roles ?? [])
        setPermissionsByRole(data.permissionsByRole ?? {})
      })
      .finally(() => setLoading(false))
  }, [])

  const allPermissions = Object.keys(PERMISSION_LABELS)

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-[var(--text)] hover:bg-white/5"
      >
        <span className="font-medium">Role permissions</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="border-t border-[var(--border)] p-4 space-y-4">
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="space-y-2">
                <h3 className="text-sm font-medium text-[var(--text)]">{role.name}</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-[var(--text-muted)]">
                  {(permissionsByRole[role.id] ?? []).map((perm) => (
                    <li key={perm}>{PERMISSION_LABELS[perm] ?? perm}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
