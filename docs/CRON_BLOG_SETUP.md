# Daily blog via cron-job.org

The daily blog is triggered by **cron-job.org** (or any external cron) calling your app. The app then triggers the GitHub Actions workflow, which generates the post and pushes to the repo.

## 1. Vercel env vars

- **CRON_SECRET** – Same secret you use for other crons (automations, drip). cron-job.org will send this in the request.
- **CRON_BLOG_GITHUB_TOKEN** – A GitHub Personal Access Token (PAT) with `repo` scope, or with “Actions: Write” so it can trigger workflows. Create under GitHub → Settings → Developer settings → Personal access tokens.
- **CRON_BLOG_GITHUB_REPO** – Optional. Default: `NewLegacy1/detailingcrm`. Use `owner/repo` if your repo is elsewhere.

**If you get 501 Not Implemented:** Add `CRON_BLOG_GITHUB_TOKEN` in Vercel → Settings → Environment Variables (GitHub PAT with repo or Actions scope).

## 2. cron-job.org

1. Create a new cron job.
2. **URL:** `https://detailops.vercel.app/api/cron/blog` (or your production URL).
3. **Method:** GET.
4. **Schedule:** Daily at 8:00 AM (choose your timezone, e.g. America/Toronto).
5. **Headers:** Add one of:
   - `Authorization: Bearer YOUR_CRON_SECRET`, or  
   - `x-cron-secret: YOUR_CRON_SECRET`

Save. Each day at that time, cron-job.org will call the URL, your app will trigger the workflow, and the workflow will generate and push the post.

## 3. Manual run

- **From GitHub:** Actions → “Generate Daily Blog Post” → Run workflow.
- **From API:** `GET https://detailops.vercel.app/api/cron/blog` with the same auth header.
