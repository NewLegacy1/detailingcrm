import { NextRequest, NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET
const GITHUB_TOKEN = process.env.CRON_BLOG_GITHUB_TOKEN
const GITHUB_REPO = process.env.CRON_BLOG_GITHUB_REPO || 'NewLegacy1/detailingcrm'
const WORKFLOW_ID = 'daily-blog.yml'

function authCron(req: NextRequest): boolean {
  if (!CRON_SECRET) return false
  const auth = req.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const header = req.headers.get('x-cron-secret')
  return bearer === CRON_SECRET || header === CRON_SECRET
}

/**
 * GET /api/cron/blog
 * Call this from cron-job.org (or any cron) to trigger the daily blog workflow in GitHub Actions.
 * Uses same auth as other crons: CRON_SECRET in Authorization header or x-cron-secret.
 * Requires: CRON_BLOG_GITHUB_TOKEN (GitHub PAT with repo scope, or workflow dispatch permission).
 */
export async function GET(req: NextRequest) {
  if (!authCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      {
        error: 'CRON_BLOG_GITHUB_TOKEN not set',
        hint: 'Add CRON_BLOG_GITHUB_TOKEN in Vercel → Settings → Environment Variables. Use a GitHub PAT with repo scope (or Actions: Write). See docs/CRON_BLOG_SETUP.md',
      },
      { status: 501 }
    )
  }

  const url = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main' }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[cron/blog] GitHub workflow dispatch failed:', res.status, text)
    return NextResponse.json(
      { error: 'Failed to trigger workflow', details: text },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true, message: 'Workflow triggered' })
}
