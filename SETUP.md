# FactoryFlow — Setup Guide

## What's Already Done
- Expo project created with all dependencies installed
- All 9 screens coded (Login, Supervisor Home + 3 forms, Owner Dashboard + 3 lists)
- Supabase client, Zustand auth store, TypeScript types, design theme — all in place

---

## Step 1 — Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click **New project**
3. Fill in:
   - **Name:** FactoryFlow
   - **Database password:** (save this somewhere safe)
   - **Region:** Singapore (closest to India)
4. Wait ~2 minutes for the project to provision

---

## Step 2 — Apply the Database Schema

1. In Supabase Dashboard → click **SQL Editor** in the left sidebar
2. Click **New query**
3. Paste the entire SQL below and click **Run**

```sql
-- 1. Companies (multi-tenant anchor)
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gstin text,
  address text,
  created_at timestamptz default now()
);

-- 2. Profiles (links auth.users to a company + role)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  role text not null check (role in ('owner', 'supervisor')),
  full_name text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup trigger
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, company_id, role, full_name)
  values (
    new.id,
    (new.raw_user_meta_data->>'company_id')::uuid,
    coalesce(new.raw_user_meta_data->>'role', 'supervisor'),
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 3. Suppliers
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  gstin text,
  address text,
  created_at timestamptz default now()
);

-- 4. Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  gstin text,
  address text,
  created_at timestamptz default now()
);

-- 5. Jobs (active work orders per client)
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  client_id uuid references clients(id),
  item_name text not null,
  hsn_code text,
  status text default 'running' check (status in ('running', 'paused', 'completed')),
  created_at timestamptz default now()
);

-- 6. Inbound DCs (raw material received)
create table inbound_dcs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  supplier_id uuid references suppliers(id),
  challan_no text not null,
  challan_date date not null,
  item_desc text not null,
  hsn_sac text,
  quantity_kg numeric not null,
  rate_per_kg numeric,
  amount numeric,
  reference_no text,
  eway_bill_no text,
  nature_of_processing text,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

-- 7. Production logs
create table production_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  job_id uuid references jobs(id),
  inbound_dc_id uuid references inbound_dcs(id),
  material_consumed_kg numeric not null,
  good_qty integer not null,
  reject_qty integer not null default 0,
  notes text,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

-- 8. Outbound DCs (finished goods dispatched)
create table outbound_dcs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  client_id uuid references clients(id),
  job_id uuid references jobs(id),
  dc_no text not null,
  dc_date date not null,
  item_desc text not null,
  hsn_code text,
  quantity numeric not null,
  value numeric,
  vehicle_no text,
  eway_bill_no text,
  party_dc_no text,
  order_no text,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

-- =====================
-- RLS POLICIES
-- =====================

alter table companies enable row level security;
alter table profiles enable row level security;
alter table suppliers enable row level security;
alter table clients enable row level security;
alter table jobs enable row level security;
alter table inbound_dcs enable row level security;
alter table production_logs enable row level security;
alter table outbound_dcs enable row level security;

-- Helper function: get current user's company_id
create or replace function get_my_company_id()
returns uuid as $$
  select company_id from profiles where id = auth.uid();
$$ language sql security definer;

-- Profiles: users can only see their own profile
create policy "users see own profile"
  on profiles for select using (id = auth.uid());

-- All other tables: filter by company_id
create policy "company isolation - suppliers"
  on suppliers for all using (company_id = get_my_company_id());

create policy "company isolation - clients"
  on clients for all using (company_id = get_my_company_id());

create policy "company isolation - jobs"
  on jobs for all using (company_id = get_my_company_id());

create policy "company isolation - inbound_dcs"
  on inbound_dcs for all using (company_id = get_my_company_id());

create policy "company isolation - production_logs"
  on production_logs for all using (company_id = get_my_company_id());

create policy "company isolation - outbound_dcs"
  on outbound_dcs for all using (company_id = get_my_company_id());
```

---

## Step 3 — Insert Seed Data (Test Data)

Still in SQL Editor → New query, paste and run:

```sql
-- Test company (Mold Tech Diecasting)
insert into companies (id, name, gstin, address)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Mold Tech Diecasting',
  '33ABIFM1040M1ZE',
  '23/27, Villankurichi Road, Saravanampatti, Coimbatore - 641035'
);

-- Test supplier
insert into suppliers (company_id, name, gstin, address)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Alu Dyco Mfg Co 25-26',
  '33AAWFA7205M1Z3',
  '4/68E1, Balaji Industrial Park, SS.Kulam Via, Coimbatore'
);

-- Test client
insert into clients (company_id, name, gstin)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Sample Client Pvt Ltd',
  '33XXXXX0000X1ZX'
);

-- Test job
insert into jobs (company_id, client_id, item_name, hsn_code, status)
select
  'aaaaaaaa-0000-0000-0000-000000000001',
  id,
  'Gear Housing - Aluminium',
  '73259990',
  'running'
from clients
where name = 'Sample Client Pvt Ltd'
limit 1;
```

---

## Step 4 — Create User Accounts

### Create the Owner account

1. Supabase Dashboard → **Authentication** → **Users** → **Add user** → **Create new user**
2. Fill in:
   - **Email:** `owner@moldtech.com`
   - **Password:** (choose something strong)
3. After the user is created, click on the user → scroll to **User Metadata** → click **Edit**
4. Paste this JSON:
```json
{
  "company_id": "aaaaaaaa-0000-0000-0000-000000000001",
  "role": "owner",
  "full_name": "Owner"
}
```
5. Click **Save**

### Create the Supervisor account

Repeat the same steps with:
- **Email:** `supervisor@moldtech.com`
- **Metadata:**
```json
{
  "company_id": "aaaaaaaa-0000-0000-0000-000000000001",
  "role": "supervisor",
  "full_name": "Supervisor"
}
```

> **Note:** The trigger created in Step 2 automatically creates a profile row for each new user using the metadata you provide.

---

## Step 5 — Add Your Supabase Keys to the App

1. In Supabase Dashboard → **Project Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon / public** key (long string starting with `eyJ...`)
3. Open `D:\CodeBase\FactoryFlow\.env` and replace the placeholder values:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...
```

---

## Step 6 — Run the App

Open a terminal in `D:\CodeBase\FactoryFlow` and run:

```bash
# Test in browser (Owner dashboard view)
npx expo start --web

# Test on phone (Supervisor mobile view)
# Install "Expo Go" from App Store / Play Store first
npx expo start
# Then scan the QR code with your phone camera
```

### Login credentials (from Step 4)
| Role | Email | Goes to |
|------|-------|---------|
| Owner | owner@moldtech.com | Dashboard (web) |
| Supervisor | supervisor@moldtech.com | Home with 3 action buttons (mobile) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid API key" on login | Check `.env` values — no trailing spaces |
| Login succeeds but profile not found | Check that the trigger ran — go to Table Editor → `profiles` and verify a row was created |
| Supplier/Client dropdown empty | Seed data wasn't inserted — re-run Step 3 |
| App won't start | Run `npx expo install` to fix any dependency version mismatches |
| White screen on web | Clear browser cache and hard reload |

---

## File Structure Reference

```
FactoryFlow/
├── app/
│   ├── _layout.tsx              ← Root layout, auth redirect logic
│   ├── (auth)/login.tsx         ← Login screen
│   ├── (supervisor)/
│   │   ├── _layout.tsx          ← Tab bar for supervisor
│   │   ├── index.tsx            ← Home — 3 action buttons
│   │   ├── inbound-dc.tsx       ← Log raw material received
│   │   ├── production-log.tsx   ← Log shift output
│   │   └── outbound-dc.tsx      ← Log goods dispatched
│   └── (owner)/
│       ├── _layout.tsx          ← Tab bar for owner
│       ├── index.tsx            ← Dashboard with summary cards
│       ├── inbound-dcs.tsx      ← List of all inbound DCs
│       ├── production-logs.tsx  ← List of all production logs
│       └── outbound-dcs.tsx     ← List of all outbound DCs
├── components/
│   ├── FormField.tsx            ← Reusable labeled input
│   ├── SummaryCard.tsx          ← Dashboard stat card
│   ├── DCListItem.tsx           ← Expandable list row
│   └── LoadingSpinner.tsx
├── lib/
│   ├── supabase.ts              ← Supabase client
│   └── auth.ts                 ← Auth helpers
├── stores/authStore.ts          ← Zustand — user + profile state
├── types/index.ts               ← TypeScript types for all tables
├── constants/theme.ts           ← Design tokens
└── .env                        ← ⚠️ Add your Supabase keys here
```

---

*FactoryFlow MVP v1.0 — Mold Tech Diecasting, Coimbatore*
