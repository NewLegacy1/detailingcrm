'use client'

import { useState, useEffect } from 'react'
import { Palette } from 'lucide-react'
import { CRM_STYLE_PRESETS, CRM_STYLE_PRESET_IDS, type CrmStylePresetId } from '@/lib/crm-style-presets'

export function CrmStylePresetSettings() {
  const [current, setCurrent] = useState<CrmStylePresetId>('midnight')
  const [hasCustomColours, setHasCustomColours] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/settings/organization')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.crm_style_preset === 'carbon' || data?.crm_style_preset === 'frost') {
          setCurrent(data.crm_style_preset)
        }
        setHasCustomColours(data?.crm_use_custom_colours === true)
      })
      .finally(() => setLoading(false))
  }, [])

  async function selectPreset(id: CrmStylePresetId) {
    if (id === current && !hasCustomColours) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crm_style_preset: id,
          crm_use_custom_colours: false,
        }),
      })
      if (res.ok) {
        setCurrent(id)
        setHasCustomColours(false)
        setMessage({ type: 'success', text: 'Style updated. Refreshing…' })
        window.location.reload()
      } else {
        setMessage({ type: 'error', text: (await res.json()).error || 'Failed to save' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save' })
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="text-[var(--text-muted)] text-sm">Loading…</div>
  }

  return (
    <section className="card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-[var(--text-2)]" />
        <h2 className="section-title text-[var(--text)]">CRM style</h2>
      </div>
      <p className="text-sm text-[var(--text-muted)]">
        Choose a look for your CRM. Available on all plans. This only changes colours and typography, not the layout. Pro users can still set custom CRM colours below to override these.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CRM_STYLE_PRESET_IDS.map((id) => {
          const preset = CRM_STYLE_PRESETS[id]
          const isSelected = !hasCustomColours && current === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectPreset(id)}
              disabled={saving}
              className={`rounded-xl border-2 p-4 text-left transition-all hover:border-[var(--accent)]/50 disabled:opacity-60 ${
                isSelected ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20' : 'border-[var(--border)]'
              }`}
            >
              <div className="flex gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg shrink-0"
                  style={{ backgroundColor: preset.preview.bg }}
                />
                <div
                  className="w-4 h-8 rounded shrink-0"
                  style={{ backgroundColor: preset.preview.accent }}
                />
                <div
                  className="flex-1 h-8 rounded shrink-0"
                  style={{ backgroundColor: preset.preview.surface }}
                />
              </div>
              <p className="font-medium text-[var(--text)] text-sm">{preset.label}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{preset.description}</p>
              {isSelected && (
                <p className="text-xs text-[var(--accent)] font-medium mt-2">Current style</p>
              )}
            </button>
          )
        })}
      </div>
      {message && (
        <p className={message.type === 'success' ? 'text-green-500 text-sm' : 'text-red-400 text-sm'}>
          {message.text}
        </p>
      )}
    </section>
  )
}
