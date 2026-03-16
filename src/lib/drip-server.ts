import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

type DripNode = { id: string; type: string; data?: Record<string, unknown> }

/**
 * Start drip runs for a trigger type and context.
 * Call after job_paid (job-detail), new_booking (job creation), or from cron for abandoned_booking, job_completed, appointment_reminder.
 * Pass supabaseInstance when calling from cron (use createServiceRoleClient) so runs are created without a user session.
 */
export async function startDripRunsForTrigger(
  triggerType: string,
  context: {
    org_id: string
    customer_id?: string | null
    job_id?: string | null
    booking_session_id?: string | null
  },
  supabaseInstance?: SupabaseClient
): Promise<{ started: number; errors: string[] }> {
  const supabase = supabaseInstance ?? (await createClient())
  const { data: campaigns } = await supabase
    .from('drip_campaigns')
    .select('id, workflow_json')
    .eq('org_id', context.org_id)
    .eq('trigger_type', triggerType)
    .eq('active', true)

  const result = { started: 0, errors: [] as string[] }
  const workflow = (campaigns ?? [])[0]?.workflow_json as { nodes: DripNode[] } | undefined
  const triggerNode = workflow?.nodes?.find((n) => n.type === 'trigger')
  const firstStep = triggerNode?.id ?? 'trigger'

  for (const camp of campaigns ?? []) {
    try {
      const customerId = context.customer_id ?? null
      const bookingSessionId = context.booking_session_id ?? null
      let existingQuery = supabase
        .from('drip_runs')
        .select('id')
        .eq('campaign_id', camp.id)
        .eq('status', 'running')
      if (customerId) {
        existingQuery = existingQuery.eq('customer_id', customerId)
      } else if (bookingSessionId != null) {
        existingQuery = existingQuery.is('customer_id', null).eq('booking_session_id', bookingSessionId)
      } else {
        existingQuery = existingQuery.is('customer_id', null).is('booking_session_id', null)
      }
      const { data: existingRun } = await existingQuery.limit(1).maybeSingle()
      if (existingRun) continue

      const { data: run, error } = await supabase
        .from('drip_runs')
        .insert({
          campaign_id: camp.id,
          org_id: context.org_id,
          customer_id: customerId,
          job_id: context.job_id ?? null,
          booking_session_id: bookingSessionId,
          current_step: firstStep,
          status: 'running',
          variables: {},
          next_step_at: null,
        })
        .select('id')
        .single()

      if (error) {
        result.errors.push(`${camp.id}: ${error.message}`)
        continue
      }
      if (run) result.started++
    } catch (e) {
      result.errors.push(`${camp.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return result
}
