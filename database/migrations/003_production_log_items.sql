-- =============================================================================
-- Migration 003 — Production Log Items (Multi-job production log support)
-- =============================================================================
-- Applied: After migration 002
-- Description: Adds production_log_items table so a single production log
--              session can record output across multiple jobs in one shift.
--              The production_logs header stores aggregate totals; this table
--              stores the per-job breakdown.
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

CREATE INDEX idx_prod_log_items_log ON production_log_items(log_id);
