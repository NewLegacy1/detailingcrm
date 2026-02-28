'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Mail, Lock, LogOut, Shield } from 'lucide-react'

const cardClass =
  'p-6 space-y-4 max-w-xl rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-card)]'
const cardStyle = {
  background: 'var(--accent-gradient)',
  boxShadow: 'var(--shadow-card), 0 0 0 1px rgba(255,255,255,0.06)',
}
const inputClass =
  'bg-black/20 border-white/20 text-[var(--text)] placeholder:text-[var(--text-muted)]'
const btnClass =
  'bg-black text-[var(--accent)] border border-[var(--accent)]/50 hover:bg-black/90 hover:text-[var(--accent)]'

type Message = { type: 'success' | 'error'; text: string }

interface AccountSecurityFormProps {
  initialEmail: string
}

export function AccountSecurityForm({ initialEmail }: AccountSecurityFormProps) {
  const router = useRouter()
  const [emailMsg, setEmailMsg] = useState<Message | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<Message | null>(null)

  // Change email
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  // Change password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailMsg(null)
    const email = newEmail.trim()
    const confirm = confirmEmail.trim()
    if (!email) {
      setEmailMsg({ type: 'error', text: 'Enter a new email address.' })
      return
    }
    if (email !== confirm) {
      setEmailMsg({ type: 'error', text: 'New email and confirmation do not match.' })
      return
    }
    if (email === initialEmail) {
      setEmailMsg({ type: 'error', text: 'New email is the same as your current email.' })
      return
    }
    setEmailLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.updateUser({ email })
    setEmailLoading(false)
    if (error) {
      setEmailMsg({ type: 'error', text: error.message })
      return
    }
    setEmailMsg({
      type: 'success',
      text: 'A confirmation link was sent to your new email. Check both inboxes and click the link to complete the change.',
    })
    setNewEmail('')
    setConfirmEmail('')
    if (data?.user?.email) router.refresh()
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    const newPass = newPassword.trim()
    const confirm = confirmPassword.trim()
    if (!currentPassword.trim()) {
      setPasswordMsg({ type: 'error', text: 'Enter your current password.' })
      return
    }
    if (newPass.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' })
      return
    }
    if (newPass !== confirm) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' })
      return
    }
    setPasswordLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: initialEmail,
      password: currentPassword.trim(),
    })
    if (signInError) {
      setPasswordLoading(false)
      setPasswordMsg({ type: 'error', text: 'Current password is incorrect.' })
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPass })
    setPasswordLoading(false)
    if (updateError) {
      setPasswordMsg({ type: 'error', text: updateError.message })
      return
    }
    setPasswordMsg({ type: 'success', text: 'Password updated successfully.' })
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Current account / session */}
      <section className={cardClass} style={cardStyle}>
        <h2 className="section-title text-[var(--text)] flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Sign-in & session
        </h2>
        <div className="space-y-2">
          <Label className="text-[var(--text-muted)] text-xs">Current email</Label>
          <p className="text-[var(--text)] font-medium flex items-center gap-2">
            <Mail className="h-4 w-4 text-[var(--text-muted)]" />
            {initialEmail}
          </p>
        </div>
        <p className="text-[var(--text-muted)] text-sm">
          You are signed in with this account. Change your email or password below, or sign out to use a different account.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={btnClass}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </section>

      {/* Change email */}
      <section className={cardClass} style={cardStyle}>
        <h2 className="section-title text-[var(--text)] flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Change email
        </h2>
        <form onSubmit={handleChangeEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-email" className="text-[var(--text)]">New email address</Label>
            <Input
              id="new-email"
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-email" className="text-[var(--text)]">Confirm new email</Label>
            <Input
              id="confirm-email"
              type="email"
              autoComplete="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
          {emailMsg && (
            <div
              role="alert"
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${
                emailMsg.type === 'success'
                  ? 'bg-green-500/20 text-green-200 border border-green-400/40'
                  : 'bg-red-500/20 text-red-200 border border-red-400/40'
              }`}
            >
              {emailMsg.type === 'success' ? (
                <CheckCircle className="h-5 w-5 shrink-0 text-green-400" aria-hidden />
              ) : (
                <span className="h-5 w-5 shrink-0 flex items-center justify-center text-red-400 font-bold">!</span>
              )}
              <span>{emailMsg.text}</span>
            </div>
          )}
          <Button type="submit" disabled={emailLoading} className={btnClass}>
            {emailLoading ? 'Sending confirmation…' : 'Change email'}
          </Button>
        </form>
      </section>

      {/* Change password */}
      <section className={cardClass} style={cardStyle}>
        <h2 className="section-title text-[var(--text)] flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Change password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-[var(--text)]">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-[var(--text)]">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-[var(--text)]">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
          {passwordMsg && (
            <div
              role="alert"
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${
                passwordMsg.type === 'success'
                  ? 'bg-green-500/20 text-green-200 border border-green-400/40'
                  : 'bg-red-500/20 text-red-200 border border-red-400/40'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle className="h-5 w-5 shrink-0 text-green-400" aria-hidden />
              ) : (
                <span className="h-5 w-5 shrink-0 flex items-center justify-center text-red-400 font-bold">!</span>
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}
          <Button type="submit" disabled={passwordLoading} className={btnClass}>
            {passwordLoading ? 'Updating…' : 'Change password'}
          </Button>
        </form>
      </section>
    </div>
  )
}
