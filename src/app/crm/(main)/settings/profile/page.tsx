import { createAuthClient } from '@/lib/supabase/server'
import { ProfileForm } from '../profile-form'

export default async function SettingsProfilePage() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: { id: string; display_name: string | null; business_name: string | null; avatar_url: string | null } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, business_name, avatar_url')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title text-[var(--text)]">Profile</h1>
      <ProfileForm profile={profile ? { id: profile.id, display_name: profile.display_name, business_name: profile.business_name, avatar_url: profile.avatar_url } : null} />
    </div>
  )
}
