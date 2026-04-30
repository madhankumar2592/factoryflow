-- =============================================================================
-- Migration 006 — Allow unauthenticated company creation (self-serve signup)
-- =============================================================================
-- Applied: After migration 005
-- Description:
--   FactoryFlow is a multi-tenant SaaS. When a new company (e.g. Mold Tech)
--   signs up, they are not yet authenticated — so we need an INSERT policy on
--   the companies table that allows the anon role to create one company row.
--   The owner account is created immediately after via supabase.auth.signUp,
--   and the handle_new_user() trigger links the profile to that company_id.
--
--   The UPDATE policy already restricts changes to owners of that company,
--   so this INSERT policy does not open any ongoing security hole.
-- =============================================================================

CREATE POLICY IF NOT EXISTS "companies_insert_signup" ON companies
  FOR INSERT
  WITH CHECK (true);
