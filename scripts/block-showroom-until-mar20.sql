-- Block Showroom Autocare calendar until March 20 (inclusive). First bookable day = March 21.
-- Org id for Showroom Autocare: 590d9b8c-12d1-42e8-8336-59d51a486696

UPDATE public.organizations
SET
  blackout_ranges = COALESCE(blackout_ranges, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'start', to_char(CURRENT_DATE, 'YYYY-MM-DD'),
      'end',   '2026-03-20'
    )
  ),
  updated_at = now()
WHERE id = '590d9b8c-12d1-42e8-8336-59d51a486696'
  AND booking_slug = 'showroom-autocare';

-- Optional: if you prefer to REPLACE all blackout ranges with just this one (no merge), use this instead:
/*
UPDATE public.organizations
SET
  blackout_ranges = jsonb_build_array(
    jsonb_build_object('start', to_char(CURRENT_DATE, 'YYYY-MM-DD'), 'end', '2026-03-20')
  ),
  updated_at = now()
WHERE id = '590d9b8c-12d1-42e8-8336-59d51a486696';
*/
