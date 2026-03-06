import { createAuthClient } from '@/lib/supabase/server'
import { hasPermission as checkPerm, getDefaultPermissionsForRole, type Permission } from '@/lib/permissions'
import type { UserRole } from '@/types/database'

export interface AuthResult {
  userId: string
  role: UserRole
  roleKey: string
  permissions: string[]
  orgId: string | null
}

/**
 * Get current user and their permissions (server-only).
 * Use in API routes and server components to enforce RBAC.
 */
export async function getAuthAndPermissions(): Promise<AuthResult | null> {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, role_id, org_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return {
      userId: user.id,
      role: 'pending',
      roleKey: 'owner',
      permissions: getDefaultPermissionsForRole('pending'),
      orgId: null,
    }
  }

  const roleKey = profile.role === 'pending' ? 'owner' : profile.role
  let permissions: string[] = getDefaultPermissionsForRole(profile.role as UserRole)

  if (profile.role_id) {
    const { data: perms } = await supabase
      .from('role_permissions')
      .select('permission')
      .eq('role_id', profile.role_id)
    if (perms?.length) {
      permissions = perms.map((p) => p.permission)
    }
  }

  return {
    userId: user.id,
    role: profile.role as UserRole,
    roleKey,
    permissions,
    orgId: profile.org_id,
  }
}

/**
 * Require a permission; returns 403 body and null if not allowed.
 * Use in API routes: const auth = await requirePermission(PERMISSIONS.SETTINGS_EDIT)
 */
export async function requirePermission(
  required: Permission | string
): Promise<{ error: Response; body: { error: string } } | { auth: AuthResult }> {
  const auth = await getAuthAndPermissions()
  if (!auth) {
    return {
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }),
      body: { error: 'Unauthorized' },
    }
  }
  if (!checkPerm(auth.permissions, required)) {
    return {
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } }),
      body: { error: 'Forbidden' },
    }
  }
  return { auth }
}

/**
 * Require one of owner or admin (for existing API compatibility).
 */
export async function requireOwnerOrAdmin(): Promise<{ error: Response } | { auth: AuthResult }> {
  const auth = await getAuthAndPermissions()
  if (!auth) {
    return { error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) }
  }
  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return { error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } }) }
  }
  return { auth }
}
