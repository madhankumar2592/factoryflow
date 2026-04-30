# FactoryFlow — Database Setup Guide

Complete reference for setting up the database from scratch or applying migrations.

---

## Project Overview

FactoryFlow is a multi-tenant factory operations app built on **Supabase** (PostgreSQL).
Each factory that subscribes gets one row in `companies`. All other tables are scoped
by `company_id` and protected by Row-Level Security (RLS).

---

## Table Reference

| Table | Purpose |
|---|---|
| `companies` | SaaS tenants (one row per subscribing factory) |
| `profiles` | App users — linked to `auth.users` via trigger |
| `vendors` | Unified suppliers + clients (type: supplier / client / both) |
| `jobs` | Production orders for a client |
| `inbound_dcs` | Raw material delivery challans received from suppliers |
| `outbound_dcs` | Finished goods delivery challans sent to clients |
| `product_items` | Line items for inbound/outbound DCs (dc_type flag) |
| `production_logs` | Production session header (aggregate totals) |
| `production_log_items` | Per-job breakdown within a production session |

---

## Option A — Fresh Setup (Recommended for new project)

Use this when starting from a blank Supabase project.

### Step 1: Create Supabase project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Note down: **Project URL** and **Anon Key** (used in `.env` / `lib/supabase.ts`)

### Step 2: Run schema
1. Open **SQL Editor** in Supabase Dashboard
2. Paste the contents of `database/schema.sql` and click **Run**

### Step 3: Configure Auth
1. Go to **Authentication → Providers → Email**
2. Disable **"Confirm email"** (required — avoids email confirmation loop)
3. Set **Site URL** to your Netlify URL (e.g. `https://factoryflow.netlify.app`)

### Step 4: Create the first owner user manually
1. Go to **Authentication → Users → Add User**
2. Enter email + password for the factory owner
3. Copy the **User UUID** shown

### Step 5: Create the company + owner profile
Run in SQL Editor (replace values):
```sql
-- Create the company
INSERT INTO companies (id, name, gstin, address)
VALUES (
  gen_random_uuid(),
  'Your Factory Name',
  'YOUR_GSTIN',
  'Your full address'
)
RETURNING id;  -- copy this UUID

-- Create the owner profile (replace both UUIDs)
INSERT INTO profiles (id, company_id, role, full_name)
VALUES (
  '<<USER_UUID_FROM_STEP_4>>',
  '<<COMPANY_UUID_FROM_ABOVE>>',
  'owner',
  'Owner Full Name'
);
```

### Step 6: (Optional) Load demo data
Paste `database/sample_data.sql` in SQL Editor and run.
Note: Comment out the profile INSERT if you already have a real user.

### Step 7: Update app config
In `lib/supabase.ts`, make sure `SUPABASE_URL` and `SUPABASE_ANON_KEY` match your project.

---

## Option B — Apply Migrations to Existing DB

Use this to upgrade an existing database step by step.

Run migration files in order from the `migrations/` folder:

| File | What it does |
|---|---|
| `001_initial_schema.sql` | Core tables + auth trigger (original schema) |
| `002_product_items.sql` | Multi-item DC support |
| `003_production_log_items.sql` | Multi-job production log support |
| `004_vendors.sql` | Consolidates suppliers + clients into one vendors table |

Run each file in **SQL Editor** in sequence. Each file is safe to read and understand
before running — they are well-commented.

---

## Auth Trigger Explained

When a new user is created (via `supabase.auth.signUp()`), this trigger fires:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

The function reads `raw_user_meta_data` from the sign-up call and creates a `profiles` row.
The app passes metadata like this:

```ts
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: 'John Doe',
      role: 'supervisor',
      company_id: 'your-company-uuid'
    }
  }
});
```

---

## Row-Level Security (RLS)

Every table has RLS enabled. The standard pattern is:

```sql
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
))
```

This means every user can only see and modify data belonging to their own company.
Owners get additional DELETE and UPDATE permissions on sensitive tables.

---

## Supabase Auth Settings Checklist

| Setting | Value |
|---|---|
| Email confirmations | **Disabled** |
| Site URL | Your production URL |
| Redirect URLs | Your production URL + localhost for dev |

---

## Environment Variables

In `lib/supabase.ts`:
```ts
const SUPABASE_URL  = 'https://xxxx.supabase.co'
const SUPABASE_ANON = 'eyJ...'
```

---

## Migration History

| # | Migration | Applied |
|---|---|---|
| 001 | Initial schema (companies, profiles, suppliers, clients, jobs, DCs, production_logs) | Kickoff |
| 002 | product_items table — multi-item DC support | After MVP |
| 003 | production_log_items table — multi-job log support | After MVP |
| 004 | vendors table — consolidates suppliers + clients | Sprint 2 |
