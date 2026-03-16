import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

export async function GET() {
  const result = await requirePermission(PERMISSIONS.TEAM_VIEW)
  if ('error' in result) return result.error
  if (!result.auth.orgId) return NextResponse.json({ members: [], multiLocationEnabled: false })

  const supabase = await createAuthClient()
  const [profilesRes, orgRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, role, display_name, created_at, updated_at, location_id')
      .eq('org_id', result.auth.orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('organizations')
      .select('multi_location_enabled')
      .eq('id', result.auth.orgId)
      .single(),
  ])

  if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 })
  let profiles = profilesRes.data ?? []

  // Location managers only see owners and team members at their location
  const viewerLocationId = result.auth.locationId ?? null
  if (viewerLocationId) {
    profiles = profiles.filter(
      (p) => p.role === 'owner' || p.location_id === viewerLocationId
    )
  }

  const locationIds = [...new Set(profiles.map((p) => p.location_id).filter(Boolean) as string[])]
  let locationNames: Record<string, string> = {}
  if (locationIds.length > 0) {
    const { data: locs } = await supabase
      .from('locations')
      .select('id, name')
      .in('id', locationIds)
    locs?.forEach((l) => { locationNames[l.id] = l.name })
  }

  const members = profiles.map((p) => ({
    id: p.id,
    role: p.role,
    display_name: p.display_name,
    created_at: p.created_at,
    updated_at: p.updated_at,
    location_id: p.location_id ?? undefined,
    location_name: p.location_id ? locationNames[p.location_id] : undefined,
  }))

  return NextResponse.json({
    members,
    multiLocationEnabled: orgRes.data?.multi_location_enabled === true,
  })
}
