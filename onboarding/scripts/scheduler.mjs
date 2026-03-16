/**
 * DetailOps Blog Scheduler
 * Runs the post generator once per day at 8:00 AM (configurable).
 *
 * Usage:
 *   node scripts/scheduler.mjs
 *
 * Keep this process running (e.g. via pm2, or Windows Task Scheduler
 * to run `node scripts/generate-post.mjs` directly — see README).
 */

import cron from 'node-cron';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

try {
  const dotenv = await import('dotenv');
  dotenv.default.config();
} catch {}

const __filename = fileURLToPath(import.meta.url);
const SCRIPT = path.join(path.dirname(__filename), 'generate-post.mjs');

// Default: 8:00 AM daily. Override with BLOG_CRON_SCHEDULE env var.
// Cron format: second(opt) minute hour day month weekday
// Examples:
//   '0 8 * * *'   — 8:00 AM every day
//   '0 9 * * 1-5' — 9:00 AM weekdays only
//   '0 */12 * * *' — every 12 hours
const SCHEDULE = process.env.BLOG_CRON_SCHEDULE || '0 8 * * *';

// Timezone — change to your local timezone
const TIMEZONE = process.env.BLOG_TIMEZONE || 'America/New_York';

console.log('\n🗓  DetailOps Blog Scheduler started');
console.log(`   Schedule : ${SCHEDULE}`);
console.log(`   Timezone : ${TIMEZONE}`);
console.log(`   Next run : ${getNextRunDescription(SCHEDULE)}`);
console.log('   Ctrl+C to stop\n');

// Optionally run once immediately on start (set BLOG_RUN_ON_START=true in .env)
if (process.env.BLOG_RUN_ON_START === 'true') {
  console.log('BLOG_RUN_ON_START=true — running generator now...\n');
  runGenerator();
}

cron.schedule(SCHEDULE, () => {
  runGenerator();
}, { timezone: TIMEZONE });

function runGenerator() {
  console.log(`\n[${new Date().toISOString()}] ⏰ Scheduled trigger — running generator...`);
  try {
    execSync(`node "${SCRIPT}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`[${new Date().toISOString()}] ❌ Generator failed:`, e.message);
  }
}

function getNextRunDescription(schedule) {
  try {
    // Basic human-readable hint
    const parts = schedule.split(' ');
    if (parts.length === 5) {
      const [min, hour] = parts;
      if (!isNaN(hour) && !isNaN(min)) {
        const h = parseInt(hour, 10);
        const m = parseInt(min, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, '0')} ${ampm} daily`;
      }
    }
  } catch {}
  return schedule;
}
