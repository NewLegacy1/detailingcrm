-- Pro-only: booking checkout payment mode (deposit or card on file). Off by default.
-- Starter plan cannot use this; enforce in app (Settings only shown for Pro).

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS booking_payment_mode text DEFAULT 'none';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_booking_payment_mode_check'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_booking_payment_mode_check
      CHECK (booking_payment_mode IS NULL OR booking_payment_mode IN ('none', 'deposit', 'card_on_file'));
  END IF;
END $$;

COMMENT ON COLUMN public.organizations.booking_payment_mode IS 'Pro only: none | deposit (pay deposit at checkout) | card_on_file (save card at checkout).';
