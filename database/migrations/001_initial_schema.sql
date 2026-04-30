-- =============================================================================
-- Migration 001 — Initial Schema
-- =============================================================================
-- Applied: Project kickoff
-- Description: Core tables — companies, profiles, suppliers, clients, jobs,
--              inbound_dcs, outbound_dcs, production_logs.
--              Also sets up the auth trigger for auto-profile creation.
--
-- NOTE: This is the original schema BEFORE multi-item DC support and
--       BEFORE the vendors consolidation. Kept here as historical reference.
--       For a fresh setup, use database/schema.sql instead.
-- =============================================================================


-- Companies (SaaS tenants)
CREATE TABLE companies (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL,
  gstin      TEXT,
  address    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_select" ON companies FOR SELECT
  USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));


-- Profiles (one per auth user)
CREATE TABLE profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'supervisor'
                         CHECK (role IN ('owner', 'supervisor')),
  full_name  TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY "profiles_update_owner" ON profiles FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'owner'));


-- Suppliers (raw material vendors)
CREATE TABLE suppliers (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  gstin      TEXT,
  address    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));


-- Clients (finished goods buyers)
CREATE TABLE clients (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  gstin      TEXT,
  address    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_select" ON clients FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "clients_insert" ON clients FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "clients_delete" ON clients FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));


-- Jobs
CREATE TABLE jobs (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id  UUID        NOT NULL REFERENCES clients(id),
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


-- Inbound DCs (single item per DC — before multi-item support)
CREATE TABLE inbound_dcs (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id           UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id          UUID        NOT NULL REFERENCES suppliers(id),
  challan_no           TEXT        NOT NULL,
  challan_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  item_desc            TEXT,
  quantity_kg          NUMERIC(12, 3),
  rate_per_kg          NUMERIC(12, 2),
  amount               NUMERIC(12, 2),
  eway_bill_no         TEXT,
  nature_of_processing TEXT,
  reference_no         TEXT,
  created_by           UUID        REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inbound_dcs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inbound_dcs_select" ON inbound_dcs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "inbound_dcs_insert" ON inbound_dcs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));


-- Outbound DCs (single item per DC — before multi-item support)
CREATE TABLE outbound_dcs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES clients(id),
  job_id      UUID        REFERENCES jobs(id),
  dc_no       TEXT        NOT NULL,
  dc_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  item_desc   TEXT,
  hsn_code    TEXT,
  quantity    NUMERIC(12, 3),
  value       NUMERIC(12, 2),
  vehicle_no  TEXT,
  eway_bill_no TEXT,
  party_dc_no TEXT,
  order_no    TEXT,
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE outbound_dcs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outbound_dcs_select" ON outbound_dcs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "outbound_dcs_insert" ON outbound_dcs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));


-- Production Logs (single job per log — before multi-job support)
CREATE TABLE production_logs (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id           UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id               UUID        NOT NULL REFERENCES jobs(id),
  inbound_dc_id        UUID        REFERENCES inbound_dcs(id),
  material_consumed_kg NUMERIC(12, 3) NOT NULL DEFAULT 0,
  good_qty             INTEGER     NOT NULL DEFAULT 0,
  reject_qty           INTEGER     NOT NULL DEFAULT 0,
  notes                TEXT,
  created_by           UUID        REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "production_logs_select" ON production_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "production_logs_insert" ON production_logs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));


-- Auth trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
