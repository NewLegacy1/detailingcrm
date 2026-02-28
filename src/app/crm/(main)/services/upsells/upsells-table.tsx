'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2, Copy, Loader2 } from 'lucide-react'

interface Upsell {
  id: string
  org_id: string | null
  name: string
  price: number
  category: string
  sort_order: number
  icon_url: string | null
  created_at: string
  updated_at: string
}

interface UpsellsTableProps {
  initialUpsells: Upsell[]
  orgId: string | null
}

export function UpsellsTable({ initialUpsells, orgId }: UpsellsTableProps) {
  const [upsells, setUpsells] = useState<Upsell[]>(initialUpsells)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Upsell | null>(null)
  const [form, setForm] = useState({ name: '', price: 0, category: 'extras', icon_url: '' })
  const [loading, setLoading] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templates, setTemplates] = useState<{ id: string; name: string; price: number; category: string; icon_url: string | null; sort_order: number }[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [addingFromTemplate, setAddingFromTemplate] = useState<string | null>(null)

  const categories = Array.from(new Set(upsells.map((u) => u.category))).sort()
  const byCategory = categories.map((cat) => ({ category: cat, items: upsells.filter((u) => u.category === cat) }))

  function openCreate() {
    setEditing(null)
    setForm({ name: '', price: 0, category: 'extras', icon_url: '' })
    setOpen(true)
  }

  function openEdit(u: Upsell) {
    setEditing(u)
    setForm({ name: u.name, price: Number(u.price), category: u.category, icon_url: u.icon_url ?? '' })
    setOpen(true)
  }

  useEffect(() => {
    if (!templateDialogOpen) return
    setLoadingTemplates(true)
    Promise.resolve(
      createClient()
        .from('upsell_templates')
        .select('id, name, price, category, icon_url, sort_order')
        .order('sort_order')
    )
      .then(({ data }) => {
        setTemplates(data ?? [])
      })
      .finally(() => setLoadingTemplates(false))
  }, [templateDialogOpen])

  async function addUpsellFromTemplate(t: (typeof templates)[0]) {
    if (!orgId) return
    setAddingFromTemplate(t.id)
    const { data, error } = await createClient()
      .from('service_upsells')
      .insert({
        org_id: orgId,
        name: t.name,
        price: t.price,
        category: t.category,
        icon_url: t.icon_url ?? null,
        sort_order: t.sort_order ?? upsells.length,
      })
      .select()
      .single()
    setAddingFromTemplate(null)
    if (error || !data) return
    setUpsells((prev) => [data as Upsell, ...prev])
    setTemplateDialogOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const payload = {
      name: form.name.trim(),
      price: form.price,
      category: form.category.trim() || 'extras',
      sort_order: editing?.sort_order ?? upsells.length,
      icon_url: form.icon_url.trim() || null,
    }
    if (editing) {
      const { data, error } = await supabase.from('service_upsells').update(payload).eq('id', editing.id).select().single()
      if (!error && data) {
        setUpsells((prev) => prev.map((u) => (u.id === data.id ? data : u)))
        setOpen(false)
      }
    } else {
      const { data, error } = await supabase.from('service_upsells').insert([{ ...payload, org_id: orgId }]).select().single()
      if (!error && data) {
        setUpsells((prev) => [data, ...prev])
        setOpen(false)
      }
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this add-on?')) return
    const supabase = createClient()
    const { error } = await supabase.from('service_upsells').delete().eq('id', id)
    if (!error) setUpsells((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        {orgId && (
          <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
            <Copy className="mr-2 h-4 w-4" />
            Add from template
          </Button>
        )}
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add add-on
        </Button>
      </div>
      <div className="card overflow-hidden">
        {byCategory.length === 0 ? (
          <p className="text-center text-[var(--text-muted)] py-12">No add-ons yet. Add one to offer extras during booking and on jobs and invoices.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCategory.flatMap(({ category, items }) =>
                items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium capitalize">{category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {u.icon_url && (
                          <img src={u.icon_url} alt="" className="h-6 w-6 object-contain" />
                        )}
                        {u.name}
                      </div>
                    </TableCell>
                    <TableCell>${Number(u.price).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogClose onClick={() => setTemplateDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Add add-on from template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-muted)]">
            Use a stock add-on and customize name or price if you like.
          </p>
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4">No templates available.</p>
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4"
                >
                  {t.icon_url && (
                    <img src={t.icon_url} alt="" className="h-8 w-8 object-contain flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-1)]">{t.name}</p>
                    <p className="text-xs text-[var(--text-muted)] capitalize">{t.category} · ${Number(t.price).toLocaleString()}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={!!addingFromTemplate}
                    onClick={() => addUpsellFromTemplate(t)}
                  >
                    {addingFromTemplate === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Use template'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClick={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit add-on' : 'Add add-on'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="upsell-name">Name *</Label>
              <Input id="upsell-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="upsell-price">Price ($) *</Label>
              <Input id="upsell-price" type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label htmlFor="upsell-category">Category</Label>
              <Input id="upsell-category" placeholder="e.g. ceramic, extras, recommended" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="upsell-icon">Icon URL (optional)</Label>
              <Input id="upsell-icon" placeholder="/images/icons/example.svg" value={form.icon_url} onChange={(e) => setForm((p) => ({ ...p, icon_url: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
