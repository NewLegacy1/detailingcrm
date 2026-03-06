'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle } from 'lucide-react'
import type { Profile } from '@/types/database'

const BUCKET = 'company-logos'

interface ProfileFormProps {
  profile: Pick<Profile, 'id' | 'display_name' | 'business_name' | 'avatar_url'> | null
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [businessName, setBusinessName] = useState(profile?.business_name ?? '')
  const [logoUrl, setLogoUrl] = useState(profile?.avatar_url ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file (e.g. PNG, JPG).' })
      return
    }
    setUploading(true)
    setMessage(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'png'
    const path = `${profile.id}/logo-${Date.now()}.${ext}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setMessage({ type: 'error', text: uploadError.message })
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path)
    setLogoUrl(urlData.publicUrl)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.id) {
      setMessage({ type: 'error', text: 'Profile not loaded. Please refresh the page and try again.' })
      return
    }
    setSaving(true)
    setMessage(null)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName || null,
        business_name: businessName || null,
        avatar_url: logoUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Profile updated.' })
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }
    setSaving(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 space-y-4 max-w-xl rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-card)]"
      style={{
        background: 'var(--accent-gradient)',
        boxShadow: 'var(--shadow-card), 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      <h2 className="section-title text-[var(--text)]">Profile</h2>
      <div className="space-y-2">
        <Label htmlFor="display_name" className="text-[var(--text)]">Display name</Label>
        <Input
          id="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="bg-black/20 border-white/20 text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="business_name" className="text-[var(--text)]">Business or company name</Label>
        <Input
          id="business_name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Your business or company name"
          className="bg-black/20 border-white/20 text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-[var(--text)]">Logo upload</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          disabled={uploading}
          className="block w-full text-sm text-[var(--text)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-[var(--accent)]/50 file:bg-black file:text-[var(--accent)] file:font-medium file:cursor-pointer hover:file:bg-black/90 hover:file:text-[var(--accent)]"
        />
        {uploading && <p className="text-sm text-[var(--text-muted)]">Uploading…</p>}
        {logoUrl && (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={logoUrl}
              alt="Logo preview"
              className="h-16 w-16 rounded-lg object-contain border border-white/20 bg-black/20"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-black text-[var(--accent)] border-[var(--accent)]/50 hover:bg-black/90 hover:text-[var(--accent)]"
              onClick={() => setLogoUrl('')}
            >
              Remove logo
            </Button>
          </div>
        )}
      </div>
      {message && (
        <div
          role="alert"
          className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-500/20 text-green-200 border border-green-400/40'
              : 'bg-red-500/20 text-red-200 border border-red-400/40'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-6 w-6 shrink-0 text-green-400" aria-hidden />
          ) : (
            <span className="h-6 w-6 shrink-0 flex items-center justify-center text-red-400 font-bold">!</span>
          )}
          <span>
            {message.text}
            {message.type === 'success' && ' The left menu will update in a moment.'}
          </span>
        </div>
      )}
      <Button
        type="submit"
        disabled={saving}
        className="bg-black text-[var(--accent)] border border-[var(--accent)]/50 hover:bg-black/90 hover:text-[var(--accent)]"
      >
        {saving ? 'Saving...' : 'Save profile'}
      </Button>
    </form>
  )
}
