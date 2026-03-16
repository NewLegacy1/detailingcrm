'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MapPin } from 'lucide-react'
import { AddressAutocomplete } from '@/components/address-autocomplete'

export type ServiceMode = 'mobile' | 'shop' | 'both'

interface ShopLocationSettingsProps {
  isPro: boolean
}

export function ShopLocationSettings({ isPro }: ShopLocationSettingsProps) {
  const [mode, setMode] = useState<ServiceMode>('mobile')
  const [shopAddress, setShopAddress] = useState('')
  const [shopAddressLat, setShopAddressLat] = useState<number | null>(null)
  const [shopAddressLng, setShopAddressLng] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!isPro) {
      setLoading(false)
      return
    }
    fetch('/api/settings/organization')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.service_mode === 'shop' || data?.service_mode === 'both') {
          setMode(data.service_mode)
        }
        if (data?.shop_address) {
          setShopAddress(String(data.shop_address).trim())
        }
        if (data?.shop_address_lat != null) setShopAddressLat(Number(data.shop_address_lat))
        if (data?.shop_address_lng != null) setShopAddressLng(Number(data.shop_address_lng))
      })
      .finally(() => setLoading(false))
  }, [isPro])

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_mode: mode,
          shop_address: shopAddress.trim() || null,
          shop_address_lat: shopAddressLat,
          shop_address_lng: shopAddressLng,
        }),
      })
      if (res.ok) setMessage({ type: 'success', text: 'Saved.' })
      else setMessage({ type: 'error', text: (await res.json()).error || 'Failed to save' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save' })
    }
    setSaving(false)
  }

  if (!isPro) return null

  if (loading) {
    return <div className="text-[var(--text-muted)] text-sm">Loading…</div>
  }

  return (
    <section className="card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-[var(--text-2)]" />
        <h2 className="section-title text-[var(--text)]">Service location</h2>
      </div>
      <p className="text-sm text-[var(--text-muted)]">
        Choose whether you offer mobile detailing only, service at your shop only, or both. Shop location is a Pro feature. Customers will see the option to book at your shop or at their address when you offer both.
      </p>

      <div className="space-y-3">
        <Label className="text-[var(--text)]">Service type</Label>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 cursor-pointer hover:bg-[var(--surface-1)]">
            <input
              type="radio"
              name="service_mode"
              checked={mode === 'mobile'}
              onChange={() => setMode('mobile')}
              className="text-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text)]">Mobile only — we come to the customer</span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 cursor-pointer hover:bg-[var(--surface-1)]">
            <input
              type="radio"
              name="service_mode"
              checked={mode === 'shop'}
              onChange={() => setMode('shop')}
              className="text-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text)]">Shop only — customer comes to us</span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 cursor-pointer hover:bg-[var(--surface-1)]">
            <input
              type="radio"
              name="service_mode"
              checked={mode === 'both'}
              onChange={() => setMode('both')}
              className="text-[var(--accent)]"
            />
            <span className="text-sm text-[var(--text)]">Both — customer can choose shop or their address</span>
          </label>
        </div>
      </div>

      {(mode === 'shop' || mode === 'both') && (
        <div className="space-y-2">
          <Label className="text-[var(--text)]">Shop address</Label>
          <AddressAutocomplete
            value={shopAddress}
            onChange={setShopAddress}
            onPlaceSelect={({ address, lat, lng }) => {
              setShopAddress(address)
              setShopAddressLat(lat ?? null)
              setShopAddressLng(lng ?? null)
            }}
            placeholder="Enter your shop address"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {message && (
          <span className={message.type === 'success' ? 'text-green-500' : 'text-red-400'}>{message.text}</span>
        )}
      </div>
    </section>
  )
}
