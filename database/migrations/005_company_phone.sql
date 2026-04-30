-- =============================================================================
-- Migration 005 — Add phone to companies table
-- =============================================================================
-- Applied: After migration 004
-- Description: Adds a phone field to companies so it can appear on challans.
-- =============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
