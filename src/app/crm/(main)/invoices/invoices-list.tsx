'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatusPill } from '@/components/ui/status-pill'
import { EmptyState } from '@/components/ui/empty-state'
import { SendInvoiceForm } from './send-invoice-form'
import { Download, ExternalLink, FileText, Loader2, Search } from 'lucide-react'
import type { InvoiceStatusType } from '@/components/ui/status-pill'

interface Invoice {
  id: string
  client_id: string
  status: string
  currency: string
  amount_total: number
  due_date: string | null
  created_at: string
  stripe_invoice_id: string | null
  client?: { id: string; name: string; email: string | null }
  job?: { id: string; service?: { name: string } | null } | null
}

interface InvoicesListProps {
  initialInvoices: Invoice[]
  clients: { id: string; name: string; email: string | null }[]
  initialCustomerId?: string
  initialJobId?: string
  initialLineItems?: { description: string; quantity: number; unit_amount: number; amount: number }[]
}

interface StripeInvoice {
  id: string
  number: string | null
  customerId: string
  customerName: string
  customerEmail: string | null
  amount: number
  currency: string
  status: string
  paid: boolean
  hosted_invoice_url: string | null
  invoice_pdf: string | null
  created: number
  dueDate: number | null
  paidAt: number | null
  description: string | null
  lineItems?: Array<{
    description: string
    quantity: number
    amount: number
    currency: string
  }>
}

type UnifiedRow = {
  id: string
  source: 'local' | 'stripe'
  clientName: string
  clientEmail: string | null
  serviceName: string | null
  amountDisplay: string
  currency: string
  dueDate: string | null
  createdDate: string | null
  status: string
  displayStatus: InvoiceStatusType
  paid: boolean
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
  number?: string | null
}

export function InvoicesList({ initialInvoices, clients, initialCustomerId, initialJobId, initialLineItems }: InvoicesListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [stripeInvoices, setStripeInvoices] = useState<StripeInvoice[]>([])
  const [loadingStripe, setLoadingStripe] = useState(true)
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [sendOpen, setSendOpen] = useState(Boolean(initialCustomerId || initialJobId))
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function load() {
      setStripeError(null)
      try {
        const response = await fetch('/api/invoices/stripe')
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to fetch Stripe invoices')
        }
        const data = await response.json()
        setStripeInvoices(data.invoices ?? [])
      } catch (err: unknown) {
        setStripeError(err instanceof Error ? err.message : 'Failed to load Stripe invoices')
        setStripeInvoices([])
      } finally {
        setLoadingStripe(false)
      }
    }
    load()
  }, [])

  const mergedList = useMemo((): UnifiedRow[] => {
    const stripeById = new Map(stripeInvoices.map((inv) => [inv.id, inv]))
    const localStripeIds = new Set(
      invoices
        .map((inv) => inv.stripe_invoice_id)
        .filter((id): id is string => Boolean(id))
    )

    const rows: UnifiedRow[] = []

    const today = new Date().toISOString().slice(0, 10)
    function toDisplayStatus(status: string, dueDate: string | null, paid: boolean): InvoiceStatusType {
      if (paid) return 'paid'
      if ((status === 'sent' || status === 'pending' || status === 'open') && dueDate && dueDate < today) return 'overdue'
      if (status === 'draft') return 'draft'
      if (status === 'void') return 'void'
      if (status === 'sent' || status === 'pending' || status === 'open') return 'sent'
      return 'draft'
    }

    invoices.forEach((inv) => {
      const stripe = inv.stripe_invoice_id ? stripeById.get(inv.stripe_invoice_id) : null
      const serviceName = inv.job?.service?.name ?? null
      const paid = inv.status === 'paid' || (stripe?.paid ?? false)
      const status = stripe ? (stripe.paid ? 'paid' : stripe.status) : inv.status
      rows.push({
        id: inv.id,
        source: 'local',
        clientName: inv.client?.name ?? '—',
        clientEmail: inv.client?.email ?? null,
        serviceName,
        amountDisplay: `${inv.currency.toUpperCase()} ${Number(inv.amount_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        currency: inv.currency,
        dueDate: inv.due_date,
        createdDate: inv.created_at?.slice(0, 10) ?? null,
        status,
        displayStatus: toDisplayStatus(status, inv.due_date, paid),
        paid,
        hostedInvoiceUrl: stripe?.hosted_invoice_url ?? null,
        invoicePdf: stripe?.invoice_pdf ?? null,
      })
    })

    stripeInvoices.forEach((inv) => {
      if (localStripeIds.has(inv.id)) return
      const dueDateStr = inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : null
      const createdStr = inv.created ? new Date(inv.created).toISOString().slice(0, 10) : null
      const status = inv.paid ? 'paid' : inv.status
      rows.push({
        id: `stripe-${inv.id}`,
        source: 'stripe',
        clientName: inv.customerName,
        clientEmail: inv.customerEmail,
        serviceName: inv.lineItems?.[0]?.description ?? null,
        amountDisplay: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: inv.currency.toLowerCase(),
          minimumFractionDigits: 2,
        }).format(inv.amount / 100),
        currency: inv.currency,
        dueDate: dueDateStr,
        createdDate: createdStr,
        status,
        displayStatus: toDisplayStatus(status, dueDateStr, inv.paid),
        paid: inv.paid,
        hostedInvoiceUrl: inv.hosted_invoice_url,
        invoicePdf: inv.invoice_pdf,
        number: inv.number,
      })
    })

    rows.sort((a, b) => {
      const dateA = a.dueDate || ''
      const dateB = b.dueDate || ''
      return dateB.localeCompare(dateA)
    })

    return rows
  }, [invoices, stripeInvoices])

  const filteredList = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return mergedList
    const qLower = q.toLowerCase()
    // If query looks like a date (YYYY-MM-DD or MM/DD or MM-DD), filter by due/created date
    const isoDateMatch = q.match(/^\d{4}-\d{2}-\d{2}$/)
    const slashDateMatch = q.match(/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/)
    const dashDateMatch = q.match(/^\d{1,2}-\d{1,2}(-\d{2,4})?$/)
    if (isoDateMatch) {
      return mergedList.filter((row) => {
        const d = row.dueDate || row.createdDate || ''
        return d === q
      })
    }
    if (slashDateMatch || dashDateMatch) {
      const normalized = q.replace(/-/g, '/')
      return mergedList.filter((row) => {
        const d = row.dueDate || row.createdDate || ''
        if (!d) return false
        const [y, m, day] = d.split('-')
        return `${m}/${day}/${y}`.includes(normalized) || d.includes(q.replace(/\//g, '-'))
      })
    }
    return mergedList.filter(
      (row) =>
        row.clientName.toLowerCase().includes(qLower) ||
        (row.serviceName ?? '').toLowerCase().includes(qLower)
    )
  }, [mergedList, searchQuery])

  function onInvoiceSent(newInvoice: Invoice) {
    setInvoices((prev) => [newInvoice, ...prev])
    setSendOpen(false)
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            placeholder="Search by customer name, service name, or date (YYYY-MM-DD)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-white/10 bg-[var(--surface-1)] pl-8"
          />
        </div>
        <Button onClick={() => setSendOpen(true)}>
          <FileText className="mr-2 h-4 w-4" />
          Send invoice
        </Button>
      </div>

      {stripeError && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{stripeError}</p>
        </div>
      )}

      <Card className="overflow-hidden hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Client</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Service</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Amount</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Date</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingStripe && mergedList.length === 0 ? (
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                  <Loader2 className="mr-2 inline-block h-6 w-6 animate-spin" />
                  Loading invoices...
                </TableCell>
              </TableRow>
            ) : filteredList.length === 0 ? (
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    iconName="FileText"
                    headline={mergedList.length === 0 ? 'No invoices yet' : 'No matches'}
                    subtext={mergedList.length === 0 ? 'Send an invoice to get started. You can pull customer and services, edit line items, and add custom charges.' : 'Try adjusting your search or date range.'}
                    ctaLabel={mergedList.length === 0 ? 'Send invoice' : undefined}
                    ctaOnClick={mergedList.length === 0 ? () => setSendOpen(true) : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredList.map((row) => (
                <TableRow key={row.id} className="border-white/5 text-[var(--text-secondary)] hover:bg-white/5">
                  <TableCell>
                    <div>
                      <div className="font-medium text-white">{row.clientName}</div>
                      {row.clientEmail && (
                        <div className="text-xs text-[var(--text-muted)]">{row.clientEmail}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{row.serviceName ?? '—'}</TableCell>
                  <TableCell className="font-medium text-white">{row.amountDisplay}</TableCell>
                  <TableCell>
                    {row.dueDate
                      ? new Date(row.dueDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={row.displayStatus} type="invoice" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {row.hostedInvoiceUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(row.hostedInvoiceUrl!, '_blank')}
                          title="View invoice"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      {row.invoicePdf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(row.invoicePdf!, '_blank')}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {row.source === 'local' && !row.hostedInvoiceUrl && (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loadingStripe && mergedList.length === 0 ? (
          <div className="card p-6 text-center text-[var(--text-muted)]">
            <Loader2 className="mr-2 inline-block h-6 w-6 animate-spin" />
            Loading invoices...
          </div>
        ) : filteredList.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              iconName="FileText"
              headline={mergedList.length === 0 ? 'No invoices yet' : 'No matches'}
              subtext={mergedList.length === 0 ? 'Send an invoice to get started. You can pull customer and services, edit line items, and add custom charges.' : 'Try adjusting your search or date range.'}
              ctaLabel={mergedList.length === 0 ? 'Send invoice' : undefined}
              ctaOnClick={mergedList.length === 0 ? () => setSendOpen(true) : undefined}
            />
          </Card>
        ) : (
          filteredList.map((row) => (
            <Card key={row.id} className="p-4 border border-[var(--border)]">
              <div className="font-medium text-white mb-1">{row.clientName}</div>
              {row.clientEmail && <div className="text-xs text-[var(--text-muted)] mb-1">{row.clientEmail}</div>}
              <div className="text-sm text-[var(--text-muted)] mb-1">{row.serviceName ?? '—'}</div>
              <div className="font-medium text-white mb-2">{row.amountDisplay}</div>
              <div className="text-xs text-[var(--text-muted)] mb-2">
                {row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <StatusPill status={row.displayStatus} type="invoice" />
                <div className="flex gap-2">
                  {row.hostedInvoiceUrl && (
                    <Button variant="ghost" size="sm" onClick={() => window.open(row.hostedInvoiceUrl!, '_blank')} title="View invoice">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  {row.invoicePdf && (
                    <Button variant="ghost" size="sm" onClick={() => window.open(row.invoicePdf!, '_blank')} title="Download PDF">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-lg">
          <DialogClose onClick={() => setSendOpen(false)} />
          <DialogHeader>
            <DialogTitle>Send invoice</DialogTitle>
          </DialogHeader>
          <SendInvoiceForm
            clients={clients}
            initialCustomerId={initialCustomerId}
            initialJobId={initialJobId}
            initialLineItems={initialLineItems}
            onSuccess={onInvoiceSent}
            onCancel={() => setSendOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
