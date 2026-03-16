-- Actual start/end times for jobs (when tech starts/completes; editable in calendar)
alter table public.jobs
  add column if not exists actual_started_at timestamptz,
  add column if not exists actual_ended_at timestamptz;
