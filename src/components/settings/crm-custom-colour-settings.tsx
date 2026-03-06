'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

/** Normalize to #rrggbb for input[type=color]. Returns fallback if value is not a valid hex. */
function toHexColor(value: string, fallback: string): string {
  const v = value.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{6}$/.test(v)) return '#' + v
  if (/^[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[0] + v[0], g = v[1] + v[1], b = v[2] + v[2]
    return '#' + r + g + b
  }
  return fallback
}

const ACCENT_DEFAULT = '#00b8f5'
const BG_DEFAULT = '#07090f'
const TEXT_DEFAULT = '#eef2ff'

interface CrmCustomColourSettingsProps {
  accent: string
  bg: string
  textColor: string
  /** When true, CRM is showing these custom colours (card appears selected). */
  useCustomColoursActive?: boolean
  onChange: (updates: { crm_accent_color?: string; crm_bg_color?: string; crm_text_color?: string }) => void
}

export function CrmCustomColourSettings({ accent, bg, textColor, useCustomColoursActive = false, onChange }: CrmCustomColourSettingsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const accentInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  const accentHex = accent.trim() ? toHexColor(accent, ACCENT_DEFAULT) : ACCENT_DEFAULT
  const bgHex = bg.trim() ? toHexColor(bg, BG_DEFAULT) : BG_DEFAULT
  const textHex = textColor.trim() ? toHexColor(textColor, TEXT_DEFAULT) : TEXT_DEFAULT

  const hasCustom = !!(accent.trim() || bg.trim() || textColor.trim())
  const isCardHighlighted = useCustomColoursActive

  const openEdit = () => setEditOpen(true)

  async function applyCustomColours() {
    if (applying) return
    setApplying(true)
    try {
      const payload = {
        crm_use_custom_colours: true,
        crm_accent_color: accent.trim() || null,
        crm_bg_color: bg.trim() || null,
        crm_text_color: textColor.trim() || null,
      }
      const res = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) window.location.reload()
    } finally {
      setApplying(false)
    }
  }

  const rows: { key: 'crm_accent_color' | 'crm_bg_color' | 'crm_text_color'; label: string; value: string; defaultHex: string; inputRef: React.RefObject<HTMLInputElement | null> }[] = [
    { key: 'crm_accent_color', label: 'Accent', value: accent, defaultHex: ACCENT_DEFAULT, inputRef: accentInputRef },
    { key: 'crm_bg_color', label: 'Background', value: bg, defaultHex: BG_DEFAULT, inputRef: bgInputRef },
    { key: 'crm_text_color', label: 'Text', value: textColor, defaultHex: TEXT_DEFAULT, inputRef: textInputRef },
  ]

  return (
    <>
      <div
        className={`rounded-xl border-2 p-4 text-left transition-all w-full max-w-sm ${
          isCardHighlighted ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20' : 'border-[var(--border)]'
        } hover:border-[var(--accent)]/50`}
      >
        <button
          type="button"
          onClick={applyCustomColours}
          disabled={applying}
          className="w-full text-left focus:outline-none focus:ring-0"
        >
          <div className="flex gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-lg shrink-0 border border-[var(--border-hi)]"
              style={{ backgroundColor: bgHex }}
            />
            <div
              className="w-4 h-8 rounded shrink-0 border border-[var(--border-hi)]"
              style={{ backgroundColor: accentHex }}
            />
            <div
              className="flex-1 h-8 rounded shrink-0 border border-[var(--border-hi)]"
              style={{ backgroundColor: textHex }}
            />
          </div>
          <p className="font-medium text-[var(--text)] text-sm">Custom colours</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {hasCustom ? 'Your custom accent, background and text.' : 'Preset — click to set your own.'}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {isCardHighlighted && hasCustom && (
              <span className="text-xs text-[var(--accent)] font-medium">Current colours</span>
            )}
            {applying && <span className="text-xs text-[var(--text-muted)]">Applying…</span>}
          </div>
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openEdit}
          className="mt-2 border-[var(--border-hi)] text-[var(--text)]"
        >
          <Pencil className="h-3.5 w-3 mr-1" />
          Edit
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogClose onClick={() => setEditOpen(false)} />
          <DialogHeader>
            <DialogTitle>Edit custom colours</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Set accent, background and text. Leave a field clear to use the style preset for that colour.
          </p>
          <div className="space-y-4">
            {rows.map(({ key, label, value, defaultHex, inputRef }) => {
              const hex = value.trim() ? toHexColor(value, defaultHex) : defaultHex
              const displayHex = value.trim() ? toHexColor(value, defaultHex) : '—'
              const isEmpty = !value.trim()

              return (
                <div key={key} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="w-12 h-12 rounded-lg border-2 border-[var(--border-hi)] shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    style={{ backgroundColor: hex }}
                    title={`Pick ${label}`}
                  />
                  <input
                    ref={inputRef}
                    type="color"
                    value={hex}
                    onChange={(e) => onChange({ [key]: e.target.value })}
                    className="absolute opacity-0 w-0 h-0 overflow-hidden"
                    aria-label={`Pick ${label}`}
                    tabIndex={-1}
                  />
                  <div className="flex-1 min-w-0">
                    <Label className="text-[var(--text)] text-sm">{label}</Label>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{displayHex}</p>
                  </div>
                  {!isEmpty && (
                    <button
                      type="button"
                      onClick={() => onChange({ [key]: '' })}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] underline underline-offset-1 shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={() => setEditOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
