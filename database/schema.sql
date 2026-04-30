-- =============================================================================
-- FactoryFlow — Complete Database Schema
-- =============================================================================
-- Run this on a FRESH Supabase project to set up everything from scratch.
-- Order matters: tables are created in dependency order.
--
-- Steps:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Paste this entire file and run it
--   3. (Optional) Run database/sample_data.sql to load demo records
-- =============================================================================


-- =============================================================================
-- 0. CLEAN SLATE (drop everything if re-running)
-- =============================================================================
DROP TABLE IF EXISTS production_log_items  CASCADE;
DROP TABLE IF EXISTS production_logs       CASCADE;
DROP TABLE IF EXISTS product_items         CASCADE;
DROP TABLE IF EXISTS outbound_dcs          CASCADE;
DROP TABLE IF EXISTS inbound_dcs           CASCADE;
DROP TABLE IF EXISTS jobs                  CASCADE;
DROP TABLE IF EXISTS vendors               CASCADE;
DROP TABLE IF EXISTS profiles              CASCADE;
DROP TABLE IF EXISTS companies             CASCADE;

-- Drop old tables from earlier schema versions
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS clients   CASCADE;

-- Drop trigger and function if re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();


-- =============================================================================
-- 1. COMPANIES
-- The top-level tenant. One company = one subscription to FactoryFlow.
-- Example: "Mold Tech Diecasting Pvt Ltd"
-- =============================================================================
CREATE TABLE companies (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL,
  gstin      TEXT,
  address    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Users can only read their own company
CREATE POLICY "companies_select" ON companies FOR SELECT
  USING (id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Only owners can update company details
CREATE POLICY "companies_update" ON companies FOR UPDATE
  USING (id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'owner'
  ));


-- =============================================================================
-- 2. PROFILES
-- One profile per auth user. Links auth.users → company + role.
-- Created automatically by the handle_new_user() trigger (see Section 10).
-- =============================================================================
CREATE TABLE profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'supervisor'
                         CHECK (role IN ('owner', 'supervisor')),
  full_name  TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles in their company
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Users can update their own profile
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Owners can update any profile in their company (e.g. change role)
CREATE POLICY "profiles_update_owner" ON profiles FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'owner'
  ));

-- Owners can delete profiles (remove users)
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'owner'
  ));


-- =============================================================================
-- 3. VENDORS
-- Unified table for suppliers, clients, or both.
-- type = 'supplier' → appears in Inbound DC supplier picker
-- type = 'client'   → appears in Outbound DC client picker + Jobs
-- type = 'both'     → appears in both
-- =============================================================================
CREATE TABLE vendors (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  gstin      TEXT,
  address    TEXT,
  phone      TEXT,
  type       TEXT        NOT NULL DEFAULT 'both'
                         CHECK (type IN ('supplier', 'client', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_select" ON vendors FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "vendors_insert" ON vendors FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "vendors_update" ON vendors FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "vendors_delete" ON vendors FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));


-- =============================================================================
-- 4. JOBS
-- A job represents a production order for a client.
-- status: 'running' → active, shown in production log + outbound DC
--         'paused'  → temporarily stopped
--         'completed' → finished, archived
-- =============================================================================
CREATE TABLE jobs (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id  UUID        NOT NULL REFERENCES vendors(id),
  item_name  TEXT        NOT NULL,
  hsn_code   TEXT,
  status     TEXT        NOT NULL DEFAULT 'running'
                         CHECK (status IN ('running', 'paused', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_select" ON jobs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "jobs_insert" ON jobs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "jobs_update" ON jobs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "jobs_delete" ON jobs FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'owner'
  ));


-- =============================================================================
-- 5. INBOUND DCs
-- Delivery challans received from suppliers (raw material coming IN).
-- Each DC header has one or more product_items (see Section 7).
-- =============================================================================
CREATE TABLE inbound_dcs (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id           UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id          UUID        NOT NULL REFERENCES vendors(id),
  challan_no           TEXT        NOT NULL,
  challan_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  -- Aggregate/summary fields (computed from product_items at save time)
  item_desc            TEXT,               -- "3 items" or single item name
  quantity_kg          NUMERIC(12, 3),     -- total KG
  rate_per_kg          NUMERIC(12, 2),     -- only set for single-item DCs
  amount               NUMERIC(12, 2),     -- total amount
  -- Optional fields
  eway_bill_no         TEXT,
  nature_of_processing TEXT,
  reference_no         TEXT,
  -- Audit
  created_by           UUID        REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inbound_dcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbound_dcs_select" ON inbound_dcs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "inbound_dcs_insert" ON inbound_dcs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "inbound_dcs_update" ON inbound_dcs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "inbound_dcs_delete" ON inbound_dcs FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'owner'
  ));


-- =============================================================================
-- 6. OUTBOUND DCs
-- Delivery challans sent to clients (finished goods going OUT).
-- Each DC header has one or more product_items (see Section 7).
-- =============================================================================
CREATE TABLE outbound_dcs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES vendors(id),
  job_id      UUID        REFERENCES jobs(id),
  dc_no       TEXT        NOT NULL,
  dc_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  -- Aggregate/summary fields
  item_desc   TEXT,               -- "3 items" or single item name
  quantity    NUMERIC(12, 3),     -- total pcs
  value       NUMERIC(12, 2),     -- total value ₹
  -- Optional fields
  vehicle_no  TEXT,
  eway_bill_no TEXT,
  party_dc_no TEXT,
  order_no    TEXT,
  -- Audit
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE outbound_dcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outbound_dcs_select" ON outbound_dcs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "outbound_dcs_insert" ON outbound_dcs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "outbound_dcs_update" ON outbound_dcs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "outbound_dcs_delete" ON outbound_dcs FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'owner'
  ));


-- =============================================================================
-- 7. PRODUCT ITEMS
-- Line items for both inbound and outbound DCs.
-- dc_type = 'inbound'  → inbound_dc_id is set,  outbound_dc_id is NULL
-- dc_type = 'outbound' → outbound_dc_id is set, inbound_dc_id is NULL
-- CHECK constraint enforces exactly one FK is set.
-- =============================================================================
CREATE TABLE product_items (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  dc_type        TEXT        NOT NULL CHECK (dc_type IN ('inbound', 'outbound')),
  inbound_dc_id  UUID        REFERENCES inbound_dcs(id)  ON DELETE CASCADE,
  outbound_dc_id UUID        REFERENCES outbound_dcs(id) ON DELETE CASCADE,
  -- Common fields
  item_desc      TEXT        NOT NULL,
  hsn_code       TEXT,
  -- Inbound-specific fields (KG-based)
  quantity_kg    NUMERIC(12, 3),
  rate_per_kg    NUMERIC(12, 2),
  amount         NUMERIC(12, 2),
  -- Outbound-specific fields (pcs-based)
  quantity       NUMERIC(12, 3),
  value          NUMERIC(12, 2),
  -- Audit
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  -- Exactly one DC FK must be set
  CONSTRAINT product_items_one_dc CHECK (
    (dc_type = 'inbound'  AND inbound_dc_id  IS NOT NULL AND outbound_dc_id IS NULL) OR
    (dc_type = 'outbound' AND outbound_dc_id IS NOT NULL AND inbound_dc_id  IS NULL)
  )
);

ALTER TABLE product_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_items_select" ON product_items FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "product_items_insert" ON product_items FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "product_items_delete" ON product_items FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));


-- =============================================================================
-- 8. PRODUCTION LOGS
-- Header record for a production session.
-- Stores aggregate totals; per-job breakdown is in production_log_items.
-- =============================================================================
CREATE TABLE production_logs (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id           UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id               UUID        NOT NULL REFERENCES jobs(id),   -- primary job (first item)
  inbound_dc_id        UUID        REFERENCES inbound_dcs(id),     -- optional raw material link
  -- Aggregate totals
  material_consumed_kg NUMERIC(12, 3) NOT NULL DEFAULT 0,
  good_qty             INTEGER     NOT NULL DEFAULT 0,
  reject_qty           INTEGER     NOT NULL DEFAULT 0,
  -- Optional top-level notes (single-job logs)
  notes                TEXT,
  -- Audit
  created_by           UUID        REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "production_logs_select" ON production_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "production_logs_insert" ON production_logs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "production_logs_update" ON production_logs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "production_logs_delete" ON production_logs FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'owner'
  ));


-- =============================================================================
-- 9. PRODUCTION LOG ITEMS
-- Per-job breakdown within a production log session.
-- One log can cover multiple jobs in a single shift.
-- =============================================================================
CREATE TABLE production_log_items (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id               UUID        NOT NULL REFERENCES production_logs(id) ON DELETE CASCADE,
  company_id           UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id               UUID        NOT NULL REFERENCES jobs(id),
  material_consumed_kg NUMERIC(12, 3) NOT NULL DEFAULT 0,
  good_qty             INTEGER     NOT NULL DEFAULT 0,
  reject_qty           INTEGER     NOT NULL DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE production_log_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "production_log_items_select" ON production_log_items FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "production_log_items_insert" ON production_log_items FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "production_log_items_delete" ON production_log_items FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));


-- =============================================================================
-- 10. AUTH TRIGGER
-- Fires after a new user signs up via Supabase Auth.
-- Reads metadata passed in signUp({ options: { data: { ... } } }) and creates
-- the profile row automatically.
-- Required metadata keys: full_name, role, company_id
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, company_id, role, full_name)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data ->> 'company_id')::UUID,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'supervisor'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- =============================================================================
-- 11. INDEXES (performance)
-- =============================================================================
CREATE INDEX idx_profiles_company      ON profiles(company_id);
CREATE INDEX idx_vendors_company       ON vendors(company_id);
CREATE INDEX idx_vendors_type          ON vendors(type);
CREATE INDEX idx_jobs_company          ON jobs(company_id);
CREATE INDEX idx_jobs_client           ON jobs(client_id);
CREATE INDEX idx_jobs_status           ON jobs(status);
CREATE INDEX idx_inbound_dcs_company   ON inbound_dcs(company_id);
CREATE INDEX idx_inbound_dcs_supplier  ON inbound_dcs(supplier_id);
CREATE INDEX idx_inbound_dcs_date      ON inbound_dcs(challan_date);
CREATE INDEX idx_outbound_dcs_company  ON outbound_dcs(company_id);
CREATE INDEX idx_outbound_dcs_client   ON outbound_dcs(client_id);
CREATE INDEX idx_outbound_dcs_date     ON outbound_dcs(dc_date);
CREATE INDEX idx_product_items_inbound ON product_items(inbound_dc_id)  WHERE inbound_dc_id  IS NOT NULL;
CREATE INDEX idx_product_items_outbound ON product_items(outbound_dc_id) WHERE outbound_dc_id IS NOT NULL;
CREATE INDEX idx_prod_logs_company     ON production_logs(company_id);
CREATE INDEX idx_prod_logs_job         ON production_logs(job_id);
CREATE INDEX idx_prod_log_items_log    ON production_log_items(log_id);


-- =============================================================================
-- DONE
-- Next step: Run database/sample_data.sql to seed demo data (optional)
-- =============================================================================
