-- =============================================================================
-- FactoryFlow — Sample / Seed Data
-- =============================================================================
-- Run AFTER schema.sql on a fresh DB.
-- Creates one demo company + owner user placeholder.
--
-- IMPORTANT: The owner user must be created via Supabase Auth
-- (Dashboard → Authentication → Users → Add User) BEFORE running this,
-- because the profiles table references auth.users.
--
-- Steps to use this file:
--   1. Run schema.sql first
--   2. Create the owner user in Supabase Auth Dashboard
--      Email: owner@moldtech.com  Password: Demo@1234
--   3. Copy the user UUID from Auth → Users
--   4. Replace <<OWNER_USER_UUID>> below with that UUID
--   5. Run this file
-- =============================================================================


-- =============================================================================
-- Demo Company
-- =============================================================================
INSERT INTO companies (id, name, gstin, address)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Mold Tech Diecasting Pvt Ltd',
  '33AAWFA7205M1Z3',
  'Plot 42, SIPCOT Industrial Estate, Hosur, Tamil Nadu - 635126'
);


-- =============================================================================
-- Owner Profile
-- Replace <<OWNER_USER_UUID>> with the actual UUID from Supabase Auth.
-- =============================================================================
-- INSERT INTO profiles (id, company_id, role, full_name)
-- VALUES (
--   '<<OWNER_USER_UUID>>',
--   'aaaaaaaa-0000-0000-0000-000000000001',
--   'owner',
--   'Madhan Kumar'
-- );


-- =============================================================================
-- Demo Vendors (Suppliers + Clients)
-- =============================================================================
INSERT INTO vendors (id, company_id, name, gstin, address, type) VALUES
  -- Suppliers (raw material providers)
  ('bbbbbbbb-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Alu Dyco Mfg Co', '33AABCA1234M1Z5',
   'SF No. 12/3, Thudiyalur Road, Coimbatore - 641034', 'supplier'),

  ('bbbbbbbb-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Bharat Alloys Ltd', '27AAGCB5678N1Z2',
   'Plot 7, MIDC Ambad, Nashik, Maharashtra - 422010', 'supplier'),

  ('bbbbbbbb-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'South India Metal Works', '33AAHCS9012P1Z8',
   '45/2 Mettupalayam Road, Coimbatore - 641043', 'supplier'),

  -- Clients (finished goods buyers)
  ('bbbbbbbb-0000-0000-0000-000000000004',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Ashok Leyland Ltd', '33AABCA9876K1Z1',
   'Ennore High Road, Thiruvottiyur, Chennai - 600019', 'client'),

  ('bbbbbbbb-0000-0000-0000-000000000005',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Sundaram Clayton Ltd', '33AACCS5432L1Z4',
   'Padi, Chennai, Tamil Nadu - 600050', 'client'),

  -- Both supplier and client
  ('bbbbbbbb-0000-0000-0000-000000000006',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Texmo Industries', '33AAAFT3210M1Z7',
   '3/280 Avinashi Road, Tirupur, Tamil Nadu - 641603', 'both');


-- =============================================================================
-- Demo Jobs
-- =============================================================================
INSERT INTO jobs (id, company_id, client_id, item_name, hsn_code, status) VALUES
  ('cccccccc-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000004',
   'Gear Housing - ADC12', '73259990', 'running'),

  ('cccccccc-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000004',
   'Bearing Cap - Aluminium', '76151910', 'running'),

  ('cccccccc-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000005',
   'Brake Caliper Housing', '87083000', 'running'),

  ('cccccccc-0000-0000-0000-000000000004',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000005',
   'Pump Body - LM6', '84139100', 'paused'),

  ('cccccccc-0000-0000-0000-000000000005',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000006',
   'Motor End Shield', '85030090', 'completed');


-- =============================================================================
-- Demo Inbound DCs
-- =============================================================================
INSERT INTO inbound_dcs (id, company_id, supplier_id, challan_no, challan_date,
  item_desc, quantity_kg, amount) VALUES
  ('dddddddd-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001',
   '7180', CURRENT_DATE,
   '2 items', 500.000, 87500.00),

  ('dddddddd-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000002',
   '3241', CURRENT_DATE - 1,
   'Aluminium Ingots ADC 12', 300.000, 52500.00);


-- Demo product_items for inbound DCs
INSERT INTO product_items (company_id, dc_type, inbound_dc_id, item_desc,
  quantity_kg, rate_per_kg, amount) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'inbound',
   'dddddddd-0000-0000-0000-000000000001',
   'Aluminium Ingots ADC 12', 300.000, 175.00, 52500.00),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'inbound',
   'dddddddd-0000-0000-0000-000000000001',
   'Aluminium Ingots LM6', 200.000, 175.00, 35000.00),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'inbound',
   'dddddddd-0000-0000-0000-000000000002',
   'Aluminium Ingots ADC 12', 300.000, 175.00, 52500.00);


-- =============================================================================
-- Demo Outbound DCs
-- =============================================================================
INSERT INTO outbound_dcs (id, company_id, client_id, job_id, dc_no, dc_date,
  item_desc, quantity, value) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000004',
   'cccccccc-0000-0000-0000-000000000001',
   '2271', CURRENT_DATE,
   'Gear Housing - ADC12', 250, 312500.00),

  ('eeeeeeee-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000005',
   'cccccccc-0000-0000-0000-000000000003',
   '2270', CURRENT_DATE - 1,
   '2 items', 180, 270000.00);


-- Demo product_items for outbound DCs
INSERT INTO product_items (company_id, dc_type, outbound_dc_id, item_desc,
  quantity, value) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'outbound',
   'eeeeeeee-0000-0000-0000-000000000001',
   'Gear Housing - ADC12', 250, 312500.00),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'outbound',
   'eeeeeeee-0000-0000-0000-000000000002',
   'Brake Caliper Housing', 120, 180000.00),

  ('aaaaaaaa-0000-0000-0000-000000000001', 'outbound',
   'eeeeeeee-0000-0000-0000-000000000002',
   'Pump Body - LM6', 60, 90000.00);


-- =============================================================================
-- Demo Production Logs
-- =============================================================================
INSERT INTO production_logs (id, company_id, job_id, material_consumed_kg,
  good_qty, reject_qty) VALUES
  ('ffffffff-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001',
   180.500, 240, 10),

  ('ffffffff-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000002',
   95.000, 115, 5);


-- Demo production_log_items
INSERT INTO production_log_items (log_id, company_id, job_id,
  material_consumed_kg, good_qty, reject_qty) VALUES
  ('ffffffff-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001',
   180.500, 240, 10),

  ('ffffffff-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000002',
   95.000, 115, 5);
