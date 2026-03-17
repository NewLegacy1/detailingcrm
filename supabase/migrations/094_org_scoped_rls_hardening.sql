-- Security hardening: tighten RLS on tables that were only role-scoped, not org-scoped.
-- Fixes: job_checklist_items, job_payments, reviews, communications, booking_sessions.
-- All policies now require both the correct role AND that the row belongs to the user's org.

-- 1. job_checklist_items: scope via job's org_id
DROP POLICY IF EXISTS "job_checklist_items_authenticated" ON public.job_checklist_items;
CREATE POLICY "job_checklist_items_org" ON public.job_checklist_items FOR ALL
  USING (
    public.get_user_role() IN ('owner', 'admin', 'manager', 'technician')
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_checklist_items.job_id
        AND j.org_id = public.get_user_org_id()
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'admin', 'manager', 'technician')
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_checklist_items.job_id
        AND j.org_id = public.get_user_org_id()
    )
  );

-- 2. job_payments: scope via job's org_id
DROP POLICY IF EXISTS "job_payments_authenticated" ON public.job_payments;
CREATE POLICY "job_payments_org" ON public.job_payments FOR ALL
  USING (
    public.get_user_role() IN ('owner', 'admin', 'manager', 'technician')
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_payments.job_id
        AND j.org_id = public.get_user_org_id()
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'admin', 'manager', 'technician')
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_payments.job_id
        AND j.org_id = public.get_user_org_id()
    )
  );

-- 3. reviews: scope via job's org_id or client's org_id
DROP POLICY IF EXISTS "reviews_authenticated" ON public.reviews;
CREATE POLICY "reviews_org" ON public.reviews FOR ALL
  USING (
    public.get_user_role() IN ('owner', 'admin', 'manager', 'technician')
    AND (
      (job_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = reviews.job_id AND j.org_id = public.get_user_org_id()
      ))
      OR
      (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = reviews.client_id AND c.org_id = public.get_user_org_id()
      ))
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'admin', 'manager', 'technician')
    AND (
      (job_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = reviews.job_id AND j.org_id = public.get_user_org_id()
      ))
      OR
      (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = reviews.client_id AND c.org_id = public.get_user_org_id()
      ))
    )
  );

-- 4. communications: tighten to org-scoped (was role-only in migration 012; fixed in 015 but only for some paths)
DROP POLICY IF EXISTS "communications_authenticated" ON public.communications;
CREATE POLICY "communications_org" ON public.communications FOR ALL
  USING (
    public.get_user_role() IN ('owner', 'admin', 'manager', 'technician')
    AND (
      (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = communications.client_id AND c.org_id = public.get_user_org_id()
      ))
      OR
      -- Allow rows with null client_id (e.g. abandoned booking emails) only if job is in org
      (client_id IS NULL AND job_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = communications.job_id AND j.org_id = public.get_user_org_id()
      ))
    )
  )
  WITH CHECK (
    public.get_user_role() IN ('owner', 'admin', 'manager', 'technician')
    AND (
      (client_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = communications.client_id AND c.org_id = public.get_user_org_id()
      ))
      OR
      (client_id IS NULL AND job_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = communications.job_id AND j.org_id = public.get_user_org_id()
      ))
    )
  );

-- 5. booking_sessions: allow CRM users to read their org's sessions (service role handles inserts/updates from booking routes)
DROP POLICY IF EXISTS "booking_sessions_org_read" ON public.booking_sessions;
CREATE POLICY "booking_sessions_org_read" ON public.booking_sessions FOR SELECT
  USING (
    public.get_user_role() IN ('owner', 'admin', 'manager', 'technician')
    AND org_id = public.get_user_org_id()
  );

-- 6. Ensure booking_slug is unique across organizations (prevents cross-org lookup ambiguity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organizations_booking_slug_unique'
  ) THEN
    -- Only add if no duplicates exist
    IF NOT EXISTS (
      SELECT booking_slug FROM public.organizations
      WHERE booking_slug IS NOT NULL
      GROUP BY booking_slug HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE public.organizations
        ADD CONSTRAINT organizations_booking_slug_unique UNIQUE (booking_slug);
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_booking_slug ON public.organizations(booking_slug);
