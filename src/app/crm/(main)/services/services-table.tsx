'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Pencil, Trash2, Upload, Loader2, X, Copy, ChevronUp, ChevronDown, ArrowRightToLine } from 'lucide-react'
import type { Service, ServiceCategory } from '@/types/database'

const TEMPLATE_IMAGE_PATTERNS = ['/images/stock/', '/images/icons/']

function normalizePhotoUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === 'string' && u.length > 0)
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string' && u.length > 0) : [raw]
    } catch {
      return raw.trim() ? [raw] : []
    }
  }
  return []
}

const DEFAULT_SIZE_OPTIONS = [
  { size_key: 'sedan', label: 'Sedan', price_offset: 0 },
  { size_key: 'suv_5', label: 'SUV 5-seat', price_offset: 20 },
  { size_key: 'suv_7', label: 'SUV 7-seat', price_offset: 30 },
  { size_key: 'truck', label: 'Truck', price_offset: 40 },
] as const

type SizePriceRow = { size_key: string; label: string; price_offset: number }

interface ServicesTableProps {
  initialServices: Service[]
  initialCategories: ServiceCategory[]
  orgId?: string | null
}

export function ServicesTable({ initialServices, initialCategories, orgId }: ServicesTableProps) {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [categories, setCategories] = useState<ServiceCategory[]>(initialCategories)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    duration_mins: 60,
    base_price: 0,
    cost: 0,
    description: '',
    category_id: null as string | null,
    photo_urls: [] as string[],
    size_prices: [] as SizePriceRow[],
  })
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templates, setTemplates] = useState<{ id: string; name: string; duration_mins: number; base_price: number; description: string | null; image_url: string | null; sort_order: number }[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [addingFromTemplate, setAddingFromTemplate] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  function openCreateDialog(categoryId?: string | null) {
    setFormError(null)
    setEditingService(null)
    setFormData({
      name: '',
      duration_mins: 60,
      base_price: 0,
      cost: 0,
      description: '',
      category_id: categoryId ?? null,
      photo_urls: [],
      size_prices: DEFAULT_SIZE_OPTIONS.map((s) => ({ ...s })),
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(service: Service) {
    setFormError(null)
    setEditingService(service)
    const urls = normalizePhotoUrls(service.photo_urls)
    setFormData({
      name: service.name,
      duration_mins: service.duration_mins,
      base_price: service.base_price,
      cost: service.cost ?? 0,
      description: service.description ?? '',
      category_id: service.category_id ?? null,
      photo_urls: urls,
      size_prices: DEFAULT_SIZE_OPTIONS.map((s) => ({ ...s })),
    })
    setIsDialogOpen(true)
  }

  // Load size prices when editing
  useEffect(() => {
    if (!editingService?.id || !isDialogOpen) return
    const supabase = createClient()
    supabase
      .from('service_size_prices')
      .select('size_key, label, price_offset')
      .eq('service_id', editingService.id)
      .then(({ data }) => {
        if (data?.length) {
          setFormData((prev) => ({
            ...prev,
            size_prices: data.map((r) => ({
              size_key: r.size_key,
              label: r.label,
              price_offset: Number(r.price_offset) ?? 0,
            })),
          }))
        } else {
          setFormData((prev) => ({
            ...prev,
            size_prices: DEFAULT_SIZE_OPTIONS.map((s) => ({ ...s })),
          }))
        }
      })
  }, [editingService?.id, isDialogOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!formData.name.trim()) {
      setFormError('Please enter a service name.')
      return
    }
    if (!editingService && !orgId) {
      setFormError('No organization linked. Your profile must be linked to a business to add services.')
      return
    }
    setLoading(true)
    const supabase = createClient()

    const payload = {
      name: formData.name.trim(),
      duration_mins: formData.duration_mins,
      base_price: formData.base_price,
      cost: formData.cost,
      description: formData.description.trim() || null,
      category_id: formData.category_id || null,
      photo_urls: formData.photo_urls.length > 0 ? formData.photo_urls : [],
      ...(orgId && !editingService ? { org_id: orgId } : {}),
    }

    let serviceId: string | null = null
    if (editingService) {
      const { data, error } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editingService.id)
        .select()
        .single()
      if (error) {
        setFormError(error.message || 'Failed to update service.')
        setLoading(false)
        return
      }
      if (data) {
        serviceId = data.id
        const updated = { ...data, photo_urls: normalizePhotoUrls(data.photo_urls) }
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      }
    } else {
      const { data, error } = await supabase.from('services').insert([payload]).select().single()
      if (error) {
        setFormError(error.message || 'Failed to add service.')
        setLoading(false)
        return
      }
      if (data) {
        serviceId = data.id
        const inserted = { ...data, photo_urls: normalizePhotoUrls(data.photo_urls) }
        setServices((prev) => [inserted as Service, ...prev])
      }
    }
    if (serviceId && formData.size_prices.length > 0) {
      await supabase.from('service_size_prices').delete().eq('service_id', serviceId)
      await supabase.from('service_size_prices').insert(
        formData.size_prices.map((row) => ({
          service_id: serviceId,
          size_key: row.size_key,
          label: row.label,
          price_offset: row.price_offset,
        }))
      )
    }
    if (serviceId) {
      setIsDialogOpen(false)
      const msg = editingService ? 'Service updated.' : 'Service added.'
      setSuccessMessage(msg)
      setTimeout(() => setSuccessMessage(null), 4000)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this service?')) return
    const supabase = createClient()
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (!error) setServices((prev) => prev.filter((s) => s.id !== id))
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim()
    if (!name || !orgId) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('service_categories')
      .insert({ org_id: orgId, name, sort_order: categories.length })
      .select()
      .single()
    if (!error && data) {
      setCategories((prev) => [...prev, data as ServiceCategory])
      setNewCategoryName('')
      setAddingCategory(false)
      setSuccessMessage('Category added.')
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  async function handleRenameCategory(id: string, name: string) {
    if (!name.trim()) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('service_categories')
      .update({ name: name.trim() })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: (data as ServiceCategory).name } : c)))
      setEditingCategoryId(null)
      setSuccessMessage('Category renamed.')
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  async function handleDeleteCategory(cat: ServiceCategory) {
    if (!confirm(`Delete category "${cat.name}"? Services in it will move to Uncategorized.`)) return
    const supabase = createClient()
    await supabase.from('services').update({ category_id: null }).eq('category_id', cat.id)
    const { error } = await supabase.from('service_categories').delete().eq('id', cat.id)
    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
      setServices((prev) => prev.map((s) => (s.category_id === cat.id ? { ...s, category_id: null } : s)))
      setSuccessMessage('Category deleted.')
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  async function handleRemoveServiceFromCategory(service: Service) {
    if (!service.category_id) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('services')
      .update({ category_id: null })
      .eq('id', service.id)
      .select()
      .single()
    if (!error && data) setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, category_id: null } : s)))
  }

  async function handleMoveCategory(cat: ServiceCategory, direction: 'up' | 'down') {
    const idx = categories.findIndex((c) => c.id === cat.id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= categories.length) return
    const swapped = categories[swapIdx]
    const supabase = createClient()
    const newOrder = [...categories]
    ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]
    setCategories(newOrder)
    await Promise.all([
      supabase.from('service_categories').update({ sort_order: swapIdx }).eq('id', cat.id),
      supabase.from('service_categories').update({ sort_order: idx }).eq('id', swapped.id),
    ])
  }

  function renderServiceRow(service: Service) {
    const cost = Number(service.cost ?? 0)
    const price = Number(service.base_price)
    const profit = price - cost
    return (
      <TableRow key={service.id} className="border-white/5 text-[var(--text-secondary)] hover:bg-white/5">
        <TableCell className="font-medium text-white">{service.name}</TableCell>
        <TableCell>{service.duration_mins} min</TableCell>
        <TableCell>${price.toLocaleString()}</TableCell>
        <TableCell>${cost.toLocaleString()}</TableCell>
        <TableCell>${profit.toLocaleString()}</TableCell>
        <TableCell className="max-w-[200px] truncate">{service.description || '—'}</TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => openEditDialog(service)}>
              <Pencil className="h-4 w-4" />
            </Button>
            {service.category_id && (
              <button
                type="button"
                onClick={() => handleRemoveServiceFromCategory(service)}
                title="Remove from category"
                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5"
              >
                <ArrowRightToLine className="h-4 w-4" />
              </button>
            )}
            <Button variant="ghost" size="sm" onClick={() => handleDelete(service.id)}>
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    setFormError(null)
    const urls: string[] = []
    const errors: string[] = []

    const formDataUpload = new FormData()
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: not an image`)
        continue
      }
      formDataUpload.append('files', file)
    }

    if (formDataUpload.getAll('files').length === 0) {
      if (errors.length > 0) setFormError(errors.join('; '))
      setUploading(false)
      e.target.value = ''
      return
    }

    try {
      const res = await fetch('/api/services/upload-photo', {
        method: 'POST',
        body: formDataUpload,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || `Upload failed (${res.status})`)
        setUploading(false)
        e.target.value = ''
        return
      }
      const uploadedUrls = Array.isArray(data.urls) ? data.urls : []
      if (data.errors?.length) {
        errors.push(...data.errors)
      }
      if (uploadedUrls.length > 0) {
        const prev = formData.photo_urls
        const isSingleTemplateImage =
          prev.length === 1 && TEMPLATE_IMAGE_PATTERNS.some((p) => (prev[0] ?? '').startsWith(p))
        const nextUrls =
          isSingleTemplateImage && uploadedUrls.length > 0
            ? uploadedUrls
            : [...prev, ...uploadedUrls]
        setFormData((form) => ({ ...form, photo_urls: nextUrls }))
      }
      if (errors.length > 0) {
        setFormError(`Some files could not be uploaded: ${errors.slice(0, 2).join('; ')}`)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(false)
    e.target.value = ''
  }

  function removePhotoUrl(index: number) {
    setFormData((prev) => ({
      ...prev,
      photo_urls: prev.photo_urls.filter((_, i) => i !== index),
    }))
  }

  function updateSizePrice(index: number, field: 'label' | 'price_offset', value: string | number) {
    setFormData((prev) => {
      const next = [...prev.size_prices]
      if (field === 'price_offset') next[index] = { ...next[index], price_offset: Number(value) || 0 }
      else next[index] = { ...next[index], label: String(value) }
      return { ...prev, size_prices: next }
    })
  }

  useEffect(() => {
    if (!templateDialogOpen) return
    setLoadingTemplates(true)
    const supabase = createClient()
    Promise.resolve(
      supabase
        .from('service_templates')
        .select('id, name, duration_mins, base_price, description, image_url, sort_order')
        .order('sort_order')
    )
      .then(({ data }) => {
        setTemplates(data ?? [])
      })
      .finally(() => setLoadingTemplates(false))
  }, [templateDialogOpen])

  async function addServiceFromTemplate(t: (typeof templates)[0]) {
    if (!orgId) return
    setAddingFromTemplate(t.id)
    const supabase = createClient()
    const { data: newService, error: svcError } = await supabase
      .from('services')
      .insert({
        org_id: orgId,
        name: t.name,
        duration_mins: t.duration_mins,
        base_price: t.base_price,
        description: t.description ?? null,
        photo_urls: [],
      })
      .select()
      .single()
    if (svcError || !newService) {
      setAddingFromTemplate(null)
      setFormError(svcError?.message ?? 'Failed to add service from template.')
      return
    }
    await supabase.from('service_size_prices').insert(
      DEFAULT_SIZE_OPTIONS.map((s) => ({
        service_id: newService.id,
        size_key: s.size_key,
        label: s.label,
        price_offset: s.price_offset,
      }))
    )
    setServices((prev) => [newService as Service, ...prev])
    setTemplateDialogOpen(false)
    setAddingFromTemplate(null)
    setSuccessMessage(`"${t.name}" added from template. You can edit it anytime.`)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  function addCustomSize() {
    setFormData((prev) => ({
      ...prev,
      size_prices: [...prev.size_prices, { size_key: `custom_${Date.now()}`, label: 'Custom', price_offset: 0 }],
    }))
  }

  function removeSizePrice(index: number) {
    setFormData((prev) => ({ ...prev, size_prices: prev.size_prices.filter((_, i) => i !== index) }))
  }

  return (
    <>
      {successMessage && (
        <p className="mb-4 text-sm text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2" role="status">
          {successMessage}
        </p>
      )}
      <div className="flex justify-end gap-2 mb-4">
        {orgId && (
          <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
            <Copy className="mr-2 h-4 w-4" />
            Add from template
          </Button>
        )}
        <Button onClick={() => openCreateDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Categories: add new */}
      {orgId && (
        <div className="mb-4">
          {addingCategory ? (
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Category name (e.g. Basic, Premium)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                className="max-w-xs border-white/10 bg-[var(--surface-1)]"
              />
              <Button size="sm" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingCategory(false); setNewCategoryName('') }}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAddingCategory(true)}>
              + Add category
            </Button>
          )}
        </div>
      )}

      {services.length === 0 && categories.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            iconName="Wrench"
            headline="No services yet"
            subtext="Add a category (e.g. Basic, Premium), then add services and assign them to categories. They’ll appear grouped on your booking page."
            ctaLabel="Add Service"
            ctaOnClick={() => openCreateDialog()}
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Uncategorized */}
          {(() => {
            const uncategorized = services.filter((s) => !s.category_id)
            return (
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-1)]/50">
                  <span className="text-sm font-semibold text-[var(--text-muted)]">Uncategorized</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Name</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Duration</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Price</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Cost</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Profit</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Description</TableHead>
                      <TableHead className="w-24 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uncategorized.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-sm text-[var(--text-muted)] py-4">
                          No services. Assign a category when adding/editing a service, or add one here.
                        </TableCell>
                      </TableRow>
                    ) : (
                      uncategorized.map((service) => renderServiceRow(service))
                    )}
                  </TableBody>
                </Table>
              </Card>
            )
          })()}

          {/* Each category */}
          {categories.map((cat, idx) => {
            const inCategory = services.filter((s) => s.category_id === cat.id)
            return (
              <Card key={cat.id} className="overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-1)]/50 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(cat, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30"
                        title="Move category up (order on booking page)"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(cat, 'down')}
                        disabled={idx === categories.length - 1}
                        className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30"
                        title="Move category down (order on booking page)"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    {editingCategoryId === cat.id ? (
                      <>
                        <Input
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameCategory(cat.id, editingCategoryName)}
                          className="h-8 w-48 border-white/10 bg-[var(--surface-1)] text-sm"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleRenameCategory(cat.id, editingCategoryName)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-[var(--text-1)]">{cat.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openCreateDialog(cat.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add service
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => handleDeleteCategory(cat)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Name</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Duration</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Price</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Cost</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Profit</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Description</TableHead>
                      <TableHead className="w-24 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inCategory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-sm text-[var(--text-muted)] py-4">
                          No services in this category. Add one above or move a service here by editing it.
                        </TableCell>
                      </TableRow>
                    ) : (
                      inCategory.map((service) => renderServiceRow(service))
                    )}
                  </TableBody>
                </Table>
              </Card>
            )
          })}
        </div>
      )}


      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogClose onClick={() => setTemplateDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>Add service from template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-muted)]">
            Start from a stock service and customize name, price, and photos for your business.
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
                  {t.image_url && (
                    <img
                      src={t.image_url}
                      alt=""
                      className="h-14 w-20 object-cover rounded border border-[var(--border)]"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-1)]">{t.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {t.duration_mins} min · ${Number(t.base_price).toLocaleString()}
                      {t.description ? ` · ${t.description.slice(0, 50)}${t.description.length > 50 ? '…' : ''}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={!!addingFromTemplate}
                    onClick={() => addServiceFromTemplate(t)}
                  >
                    {addingFromTemplate === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Use template'
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogClose onClick={() => setIsDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          {formError && (
            <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2" role="alert">
              {formError}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="border-white/10 bg-[var(--surface-1)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration_mins">Duration (minutes) *</Label>
                <Input
                  id="duration_mins"
                  type="number"
                  min={1}
                  value={formData.duration_mins}
                  onChange={(e) => setFormData((prev) => ({ ...prev, duration_mins: Number(e.target.value) || 0 }))}
                  className="border-white/10 bg-[var(--surface-1)]"
                />
              </div>
              <div>
                <Label htmlFor="base_price">Price ($) *</Label>
                <Input
                  id="base_price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.base_price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, base_price: Number(e.target.value) || 0 }))}
                  className="border-white/10 bg-[var(--surface-1)]"
                />
              </div>
              <div>
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.cost}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cost: Number(e.target.value) || 0 }))}
                  className="border-white/10 bg-[var(--surface-1)]"
                />
              </div>
              <div className="flex items-end">
                <p className="text-sm text-[var(--text-muted)]">Profit: ${(formData.base_price - formData.cost).toFixed(2)} (auto)</p>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="border-white/10 bg-[var(--surface-1)]"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={formData.category_id ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value || null }))}
                className="mt-1 flex h-10 w-full rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-1)]"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-1">Groups services on the booking page.</p>
            </div>
            <div>
              <Label>Car size pricing (optional)</Label>
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Base price above applies to sedan. Add extra amount per vehicle size.
              </p>
              <div className="space-y-4">
                {formData.size_prices.map((row, index) => (
                  <div
                    key={row.size_key}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-sm font-semibold text-[var(--text-1)]">
                        {row.label || 'Unnamed size'}
                      </span>
                      {row.size_key.startsWith('custom_') && (
                        <button
                          type="button"
                          onClick={() => removeSizePrice(index)}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded text-xs"
                          aria-label="Remove this size"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="min-w-[140px]">
                        <Label className="text-xs text-[var(--text-2)]">Size name</Label>
                        <Input
                          placeholder="e.g. Sedan"
                          value={row.label}
                          onChange={(e) => updateSizePrice(index, 'label', e.target.value)}
                          className="mt-1 border-[var(--border)] bg-[var(--surface-2)]"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--text-2)]">Extra charge (added to base price)</Label>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-sm text-[var(--text-muted)]">+ $</span>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            className="w-24 border-[var(--border)] bg-[var(--surface-2)]"
                            value={row.price_offset}
                            onChange={(e) => updateSizePrice(index, 'price_offset', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addCustomSize}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add custom size
                </Button>
              </div>
            </div>
            <div>
              <Label>Photos</Label>
              <p className="mb-2 text-xs text-[var(--text-muted)]">
                Upload images for this service. You can add multiple or replace the placeholder.
              </p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mb-3"
                disabled={uploading}
                onClick={() => photoInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Uploading…' : 'Upload images'}
              </Button>
              {formData.photo_urls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.photo_urls.map((url, index) => (
                    <div key={`photo-${index}-${url}`} className="relative group">
                      <img
                        src={url}
                        alt=""
                        className="h-20 w-20 object-cover rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
                      />
                      <button
                        type="button"
                        onClick={() => removePhotoUrl(index)}
                        className="absolute -top-1 -right-1 rounded-full bg-red-500/90 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-3)]">No photos yet. Click Upload images to add one.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingService ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
