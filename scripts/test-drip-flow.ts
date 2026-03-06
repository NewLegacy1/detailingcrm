/**
 * Call the drip cron endpoint to verify it runs.
 * Start the dev server first: npm run dev
 * Usage: npx tsx scripts/test-drip-flow.ts
 * Requires .env: CRON_SECRET; optional NEXT_PUBLIC_APP_URL (default http://localhost:3000)
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
try {
  const envPath = resolve(process.cwd(), '.env')
  const buf = readFileSync(envPath, 'utf8')
  for (const line of buf.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
} catch (_) { /* no .env */ }

async function main() {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('Missing CRON_SECRET in .env')
    process.exit(1)
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  const url = `${base}/api/cron/drip`

  console.log('Calling drip cron:', url)
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${secret}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Drip cron failed:', res.status, body)
    process.exit(1)
  }
  console.log('Drip cron OK:', JSON.stringify(body, null, 2))
}
main()
