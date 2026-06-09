-- ─── Tenants ──────────────────────────────────────────────────────────────────
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- ─── Users ────────────────────────────────────────────────────────────────────
create table users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'user')) default 'user',
  created_at timestamptz default now()
);

create index on users(tenant_id);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
create table invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  uploaded_by uuid references users(id) not null,
  original_filename text not null,
  extracted_data jsonb,
  status text not null check (status in ('pending_review', 'approved', 'rejected')) default 'pending_review',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on invoices(tenant_id);
create index on invoices(status);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger invoices_updated_at
  before update on invoices
  for each row execute procedure set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Note: RLS is enforced at the API layer via tenant_id filter.
-- Enable RLS if using Supabase anon key directly from the client:
-- alter table invoices enable row level security;
-- alter table users enable row level security;
