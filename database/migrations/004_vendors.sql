-- =============================================================================
-- Migration 004 — Vendors Table (Consolidate suppliers + clients)
-- =============================================================================
-- Applied: After migration 003
-- Description: Replaces separate `suppliers` and `clients` tables with a
--              single `vendors` table. A vendor can be a supplier, client,
--              or both — controlled by the `type` column.
--
--              type = 'supplier' → shown in Inbound DC supplier picker
--              type = 'client'   → shown in Outbound DC client picker + Jobs
--              type = 'both'     → shown in all pickers
--
-- How to apply on an existing DB:
--   1. Run the CREATE TABLE and RLS block
--   2. Run the INSERT migration blocks to copy existing data
--   3. Run the ALTER TABLE blocks to re-point foreign keys
--   4. (Optional) DROP the old tables once the app is verified working
-- =============================================================================


-- Step 1: Create vendors table
-- -----------------------------------------------------------------------------
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

CREATE INDEX idx_vendors_company ON vendors(company_id);
CREATE INDEX idx_vendors_type    ON vendors(type);


-- Step 2a: Copy all existing suppliers into vendors (preserve UUIDs)
-- -----------------------------------------------------------------------------
INSERT INTO vendors (id, company_id, name, gstin, address, type, created_at)
SELECT id, company_id, name, gstin, address, 'supplier', created_at
FROM suppliers;


-- Step 2b: Copy all existing clients into vendors (preserve UUIDs)
--          ON CONFLICT handles the (rare) case where a UUID exists in both tables
--          → marks that record as 'both'
-- -----------------------------------------------------------------------------
INSERT INTO vendors (id, company_id, name, gstin, address, type, created_at)
SELECT id, company_id, name, gstin, address, 'client', created_at
FROM clients
ON CONFLICT (id) DO UPDATE SET type = 'both';


-- Step 3a: Re-point inbound_dcs.supplier_id → vendors
-- -----------------------------------------------------------------------------
ALTER TABLE inbound_dcs DROP CONSTRAINT IF EXISTS inbound_dcs_supplier_id_fkey;
ALTER TABLE inbound_dcs ADD CONSTRAINT inbound_dcs_supplier_id_fkey
  FOREIGN KEY (supplier_id) REFERENCES vendors(id);


-- Step 3b: Re-point outbound_dcs.client_id → vendors
-- -----------------------------------------------------------------------------
ALTER TABLE outbound_dcs DROP CONSTRAINT IF EXISTS outbound_dcs_client_id_fkey;
ALTER TABLE outbound_dcs ADD CONSTRAINT outbound_dcs_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES vendors(id);


-- Step 3c: Re-point jobs.client_id → vendors
-- -----------------------------------------------------------------------------
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_client_id_fkey;
ALTER TABLE jobs ADD CONSTRAINT jobs_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES vendors(id);


-- Step 4: Drop old tables (ONLY after verifying the app works correctly)
-- -----------------------------------------------------------------------------
-- DROP TABLE suppliers CASCADE;
-- DROP TABLE clients CASCADE;
