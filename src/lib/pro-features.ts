/**
 * Pro plan and feature gating.
 * Set FORCE_PRO_FEATURES=true in .env.local to enable Pro UI/API when your
 * org's subscription_plan in the DB is not set (e.g. after manual Pro upgrade).
 */

export function isProPlan(plan: string | null | undefined): boolean {
  return (plan ?? '').toString().toLowerCase() === 'pro'
}

export function allowProFeatures(plan: string | null | undefined): boolean {
  return process.env.FORCE_PRO_FEATURES === 'true' || isProPlan(plan)
}
