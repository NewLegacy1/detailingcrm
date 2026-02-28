'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { useRouter } from 'next/navigation'
import { Search, Plus, Folder, UserPlus, Pencil, Trash2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { CustomersUploadCsv } from '@/app/crm/(main)/customers/customers-upload-csv'
import { CustomersAddButton } from '@/app/crm/(main)/customers/customers-add-button'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address?: string | null
  notes?: string | null
}

interface CustomerGroup {
  id: string
  name: string
}

interface CustomersListSidebarProps {
  customers: Customer[]
  selectedId: string | null
  groups?: CustomerGroup[]
  selectedGroupId?: string | null
  /** All org customers when viewing a group (for "Add existing" picker) */
  allCustomersForGroup?: Customer[]
  /** When true, open the Add customer dialog and clear the URL param */
  openAddFromUrl?: boolean
}

export function CustomersListSidebar({
  customers,
  selectedId,
  groups = [],
  selectedGroupId = null,
  allCustomersForGroup,
  openAddFromUrl = false,
}: CustomersListSidebarProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [addExistingOpen, setAddExistingOpen] = useState(false)
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
  const [addExistingError, setAddExistingError] = useState<string | null>(null)
  useEffect(() => {
    if (openAddFromUrl) {
      setAddDialogOpen(true)
      router.replace(crmPath('/customers'))
    }
  }, [openAddFromUrl, router])
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [groupError, setGroupError] = useState<string | null>(null)
  const [renameGroup, setRenameGroup] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [deleteGroup, setDeleteGroup] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAddToGroupOpen, setBulkAddToGroupOpen] = useState(false)
  const [bulkAddGroupId, setBulkAddGroupId] = useState<string | null>(null)
  const [bulkAdding, setBulkAdding] = useState(false)
  const [bulkAddError, setBulkAddError] = useState<string | null>(null)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null)

  const groupQuery = selectedGroupId ? `&group=${selectedGroupId}` : ''

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setGroupError(null)
    setCreatingGroup(true)
    try {
      const res = await fetch('/api/customers/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setNewGroupOpen(false)
        setNewGroupName('')
        router.refresh()
      } else {
        setGroupError(data?.error ?? `Failed to create group (${res.status})`)
      }
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Failed to create group')
    } finally {
      setCreatingGroup(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return customers
    const q = search.trim().toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.includes(q) ?? false)
    )
  }, [customers, search])

  const availableToAdd = useMemo(() => {
    if (!selectedGroupId || !allCustomersForGroup?.length) return []
    const inGroup = new Set(customers.map((c) => c.id))
    return allCustomersForGroup.filter((c) => !inGroup.has(c.id))
  }, [selectedGroupId, allCustomersForGroup, customers])

  async function handleAddExistingToGroup() {
    if (!selectedGroupId || addingIds.size === 0) return
    setAddExistingError(null)
    try {
      for (const clientId of addingIds) {
        const res = await fetch(`/api/customers/groups/${selectedGroupId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, add: true }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error ?? `Failed to add (${res.status})`)
        }
      }
      setAddExistingOpen(false)
      setAddingIds(new Set())
      router.refresh()
    } catch (err) {
      setAddExistingError(err instanceof Error ? err.message : 'Failed to add to group')
    }
  }

  function openRename(g: CustomerGroup) {
    setRenameGroup(g)
    setRenameValue(g.name)
    setRenameError(null)
  }

  async function handleRename() {
    if (!renameGroup || !renameValue.trim()) return
    setRenameError(null)
    setRenaming(true)
    try {
      const res = await fetch(`/api/customers/groups/${renameGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setRenameGroup(null)
        router.refresh()
      } else {
        setRenameError(data?.error ?? `Failed to rename (${res.status})`)
      }
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Failed to rename')
    } finally {
      setRenaming(false)
    }
  }

  async function handleDelete() {
    if (!deleteGroup) return
    setDeleteError(null)
    setDeleting(true)
    try {
      const res = await fetch(`/api/customers/groups/${deleteGroup.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setDeleteGroup(null)
        if (selectedGroupId === deleteGroup.id) router.push(crmPath('/customers'))
        else router.refresh()
      } else {
        setDeleteError(data?.error ?? `Failed to delete (${res.status})`)
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleBulkAddToGroup() {
    const groupId = bulkAddGroupId ?? selectedGroupId
    if (!groupId || selectedIds.size === 0) return
    setBulkAddError(null)
    setBulkAdding(true)
    try {
      for (const clientId of selectedIds) {
        const res = await fetch(`/api/customers/groups/${groupId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, add: true }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error ?? `Failed to add (${res.status})`)
        }
      }
      setBulkAddToGroupOpen(false)
      setBulkAddGroupId(null)
      setSelectedIds(new Set())
      router.refresh()
    } catch (err) {
      setBulkAddError(err instanceof Error ? err.message : 'Failed to add to group')
    } finally {
      setBulkAdding(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setBulkDeleteError(null)
    setBulkDeleting(true)
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error ?? `Failed to delete (${res.status})`)
        }
      }
      setBulkDeleteConfirmOpen(false)
      setSelectedIds(new Set())
      if (selectedId && selectedIds.has(selectedId)) router.push(crmPath('/customers'))
      router.refresh()
    } catch (err) {
      setBulkDeleteError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setBulkDeleting(false)
    }
  }

  return (
    <aside
      className="flex h-full w-full flex-col border-r lg:w-80 shrink-0"
      style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
    >
      <div className="border-b p-3 space-y-2" style={{ borderColor: 'var(--border)' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
          <Input
            type="search"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-lg"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg)',
              color: 'var(--text-1)',
            }}
          />
        </div>
        <CustomersAddButton open={addDialogOpen} onOpenChange={setAddDialogOpen} />
        <CustomersUploadCsv />
        {selectedGroupId && allCustomersForGroup && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center gap-2"
            onClick={() => { setAddExistingOpen(true); setAddExistingError(null); setAddingIds(new Set()); }}
          >
            <UserPlus className="h-4 w-4" />
            Add existing customers
          </Button>
        )}
      </div>
      <div className="border-b p-2" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Groups</span>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setNewGroupOpen(true)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="space-y-0.5">
          <Link
            href={crmPath('/customers')}
            className={`block rounded-lg px-2 py-1.5 text-sm ${!selectedGroupId ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : ''}`}
            style={selectedGroupId ? { color: 'var(--text-2)' } : undefined}
          >
            All
          </Link>
          {groups.map((g) => (
              <div
                key={g.id}
                className={`group/row flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-sm ${selectedGroupId === g.id ? 'bg-[var(--accent)]/15' : ''}`}
              >
                <Link
                  href={crmPath(`/customers?group=${g.id}`)}
                  className={`flex flex-1 min-w-0 items-center gap-1.5 py-0.5 ${selectedGroupId === g.id ? 'text-[var(--accent)]' : ''}`}
                  style={selectedGroupId !== g.id ? { color: 'var(--text-2)' } : undefined}
                >
                  <Folder className="h-3.5 w-3 shrink-0" />
                  <span className="truncate">{g.name}</span>
                </Link>
                <div className="flex items-center opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 shrink-0 p-0"
                    onClick={(e) => { e.preventDefault(); openRename(g); }}
                    aria-label="Rename group"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 shrink-0 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/15"
                    onClick={(e) => { e.preventDefault(); setDeleteGroup(g); setDeleteError(null); }}
                    aria-label="Delete group"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>
      <Dialog open={newGroupOpen} onOpenChange={(open) => { setNewGroupOpen(open); if (!open) setGroupError(null); }}>
        <DialogContent className="max-w-sm">
          <DialogClose onClick={() => setNewGroupOpen(false)} />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">New group</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateGroup(e); }} className="space-y-3">
            {groupError && (
              <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                {groupError}
              </div>
            )}
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-1)]"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNewGroupOpen(false)}>Cancel</Button>
              <Button
                type="button"
                disabled={creatingGroup || !newGroupName.trim()}
                onClick={() => handleCreateGroup({ preventDefault: () => {} } as React.FormEvent)}
              >
                {creatingGroup ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!renameGroup} onOpenChange={(open) => { if (!open) { setRenameGroup(null); setRenameError(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogClose onClick={() => { setRenameGroup(null); setRenameError(null); }} />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">Rename group</DialogTitle>
          </DialogHeader>
          {renameError && (
            <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {renameError}
            </div>
          )}
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Group name"
            className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-1)]"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setRenameGroup(null); setRenameError(null); }}>Cancel</Button>
            <Button type="button" disabled={renaming || !renameValue.trim()} onClick={handleRename}>
              {renaming ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteGroup} onOpenChange={(open) => { if (!open) { setDeleteGroup(null); setDeleteError(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogClose onClick={() => { setDeleteGroup(null); setDeleteError(null); }} />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">Delete group</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Delete &quot;{deleteGroup?.name}&quot;? Customers in this group will not be removed; only the group is deleted.
          </p>
          {deleteError && (
            <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {deleteError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setDeleteGroup(null); setDeleteError(null); }}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={addExistingOpen} onOpenChange={(open) => { setAddExistingOpen(open); if (!open) { setAddExistingError(null); setAddingIds(new Set()); } }}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogClose onClick={() => setAddExistingOpen(false)} />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">Add existing customers to group</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Select customers to add to this group.
          </p>
          {addExistingError && (
            <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {addExistingError}
            </div>
          )}
          <div className="flex-1 overflow-y-auto min-h-0 rounded-lg border space-y-1 p-2" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
            {availableToAdd.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--text-3)' }}>
                All customers are already in this group.
              </p>
            ) : (
              availableToAdd.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={addingIds.has(c.id)}
                    onChange={(e) => {
                      setAddingIds((prev) => {
                        const next = new Set(prev)
                        if (e.target.checked) next.add(c.id)
                        else next.delete(c.id)
                        return next
                      })
                    }}
                    className="rounded border-[var(--border)]"
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{c.name}</span>
                  {c.email && <span className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{c.email}</span>}
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddExistingOpen(false)}>Cancel</Button>
            <Button
              type="button"
              disabled={addingIds.size === 0}
              onClick={handleAddExistingToGroup}
            >
              Add to group ({addingIds.size})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={bulkAddToGroupOpen} onOpenChange={(open) => { setBulkAddToGroupOpen(open); if (!open) { setBulkAddGroupId(null); setBulkAddError(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogClose onClick={() => { setBulkAddToGroupOpen(false); setBulkAddError(null); }} />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">Add to group</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Add {selectedIds.size} customer{selectedIds.size !== 1 ? 's' : ''} to a group.
          </p>
          {groups.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Create a group first (click + under Groups).</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setBulkAddGroupId(g.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    bulkAddGroupId === g.id ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'hover:bg-white/5'
                  }`}
                  style={bulkAddGroupId !== g.id ? { color: 'var(--text-2)' } : undefined}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
          {bulkAddError && (
            <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {bulkAddError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setBulkAddToGroupOpen(false)}>Cancel</Button>
            <Button
              type="button"
              disabled={bulkAdding || !bulkAddGroupId || groups.length === 0}
              onClick={handleBulkAddToGroup}
            >
              {bulkAdding ? 'Adding…' : 'Add to group'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={bulkDeleteConfirmOpen} onOpenChange={(open) => { if (!open) { setBulkDeleteConfirmOpen(false); setBulkDeleteError(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogClose onClick={() => { setBulkDeleteConfirmOpen(false); setBulkDeleteError(null); }} />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">Delete customers</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            Delete {selectedIds.size} customer{selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.
          </p>
          {bulkDeleteError && (
            <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {bulkDeleteError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setBulkDeleteConfirmOpen(false); setBulkDeleteError(null); }}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={bulkDeleting} onClick={handleBulkDelete}>
              {bulkDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <nav className="flex-1 overflow-y-auto p-2 flex flex-col min-h-0">
        {selectedIds.size > 0 && (
          <div className="shrink-0 mb-2 p-2 rounded-lg border flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{selectedIds.size} selected</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setBulkAddToGroupOpen(true)}
            >
              <Folder className="mr-1 h-3 w-3" />
              Add to group
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/15"
              onClick={() => { setBulkDeleteConfirmOpen(true); setBulkDeleteError(null); }}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs ml-auto"
              onClick={() => setSelectedIds(new Set())}
              aria-label="Clear selection"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        {customers.length === 0 ? (
          <div className="p-4">
            {selectedGroupId ? (
              <EmptyState
                iconName="Users"
                headline="No customers in this group"
                subtext={availableToAdd.length > 0 ? 'Add existing customers from your CRM or add a new customer above.' : 'Add a new customer with the button above, then assign them to this group.'}
                ctaLabel={availableToAdd.length > 0 ? 'Add existing customers' : undefined}
                ctaOnClick={availableToAdd.length > 0 ? () => { setAddExistingOpen(true); setAddExistingError(null); setAddingIds(new Set()); } : undefined}
              />
            ) : (
              <EmptyState
                iconName="Users"
                headline="No customers yet"
                subtext="Add a customer with the button above or import from CSV."
              />
            )}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm" style={{ color: 'var(--text-3)' }}>
            No customers match &quot;{search}&quot;
          </p>
        ) : (
          <ul className="space-y-0.5 flex-1 min-h-0">
            {filtered.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => toggleSelect(c.id, e)}
                  className="shrink-0 mt-0.5 rounded border p-0.5 flex items-center justify-center"
                  style={{ borderColor: 'var(--border)' }}
                  aria-label={selectedIds.has(c.id) ? 'Deselect' : 'Select'}
                >
                  {selectedIds.has(c.id) ? (
                    <span className="h-3 w-3 rounded-sm bg-[var(--accent)]" />
                  ) : (
                    <span className="h-3 w-3 rounded-sm border" style={{ borderColor: 'var(--border)' }} />
                  )}
                </button>
                <Link
                  href={crmPath(`/customers?customer=${c.id}${groupQuery}`)}
                  className={`flex-1 min-w-0 block rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-200 ${
                    selectedId === c.id
                      ? 'border-l-2 border-[var(--accent)] bg-[var(--accent)]/10'
                      : 'border-l-2 border-transparent hover:bg-white/5'
                  }`}
                  style={{
                    color: selectedId === c.id ? 'var(--text-1)' : 'var(--text-2)',
                  }}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  )
}
