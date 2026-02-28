/** Base path for all CRM app routes. Landing lives at /; CRM at /crm/* */
export const CRM_BASE = '/crm'

/** CRM path: crmPath('/dashboard') => '/crm/dashboard', crmPath('jobs') => '/crm/jobs' */
export function crmPath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return p.startsWith(CRM_BASE) ? p : `${CRM_BASE}${p}`
}
