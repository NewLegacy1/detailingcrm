'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Pencil, UserPlus, Mail, UserMinus } from 'lucide-react'

interface TeamMember {
  id: string
  role: string
  display_name: string | null
  created_at: string
  updated_at?: string
  location_id?: string
  location_name?: string
}

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'technician', label: 'Technician' },
  { value: 'pending', label: 'Pending' },
]

const INVITE_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'technician', label: 'Technician' },
]

interface PendingInvite {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

export function TeamList() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('technician')
  const [inviteLocationId, setInviteLocationId] = useState<string>('')
  const [inviteLocations, setInviteLocations] = useState<{ id: string; name: string }[]>([])
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [multiLocationEnabled, setMultiLocationEnabled] = useState(false)
  const [editLocationId, setEditLocationId] = useState<string>('')
  const [editLocations, setEditLocations] = useState<{ id: string; name: string }[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    const needsLocations = inviteDialogOpen && (inviteRole === 'manager' || (multiLocationEnabled && inviteRole === 'technician'))
    if (!needsLocations) {
      setInviteLocations([])
      return
    }
    fetch('/api/locations')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; name: string }[]) => setInviteLocations(Array.isArray(list) ? list : []))
      .catch(() => setInviteLocations([]))
  }, [inviteDialogOpen, inviteRole, multiLocationEnabled])

  useEffect(() => {
    const needsEditLocations =
      dialogOpen && (selectedRole === 'manager' || selectedRole === 'technician')
    if (!needsEditLocations) {
      setEditLocations([])
      return
    }
    fetch('/api/locations')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; name: string }[]) => setEditLocations(Array.isArray(list) ? list : []))
      .catch(() => setEditLocations([]))
  }, [dialogOpen, selectedRole])

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/team').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/settings/team/invites').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([teamData, invitesData]) => {
        if (teamData && Array.isArray(teamData.members)) {
          setMembers(teamData.members)
          setMultiLocationEnabled(teamData.multiLocationEnabled === true)
        } else if (teamData && Array.isArray(teamData)) {
          setMembers(teamData)
        } else {
          setMembers([])
        }
        setInvites(Array.isArray(invitesData) ? invitesData : [])
      })
      .finally(() => setLoading(false))
  }, [])

  function openEdit(member: TeamMember) {
    setEditing(member)
    setSelectedRole(member.role)
    setEditLocationId(member.location_id ?? '')
    setSaveError(null)
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaveError(null)
    setSaving(true)
    try {
      const body: { role: string; location_id?: string | null } = { role: selectedRole }
      if (selectedRole === 'manager' || selectedRole === 'technician') {
        body.location_id = editLocationId && editLocationId.trim() ? editLocationId.trim() : null
      } else {
        body.location_id = null
      }
      const res = await fetch(`/api/settings/team/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const locName =
          body.location_id != null
            ? editLocations.find((l) => l.id === body.location_id)?.name
            : undefined
        setMembers((prev) =>
          prev.map((p) =>
            p.id === editing.id
              ? { ...p, role: selectedRole, location_id: body.location_id ?? undefined, location_name: locName }
              : p
          )
        )
        setDialogOpen(false)
      } else {
        const err = data.error || 'Failed to update'
        setSaveError(err)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) return
    if ((inviteRole === 'manager' || inviteRole === 'technician') && multiLocationEnabled && (!inviteLocationId || inviteLocationId === '')) {
      setInviteError('Please select a location for this team member.')
      return
    }
    setInviteError(null)
    setInviteSending(true)
    try {
      const body: { email: string; role: string; location_id?: string } = { email, role: inviteRole }
      if ((inviteRole === 'manager' || inviteRole === 'technician') && inviteLocationId && inviteLocationId !== '') {
        body.location_id = inviteLocationId
      }
      const res = await fetch('/api/settings/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteDialogOpen(false)
        setInviteEmail('')
        setInviteRole('technician')
        setInviteLocationId('')
        const invRes = await fetch('/api/settings/team/invites')
        if (invRes.ok) setInvites(await invRes.json())
      } else {
        setInviteError(data.error || 'Failed to send invite')
      }
    } finally {
      setInviteSending(false)
    }
  }

  async function handleRemoveMember(member: TeamMember) {
    if (!confirm(`Remove ${member.display_name || 'this member'} from the team? They will lose access to this organization.`)) return
    setRemovingId(member.id)
    try {
      const res = await fetch(`/api/settings/team/${member.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== member.id))
      } else {
        alert(data.error || 'Failed to remove member')
      }
    } finally {
      setRemovingId(null)
    }
  }

  const ownerCount = members.filter((m) => m.role === 'owner').length
  const canRemove = (m: TeamMember) => m.role !== 'owner' || ownerCount > 1

  if (loading) return <p className="text-sm text-[var(--text-muted)]">Loading team…</p>

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-medium text-[var(--text)]">Team members</h3>
        <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          Invite team member
        </Button>
      </div>
      {invites.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Pending invites</p>
          <ul className="space-y-2">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm"
              >
                <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-[var(--text)]">{inv.email}</span>
                <span className="text-[var(--text-muted)]">· {inv.role}</span>
                <span className="text-[var(--text-muted)] text-xs ml-auto">
                  Expires {new Date(inv.expires_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="space-y-2">
        {members.length === 0 ? (
          <li className="text-sm text-[var(--text-muted)]">No team members yet.</li>
        ) : (
          members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3"
            >
              <div>
                <p className="font-medium text-[var(--text)]">
                  {member.display_name || 'Unnamed'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {member.role}
                  {member.location_name ? ` · ${member.location_name}` : ''} · Last active —
                  {member.updated_at
                    ? new Date(member.updated_at).toLocaleDateString()
                    : new Date(member.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(member)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {canRemove(member) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member)}
                    disabled={removingId === member.id}
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    title="Remove from team"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogClose onClick={() => setDialogOpen(false)} />
          </DialogHeader>
          {editing && (
            <form onSubmit={handleSave} className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                User: <span className="font-medium text-[var(--text)]">{editing.display_name || 'Unnamed'}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {(selectedRole === 'manager' || selectedRole === 'technician') && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    Location {multiLocationEnabled ? '(required)' : '(optional)'}
                  </label>
                  <select
                    value={editLocationId}
                    onChange={(e) => setEditLocationId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
                  >
                    <option value="">{multiLocationEnabled ? 'Select location' : 'All locations'}</option>
                    {editLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  {editLocations.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Add locations in Settings → Locations first.
                    </p>
                  )}
                </div>
              )}
              {saveError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  {saveError}
                  {saveError.includes('last owner') && (
                    <p className="mt-2 text-xs">
                      To test the Manager view, invite another person as Owner first, then have them change your role here.
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogClose onClick={() => setInviteDialogOpen(false)} />
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              They&apos;ll receive an email with a link to sign up or sign in and join your organization.
            </p>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
              >
                {INVITE_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {((inviteRole === 'manager' && inviteLocations.length > 0) || (inviteRole === 'technician' && multiLocationEnabled && inviteLocations.length > 0)) && (
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  Location {multiLocationEnabled ? '(required)' : '(optional for manager)'}
                </label>
                <select
                  value={inviteLocationId}
                  onChange={(e) => setInviteLocationId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)]"
                  required={multiLocationEnabled}
                >
                  <option value="">{multiLocationEnabled ? 'Select location' : 'All locations'}</option>
                  {inviteLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {multiLocationEnabled
                    ? 'They will only see jobs, invoices, and analytics for this location.'
                    : 'Optional. Select a location to make them a location manager for that location only.'}
                </p>
              </div>
            )}
            {inviteError && (
              <p className="text-sm text-red-500">{inviteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
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
