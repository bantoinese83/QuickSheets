-- QuickSheets minimal schema
-- Run: psql $DATABASE_URL -f db/schema.sql

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_users_stripe_customer on users(stripe_customer_id);
create index if not exists idx_users_stripe_subscription on users(stripe_subscription_id);

create table if not exists qbo_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  realm_id text not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

create index if not exists idx_qbo_connections_user_id on qbo_connections(user_id);

-- Migration for existing DBs: add Stripe columns if missing
-- alter table users add column if not exists stripe_customer_id text;
-- alter table users add column if not exists stripe_subscription_id text;
-- alter table users add column if not exists subscription_status text;
-- alter table users add column if not exists updated_at timestamptz default now();
