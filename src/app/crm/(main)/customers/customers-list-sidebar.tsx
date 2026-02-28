'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { crmPath } from '@/lib/crm-path'
import { useRouter } from 'next/navigation'
import { Search, Plus, Folder } from 'lucide-react'
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
}

export function CustomersListSidebar({
  customers,
  selectedId,
  groups = [],
  selectedGroupId = null,
}: CustomersListSidebarProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  const groupQuery = selectedGroupId ? `&group=${selectedGroupId}` : ''

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setCreatingGroup(true)
    try {
      const res = await fetch('/api/customers/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      })
      if (res.ok) {
        setNewGroupOpen(false)
        setNewGroupName('')
        router.refresh()
      }
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
        <CustomersAddButton />
        <CustomersUploadCsv />
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
              <Link
                key={g.id}
                href={crmPath(`/customers?group=${g.id}`)}
                className={`block rounded-lg px-2 py-1.5 text-sm flex items-center gap-1.5 ${selectedGroupId === g.id ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : ''}`}
                style={selectedGroupId !== g.id ? { color: 'var(--text-2)' } : undefined}
              >
                <Folder className="h-3.5 w-3 shrink-0" />
                {g.name}
              </Link>
            ))}
        </div>
      </div>
      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent className="max-w-sm">
          <DialogClose onClick={() => setNewGroupOpen(false)} />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">New group</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateGroup} className="space-y-3">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              className="flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-1)]"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNewGroupOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creatingGroup || !newGroupName.trim()}>
                {creatingGroup ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <nav className="flex-1 overflow-y-auto p-2">
        {customers.length === 0 ? (
          <div className="p-4">
            <EmptyState
              iconName="Users"
              headline="No customers yet"
              subtext="Add a customer with the button above or import from CSV."
            />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm" style={{ color: 'var(--text-3)' }}>
            No customers match &quot;{search}&quot;
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link
                  href={crmPath(`/customers?customer=${c.id}${groupQuery}`)}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
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
