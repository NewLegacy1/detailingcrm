'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Pencil, UserPlus, Mail } from 'lucide-react'

interface TeamMember {
  id: string
  role: string
  display_name: string | null
  created_at: string
  updated_at?: string
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
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/team').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/settings/team/invites').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([membersData, invitesData]) => {
        setMembers(membersData)
        setInvites(invitesData)
      })
      .finally(() => setLoading(false))
  }, [])

  function openEdit(member: TeamMember) {
    setEditing(member)
    setSelectedRole(member.role)
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/settings/team/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      })
      const data = await res.json()
      if (res.ok) {
        setMembers((prev) => prev.map((p) => (p.id === editing.id ? { ...p, role: selectedRole } : p)))
        setDialogOpen(false)
      } else {
        alert(data.error || 'Failed to update')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) return
    setInviteError(null)
    setInviteSending(true)
    try {
      const res = await fetch('/api/settings/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteDialogOpen(false)
        setInviteEmail('')
        setInviteRole('technician')
        const invRes = await fetch('/api/settings/team/invites')
        if (invRes.ok) setInvites(await invRes.json())
      } else {
        setInviteError(data.error || 'Failed to send invite')
      }
    } finally {
      setInviteSending(false)
    }
  }

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
                  {member.role} · Last active —
                  {member.updated_at
                    ? new Date(member.updated_at).toLocaleDateString()
                    : new Date(member.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openEdit(member)}>
                <Pencil className="h-4 w-4" />
              </Button>
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
