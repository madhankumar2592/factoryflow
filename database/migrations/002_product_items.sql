-- =============================================================================
-- Migration 002 — Product Items Table (Multi-item DC support)
-- =============================================================================
-- Applied: After initial schema
-- Description: Adds product_items table so each inbound/outbound DC can have
--              multiple line items. A single table handles both DC types using
--              a dc_type flag ('inbound' | 'outbound') and two nullable FKs
--              with a CHECK constraint enforcing exactly one is set.
--
--              Inbound item fields:  item_desc, hsn_code, quantity_kg,
--                                    rate_per_kg, amount
--              Outbound item fields: item_desc, hsn_code, quantity (pcs), value
-- =============================================================================

CREATE TABLE product_items (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id     UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  dc_type        TEXT        NOT NULL CHECK (dc_type IN ('inbound', 'outbound')),
  inbound_dc_id  UUID        REFERENCES inbound_dcs(id)  ON DELETE CASCADE,
  outbound_dc_id UUID        REFERENCES outbound_dcs(id) ON DELETE CASCADE,
  -- Common
  item_desc      TEXT        NOT NULL,
  hsn_code       TEXT,
  -- Inbound only (KG-based)
  quantity_kg    NUMERIC(12, 3),
  rate_per_kg    NUMERIC(12, 2),
  amount         NUMERIC(12, 2),
  -- Outbound only (pcs-based)
  quantity       NUMERIC(12, 3),
  value          NUMERIC(12, 2),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  -- Exactly one FK must be set
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

CREATE INDEX idx_product_items_inbound  ON product_items(inbound_dc_id)  WHERE inbound_dc_id  IS NOT NULL;
CREATE INDEX idx_product_items_outbound ON product_items(outbound_dc_id) WHERE outbound_dc_id IS NOT NULL;
