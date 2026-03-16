-- Store Stripe Customer ID on client when they save card at booking (card-on-file). Used for on-site checkout with saved card.

alter table public.clients
  add column if not exists stripe_customer_id text;

comment on column public.clients.stripe_customer_id is 'Stripe Customer ID on the org connected account, set when customer completes card-on-file at booking. Used for on-site Checkout (collect payment + tip).';
