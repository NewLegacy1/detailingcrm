'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { crmPath } from '@/lib/crm-path'
import { Pencil, UserPlus } from 'lucide-react'
import type { Profile } from '@/types/database'

const INVITE_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'technician', label: 'Technician' },
]

interface TeamTableProps {
  initialProfiles: Profile[]
}

interface Location {
  id: string
  name: string
}

const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'technician', label: 'Technician' },
  { value: 'pending', label: 'Pending' },
]

const ROLES_NEEDING_LOCATION = ['manager', 'technician']

export function TeamTable({ initialProfiles }: TeamTableProps) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('technician')
  const [inviteLocationId, setInviteLocationId] = useState<string>('')
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(false)

  useEffect(() => {
    async function loadLocations() {
      try {
        const res = await fetch('/api/locations')
        if (res.ok) {
          const data: Location[] = await res.json()
          setLocations(data)
          setMultiLocationEnabled(data.length > 0)
        }
      } catch {
        // non-fatal: location selector just won't show
      }
    }
    loadLocations()
  }, [])

  function openEditDialog(profile: Profile) {
    setEditingProfile(profile)
    setSelectedRole(profile.role)
    setSelectedLocationId(profile.location_id ?? '')
    setSaveError(null)
    setIsDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProfile) return
    setSaveError(null)
    setLoading(true)

    const body: Record<string, unknown> = { role: selectedRole }
    if (multiLocationEnabled && ROLES_NEEDING_LOCATION.includes(selectedRole)) {
      body.location_id = selectedLocationId || null
    } else {
      body.location_id = null
    }

    const res = await fetch(`/api/settings/team/${editingProfile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (res.ok) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === editingProfile.id
            ? { ...p, role: selectedRole as Profile['role'], location_id: (body.location_id as string | null) ?? null }
            : p
        )
      )
      setIsDialogOpen(false)
    } else {
      setSaveError(data.error ?? 'Failed to update role')
    }
    setLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) return
    setInviteError(null)
    setInviteSending(true)
    try {
      const body: Record<string, unknown> = { email, role: inviteRole }
      if (multiLocationEnabled && ROLES_NEEDING_LOCATION.includes(inviteRole)) {
        body.location_id = inviteLocationId || null
      }
      const res = await fetch('/api/settings/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteOpen(false)
        setInviteEmail('')
        setInviteRole('technician')
        setInviteLocationId('')
      } else {
        setInviteError(data.error || 'Failed to send invite')
      }
    } finally {
      setInviteSending(false)
    }
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite team member
        </Button>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Role</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Joined</TableHead>
              <TableHead className="w-24 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableCell colSpan={4} className="p-0">
                  <EmptyState
                    iconName="Users"
                    headline="No team members yet"
                    subtext="Add team members in Settings → Team."
                    ctaLabel="Go to Settings"
                    ctaHref={crmPath('/settings/team')}
                  />
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((profile) => (
                <TableRow key={profile.id} className="border-white/5 text-[var(--text-secondary)] hover:bg-white/5">
                  <TableCell className="font-medium text-white">
                    {profile.display_name || 'Unnamed User'}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-[var(--accent-dim)] text-[var(--accent)]">
                      {profile.role.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(profile)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogClose onClick={() => setIsDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                User: <span className="font-medium text-[var(--text)]">{editingProfile?.display_name || 'Unnamed'}</span>
              </p>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value)
                  if (!ROLES_NEEDING_LOCATION.includes(e.target.value)) {
                    setSelectedLocationId('')
                  }
                }}
                className="mt-2 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            {multiLocationEnabled && ROLES_NEEDING_LOCATION.includes(selectedRole) && (
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <select
                  id="edit-location"
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="mt-2 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                >
                  <option value="">— No location —</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {saveError && (
              <p className="text-sm text-red-500">{saveError}</p>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Update Role'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogClose onClick={() => setInviteOpen(false)} />
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              They&apos;ll receive an email with a link to sign up or sign in and join your organization.
            </p>
            <div>
              <Label htmlFor="invite-email">Email</Label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="mt-2 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
                required
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => {
                  setInviteRole(e.target.value)
                  if (!ROLES_NEEDING_LOCATION.includes(e.target.value)) {
                    setInviteLocationId('')
                  }
                }}
                className="mt-2 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
              >
                {INVITE_ROLES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {multiLocationEnabled && ROLES_NEEDING_LOCATION.includes(inviteRole) && (
              <div>
                <Label htmlFor="invite-location">Location</Label>
                <select
                  id="invite-location"
                  value={inviteLocationId}
                  onChange={(e) => setInviteLocationId(e.target.value)}
                  className="mt-2 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
                >
                  <option value="">— No location —</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {inviteError && (
              <p className="text-sm text-red-500">{inviteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteSending}>
                {inviteSending ? 'Sending…' : 'Send invite'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
