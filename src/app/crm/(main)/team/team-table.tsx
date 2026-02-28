'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { crmPath } from '@/lib/crm-path'
import { Pencil } from 'lucide-react'
import type { Profile } from '@/types/database'

interface TeamTableProps {
  initialProfiles: Profile[]
}

const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'technician', label: 'Technician' },
  { value: 'pending', label: 'Pending' },
]

export function TeamTable({ initialProfiles }: TeamTableProps) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [loading, setLoading] = useState(false)

  function openEditDialog(profile: Profile) {
    setEditingProfile(profile)
    setSelectedRole(profile.role)
    setIsDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProfile) return
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: selectedRole })
      .eq('id', editingProfile.id)
      .select()
      .single()

    if (!error && data) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === data.id ? data : p))
      )
      setIsDialogOpen(false)
    }
    setLoading(false)
  }

  return (
    <>
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
                onChange={(e) => setSelectedRole(e.target.value)}
                className="mt-2 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
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
    </>
  )
}
