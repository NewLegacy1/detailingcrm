'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Merge, Loader2 } from 'lucide-react'

interface DuplicateCustomer {
  id: string
  name: string
  email: string | null
  phone: string | null
}

export function CustomersFindDuplicates() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<DuplicateCustomer[][]>([])
  const [keepChoice, setKeepChoice] = useState<Record<number, string>>({})

  const fetchDuplicates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/customers/duplicates')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setGroups(data.duplicates ?? [])
      setKeepChoice({})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load duplicates')
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  const openDialog = () => {
    setOpen(true)
    fetchDuplicates()
  }

  async function mergeGroup(groupIndex: number) {
    const group = groups[groupIndex]
    const keepId = keepChoice[groupIndex] || group[0]?.id
    if (!keepId || group.length < 2) return
    setMerging(true)
    setError(null)
    try {
      const toRemove = group.filter((c) => c.id !== keepId)
      for (const c of toRemove) {
        const res = await fetch('/api/customers/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keepId, removeId: c.id }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Merge failed')
      }
      setGroups((prev) => prev.filter((_, i) => i !== groupIndex))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Merge failed')
    } finally {
      setMerging(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="w-full justify-center mt-2" onClick={openDialog}>
        <Merge className="h-4 w-4 mr-1" />
        Find duplicates
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); setGroups([]); }}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">Duplicate customers</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-muted)]">
            Customers with the same email or phone are listed below. Choose which record to keep and merge the others into it.
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning…
            </div>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No duplicate customers found.</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {groups.map((group, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border p-3 space-y-2"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                    Duplicate set {idx + 1}
                  </p>
                  {group.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`keep-${idx}`}
                        checked={(keepChoice[idx] ?? group[0]?.id) === c.id}
                        onChange={() => setKeepChoice((p) => ({ ...p, [idx]: c.id }))}
                        className="rounded-full"
                      />
                      <span className="text-sm font-medium text-[var(--text)]">{c.name}</span>
                      {c.email && <span className="text-xs text-[var(--text-muted)] truncate">{c.email}</span>}
                      {c.phone && <span className="text-xs text-[var(--text-muted)]">{c.phone}</span>}
                    </label>
                  ))}
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    disabled={merging}
                    onClick={() => mergeGroup(idx)}
                  >
                    {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-3.5 w-3.5 mr-1" />}
                    Merge into selected
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
