'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Upload, Loader2 } from 'lucide-react'

function parseCSV(text: string): { name: string; email?: string; phone?: string; company?: string; address?: string; notes?: string }[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length === 0) return []
  const headerLine = lines[0].toLowerCase()
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const isHeader = headerLine.includes('name') || headerLine.includes('email') || headerLine.includes('phone')
  const start = isHeader ? 1 : 0
  const nameIdx = headers.findIndex((h) => /name/i.test(h))
  const emailIdx = headers.findIndex((h) => /email/i.test(h))
  const phoneIdx = headers.findIndex((h) => /phone|mobile/i.test(h))
  const companyIdx = headers.findIndex((h) => /company/i.test(h))
  const addressIdx = headers.findIndex((h) => /address/i.test(h))
  const notesIdx = headers.findIndex((h) => /notes|note/i.test(h))
  const rows: { name: string; email?: string; phone?: string; company?: string; address?: string; notes?: string }[] = []
  for (let i = start; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const name = (nameIdx >= 0 ? values[nameIdx] : values[0])?.trim() ?? ''
    if (!name) continue
    rows.push({
      name,
      email: emailIdx >= 0 && values[emailIdx] ? values[emailIdx].trim() : undefined,
      phone: phoneIdx >= 0 && values[phoneIdx] ? values[phoneIdx].trim() : undefined,
      company: companyIdx >= 0 && values[companyIdx] ? values[companyIdx].trim() : undefined,
      address: addressIdx >= 0 && values[addressIdx] ? values[addressIdx].trim() : undefined,
      notes: notesIdx >= 0 && values[notesIdx] ? values[notesIdx].trim() : undefined,
    })
  }
  return rows
}

export function CustomersUploadCsv() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<{ name: string; email?: string; phone?: string; company?: string; address?: string; notes?: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        const parsed = parseCSV(text)
        setRows(parsed)
      } catch {
        setError('Could not parse CSV')
        setRows([])
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  async function handleImport() {
    if (rows.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/customers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setOpen(false)
      setRows([])
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="w-full justify-center mt-2" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-1" />
        Upload CSV
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setRows([]); setError(null); }}>
        <DialogContent>
          <DialogClose onClick={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Upload customer list (CSV)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-muted)]">
            CSV should have a header row with columns like Name, Email, Phone. First column is used as name if no header.
          </p>
          <div className="space-y-4">
            <input
              type="file"
              accept=".csv"
              onChange={onFileChange}
              className="block w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[var(--accent)] file:text-white file:cursor-pointer"
            />
            {rows.length > 0 && (
              <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--bg)]">
                <p className="text-sm font-medium text-[var(--text)]">{rows.length} row(s) to import</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Names: {rows.slice(0, 3).map((r) => r.name).join(', ')}{rows.length > 3 ? '...' : ''}</p>
              </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleImport} disabled={loading || rows.length === 0}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</> : `Import ${rows.length} customer(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
