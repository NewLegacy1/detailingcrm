'use client'

import { ProfileForm } from './profile-form'
import type { Profile } from '@/types/database'

interface SettingsTabsProps {
  profile: Pick<Profile, 'id' | 'display_name' | 'business_name' | 'avatar_url'> | null
}

export function SettingsTabs({ profile }: SettingsTabsProps) {
  return (
    <div className="space-y-6">
      <ProfileForm profile={profile} />
    </div>
  )
}
