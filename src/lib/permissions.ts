import type { UserRole } from '@/types/database'

/** All permission strings used for RBAC */
export const PERMISSIONS = {
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  TEAM_VIEW: 'team.view',
  TEAM_MANAGE: 'team.manage',
  INVOICES_VIEW: 'invoices.view',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_SEND: 'invoices.send',
  INVOICES_EDIT: 'invoices.edit',
  INVOICES_DELETE: 'invoices.delete',
  PAYMENTS_CHARGE: 'payments.charge',
  PAYMENTS_REFUND: 'payments.refund',
  SERVICES_MANAGE: 'services.manage',
  SCHEDULE_MANAGE: 'schedule.manage',
  CUSTOMERS_MANAGE: 'customers.manage',
  STRIPE_CONNECT: 'stripe.connect',
  STRIPE_MANAGE: 'stripe.manage',
  STRIPE_DISCONNECT: 'stripe.disconnect',
  INTEGRATIONS_VIEW: 'integrations.view',
  INTEGRATIONS_MANAGE: 'integrations.manage',
  GOOGLE_CONNECT: 'google.connect',
  GOOGLE_DISCONNECT: 'google.disconnect',
  GOOGLE_SYNC_RETRY: 'google.sync.retry',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/** Default permissions by role key (when role_permissions not yet loaded) */
const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: [
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.TEAM_MANAGE,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_SEND,
    PERMISSIONS.INVOICES_EDIT,
    PERMISSIONS.INVOICES_DELETE,
    PERMISSIONS.PAYMENTS_CHARGE,
    PERMISSIONS.PAYMENTS_REFUND,
    PERMISSIONS.SERVICES_MANAGE,
    PERMISSIONS.SCHEDULE_MANAGE,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.STRIPE_CONNECT,
    PERMISSIONS.STRIPE_MANAGE,
    PERMISSIONS.STRIPE_DISCONNECT,
    PERMISSIONS.INTEGRATIONS_VIEW,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.GOOGLE_CONNECT,
    PERMISSIONS.GOOGLE_DISCONNECT,
    PERMISSIONS.GOOGLE_SYNC_RETRY,
  ],
  admin: [
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.TEAM_MANAGE,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_SEND,
    PERMISSIONS.INVOICES_EDIT,
    PERMISSIONS.INVOICES_DELETE,
    PERMISSIONS.PAYMENTS_CHARGE,
    PERMISSIONS.PAYMENTS_REFUND,
    PERMISSIONS.SERVICES_MANAGE,
    PERMISSIONS.SCHEDULE_MANAGE,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.STRIPE_CONNECT,
    PERMISSIONS.STRIPE_MANAGE,
    PERMISSIONS.INTEGRATIONS_VIEW,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.GOOGLE_CONNECT,
    PERMISSIONS.GOOGLE_DISCONNECT,
    PERMISSIONS.GOOGLE_SYNC_RETRY,
  ],
  manager: [
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_SEND,
    PERMISSIONS.PAYMENTS_CHARGE,
    PERMISSIONS.SCHEDULE_MANAGE,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.STRIPE_CONNECT,
    PERMISSIONS.STRIPE_MANAGE,
  ],
  technician: [
    PERMISSIONS.SCHEDULE_MANAGE,
    PERMISSIONS.CUSTOMERS_MANAGE,
  ],
  pending: [
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.TEAM_MANAGE,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_SEND,
    PERMISSIONS.INVOICES_EDIT,
    PERMISSIONS.INVOICES_DELETE,
    PERMISSIONS.PAYMENTS_CHARGE,
    PERMISSIONS.PAYMENTS_REFUND,
    PERMISSIONS.SERVICES_MANAGE,
    PERMISSIONS.SCHEDULE_MANAGE,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.STRIPE_CONNECT,
    PERMISSIONS.STRIPE_MANAGE,
    PERMISSIONS.STRIPE_DISCONNECT,
  ],
}

/**
 * Check if a set of permissions (or role key for defaults) includes the required permission.
 * Use when you have already resolved permissions (e.g. from API or server).
 */
export function hasPermission(
  permissions: string[] | null | undefined,
  required: Permission | string
): boolean {
  if (!permissions || permissions.length === 0) return false
  return permissions.includes(required)
}

/**
 * Get default permissions for a role key (backward compat when role_permissions not in DB).
 */
export function getDefaultPermissionsForRole(role: UserRole): Permission[] {
  const key = role === 'pending' ? 'owner' : role
  return DEFAULT_ROLE_PERMISSIONS[key] ?? DEFAULT_ROLE_PERMISSIONS.technician
}

/**
 * Resolve effective role key from profile (role_id -> role.key or profiles.role).
 */
export function effectiveRoleKey(profile: { role: UserRole; role_id?: string | null }, roleFromDb?: { key: string } | null): string {
  if (roleFromDb?.key) return roleFromDb.key
  return profile.role === 'pending' ? 'owner' : profile.role
}
