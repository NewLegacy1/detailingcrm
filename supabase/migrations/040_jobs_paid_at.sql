-- One payment per job: when paid, set job.paid_at and status = done
alter table public.jobs
  add column if not exists paid_at timestamptz;

comment on column public.jobs.paid_at is 'Set when payment has been collected for this job (one payment per job).';
