import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServiceRoleClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

const ALLOWED_ROLES = ['owner', 'admin', 'manager', 'technician', 'pending']

/** DELETE: remove team member from the org (set org_id to null). Only owners can remove; cannot remove the last owner. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(PERMISSIONS.TEAM_MANAGE)
  if ('error' in result) return result.error

  const { id } = await params
  const supabase = await createAuthClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, org_id')
    .eq('id', id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (profile.org_id !== result.auth.orgId) {
    return NextResponse.json({ error: 'User is not in this organization' }, { status: 403 })
  }
  if (profile.role === 'owner') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', result.auth.orgId)
      .eq('role', 'owner')
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last owner. Assign another owner first.' },
        { status: 400 }
      )
    }
  }

  const serviceSupabase = await createServiceRoleClient()
  const { error } = await serviceSupabase
    .from('profiles')
    .update({
      org_id: null,
      role: 'pending',
      role_id: null,
      location_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requirePermission(PERMISSIONS.TEAM_MANAGE)
  if ('error' in result) return result.error

  const { id } = await params
  const body = await request.json()
  const newRole = body.role
  if (!newRole || !ALLOWED_ROLES.includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const supabase = await createAuthClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, org_id')
    .eq('id', id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  const orgId = profile.org_id

  if (profile.role === 'owner' && newRole !== 'owner') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner')
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot demote the last owner. Assign another owner first.' },
        { status: 400 }
      )
    }
  }

  const locationIdPayload = body.location_id
  const newLocationId =
    locationIdPayload === null || locationIdPayload === undefined
      ? null
      : typeof locationIdPayload === 'string' && locationIdPayload.trim()
        ? locationIdPayload.trim()
        : null

  if (newLocationId && orgId) {
    const { data: loc } = await supabase
      .from('locations')
      .select('id')
      .eq('id', newLocationId)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .single()
    if (!loc) {
      return NextResponse.json({ error: 'Invalid or inactive location for this organization' }, { status: 400 })
    }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('multi_location_enabled')
    .eq('id', orgId)
    .single()

  const multiLocationEnabled = org?.multi_location_enabled === true
  const roleNeedsLocation = (newRole === 'manager' || newRole === 'technician') && multiLocationEnabled
  if (roleNeedsLocation && !newLocationId) {
    return NextResponse.json(
      { error: 'When multi-location is enabled, managers and technicians must be assigned to a location.' },
      { status: 400 }
    )
  }

  const { data: roleRow } = await supabase
    .from('roles')
    .select('id')
    .eq('key', newRole)
    .single()

  const update: { role: string; role_id?: string | null; location_id?: string | null } = {
    role: newRole,
    location_id: newLocationId,
  }
  if (roleRow) update.role_id = roleRow.id

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
