'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ListChecks } from 'lucide-react'

/** Default checklist every new org gets; users can change in Settings → Checklist. */
const DEFAULT_DETAILER_CHECKLIST = [
  'Inspect vehicle on arrival',
  'Confirm service and add-ons with customer',
  'Exterior wash and prep',
  'Interior vacuum and clean',
  'Apply protection/coating if applicable',
  'Final inspection and walkthrough',
  'Collect payment',
  'Customer sign-off',
]

interface ChecklistItem {
  id: string
  org_id: string
  label: string
  sort_order: number
}

interface ChecklistSettingsProps {
  orgId: string | null
  initialItems: ChecklistItem[]
}

export function ChecklistSettings({ orgId, initialItems }: ChecklistSettingsProps) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [editItem, setEditItem] = useState<ChecklistItem | null>(null)
  const [editLabel, setEditLabel] = useState('')

  async function addItem() {
    const label = newLabel.trim()
    if (!label || !orgId) return
    setSaving(true)
    const supabase = createClient()
    const sortOrder = items.length
    const { data, error } = await supabase
      .from('organization_default_checklist')
      .insert([{ org_id: orgId, label, sort_order: sortOrder }])
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      setItems((prev) => [...prev, data])
      setNewLabel('')
    }
  }

  function openEdit(item: ChecklistItem) {
    setEditItem(item)
    setEditLabel(item.label)
  }

  function closeEdit() {
    setEditItem(null)
    setEditLabel('')
  }

  async function saveEdit() {
    if (!editItem || !editLabel.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('organization_default_checklist').update({ label: editLabel.trim() }).eq('id', editItem.id)
    setItems((prev) => prev.map((i) => (i.id === editItem.id ? { ...i, label: editLabel.trim() } : i)))
    setSaving(false)
    closeEdit()
  }

  async function removeItem(id: string) {
    if (!confirm('Remove this item from the default checklist?')) return
    const supabase = createClient()
    await supabase.from('organization_default_checklist').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  async function useDefaultChecklist() {
    if (!orgId) return
    setSaving(true)
    const supabase = createClient()
    const toInsert = DEFAULT_DETAILER_CHECKLIST.map((label, sort_order) => ({ org_id: orgId, label, sort_order }))
    const { data, error } = await supabase
      .from('organization_default_checklist')
      .insert(toInsert)
      .select()
    setSaving(false)
    if (!error && data?.length) {
      setItems(data as ChecklistItem[])
    }
  }

  if (!orgId) {
    return <p className="text-sm text-[var(--text-muted)]">No organization. Checklist is saved per organization.</p>
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="new-item" className="sr-only">New checklist item</Label>
          <Input
            id="new-item"
            placeholder="e.g. Inspect vehicle, Confirm service, Collect payment"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
        </div>
        <Button onClick={addItem} disabled={saving || !newLabel.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 py-2 border-b border-[var(--border)] last:border-0">
            <span className="flex-1 text-[var(--text)]">{item.label}</span>
            <Button variant="ghost" size="sm" onClick={() => openEdit(item)} aria-label="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} aria-label="Remove">
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="text-sm text-[var(--text-muted)]">No default items. New jobs will have an empty checklist until you add items here.</p>
          <Button variant="outline" size="sm" onClick={useDefaultChecklist} disabled={saving}>
            <ListChecks className="h-4 w-4 mr-2" />
            Use default detailer checklist
          </Button>
        </div>
      )}

      <Dialog open={!!editItem} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-md">
          <DialogClose onClick={closeEdit} />
          <DialogHeader>
            <DialogTitle className="text-[var(--text)]">Edit checklist item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="edit-checklist-label">Label</Label>
              <Input
                id="edit-checklist-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), saveEdit())}
                placeholder="e.g. Inspect vehicle"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeEdit}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={saving || !editLabel.trim()}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
