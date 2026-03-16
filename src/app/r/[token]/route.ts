import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Tracked link redirect: /r/[token]
 * Updates tracking_links.visited_at then redirects to target_url.
 * Used by drip SMS/email for {{trackedBookingUrl}} placeholders.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token) return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'https://detailops.vercel.app'))

  const supabase = await createServiceRoleClient()
  const { data: link, error } = await supabase
    .from('tracking_links')
    .select('id, target_url, visited_at')
    .eq('token', token)
    .single()

  const targetUrl = link?.target_url?.trim() || '/'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://detailops.vercel.app'
  const resolved = targetUrl.startsWith('http') ? targetUrl : `${baseUrl}${targetUrl.startsWith('/') ? '' : '/'}${targetUrl}`

  if (!error && link && link.visited_at == null) {
    await supabase
      .from('tracking_links')
      .update({ visited_at: new Date().toISOString() })
      .eq('id', link.id)
  }

  return NextResponse.redirect(resolved, 302)
}
