-- =============================================================================
-- FactoryFlow — Sample / Seed Data
-- =============================================================================
-- Run AFTER schema.sql on a fresh DB.
--
-- companies.id is now a BIGINT auto-generated identity — we capture it with
-- RETURNING and thread it through all child inserts using a DO block.
--
-- IMPORTANT: After running this file, create the owner user in Supabase:
--   Dashboard → Authentication → Users → Add User
--   Email: owner@moldtech.com   Password: Demo@1234
--   Then uncomment the profile INSERT at the bottom and run it separately,
--   replacing <<OWNER_USER_UUID>> with the real auth user UUID.
-- =============================================================================

DO $$
DECLARE
  co_id BIGINT;
BEGIN

-- =============================================================================
-- 1. Demo Company
-- =============================================================================
INSERT INTO companies (name, gstin, address, phone)
VALUES (
  'Mold Tech Diecasting Pvt Ltd',
  '33AAWFA7205M1Z3',
  'Plot 42, SIPCOT Industrial Estate, Hosur, Tamil Nadu - 635126',
  '+91 98765 43210'
)
RETURNING id INTO co_id;


-- =============================================================================
-- 2. Vendors
-- =============================================================================
INSERT INTO vendors (id, company_id, name, gstin, address, type) VALUES
  -- Suppliers
  ('bbbbbbbb-0000-0000-0000-000000000001', co_id,
   'Alu Dyco Mfg Co', '33AABCA1234M1Z5',
   'SF No. 12/3, Thudiyalur Road, Coimbatore - 641034', 'supplier'),

  ('bbbbbbbb-0000-0000-0000-000000000002', co_id,
   'Bharat Alloys Ltd', '27AAGCB5678N1Z2',
   'Plot 7, MIDC Ambad, Nashik, Maharashtra - 422010', 'supplier'),

  ('bbbbbbbb-0000-0000-0000-000000000003', co_id,
   'South India Metal Works', '33AAHCS9012P1Z8',
   '45/2 Mettupalayam Road, Coimbatore - 641043', 'supplier'),

  -- Clients
  ('bbbbbbbb-0000-0000-0000-000000000004', co_id,
   'Ashok Leyland Ltd', '33AABCA9876K1Z1',
   'Ennore High Road, Thiruvottiyur, Chennai - 600019', 'client'),

  ('bbbbbbbb-0000-0000-0000-000000000005', co_id,
   'Sundaram Clayton Ltd', '33AACCS5432L1Z4',
   'Padi, Chennai, Tamil Nadu - 600050', 'client'),

  -- Both
  ('bbbbbbbb-0000-0000-0000-000000000006', co_id,
   'Texmo Industries', '33AAAFT3210M1Z7',
   '3/280 Avinashi Road, Tirupur, Tamil Nadu - 641603', 'both');


-- =============================================================================
-- 3. Jobs
-- =============================================================================
INSERT INTO jobs (id, company_id, client_id, item_name, hsn_code, status) VALUES
  ('cccccccc-0000-0000-0000-000000000001', co_id,
   'bbbbbbbb-0000-0000-0000-000000000004',
   'Gear Housing - ADC12', '73259990', 'running'),

  ('cccccccc-0000-0000-0000-000000000002', co_id,
   'bbbbbbbb-0000-0000-0000-000000000004',
   'Bearing Cap - Aluminium', '76151910', 'running'),

  ('cccccccc-0000-0000-0000-000000000003', co_id,
   'bbbbbbbb-0000-0000-0000-000000000005',
   'Brake Caliper Housing', '87083000', 'running'),

  ('cccccccc-0000-0000-0000-000000000004', co_id,
   'bbbbbbbb-0000-0000-0000-000000000005',
   'Pump Body - LM6', '84139100', 'paused'),

  ('cccccccc-0000-0000-0000-000000000005', co_id,
   'bbbbbbbb-0000-0000-0000-000000000006',
   'Motor End Shield', '85030090', 'completed');


-- =============================================================================
-- 4. Inbound DCs
-- =============================================================================
INSERT INTO inbound_dcs (id, company_id, supplier_id, challan_no, challan_date,
  item_desc, quantity_kg, amount) VALUES
  ('dddddddd-0000-0000-0000-000000000001', co_id,
   'bbbbbbbb-0000-0000-0000-000000000001',
   '7180', CURRENT_DATE, '2 items', 500.000, 87500.00),

  ('dddddddd-0000-0000-0000-000000000002', co_id,
   'bbbbbbbb-0000-0000-0000-000000000002',
   '3241', CURRENT_DATE - 1,
   'Aluminium Ingots ADC 12', 300.000, 52500.00);


-- Product items for inbound DCs
INSERT INTO product_items (company_id, dc_type, inbound_dc_id, item_desc,
  quantity_kg, rate_per_kg, amount) VALUES
  (co_id, 'inbound', 'dddddddd-0000-0000-0000-000000000001',
   'Aluminium Ingots ADC 12', 300.000, 175.00, 52500.00),

  (co_id, 'inbound', 'dddddddd-0000-0000-0000-000000000001',
   'Aluminium Ingots LM6', 200.000, 175.00, 35000.00),

  (co_id, 'inbound', 'dddddddd-0000-0000-0000-000000000002',
   'Aluminium Ingots ADC 12', 300.000, 175.00, 52500.00);


-- =============================================================================
-- 5. Outbound DCs
-- =============================================================================
INSERT INTO outbound_dcs (id, company_id, client_id, job_id, dc_no, dc_date,
  item_desc, quantity, value) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', co_id,
   'bbbbbbbb-0000-0000-0000-000000000004',
   'cccccccc-0000-0000-0000-000000000001',
   '2271', CURRENT_DATE, 'Gear Housing - ADC12', 250, 312500.00),

  ('eeeeeeee-0000-0000-0000-000000000002', co_id,
   'bbbbbbbb-0000-0000-0000-000000000005',
   'cccccccc-0000-0000-0000-000000000003',
   '2270', CURRENT_DATE - 1, '2 items', 180, 270000.00);


-- Product items for outbound DCs
INSERT INTO product_items (company_id, dc_type, outbound_dc_id, item_desc,
  quantity, value) VALUES
  (co_id, 'outbound', 'eeeeeeee-0000-0000-0000-000000000001',
   'Gear Housing - ADC12', 250, 312500.00),

  (co_id, 'outbound', 'eeeeeeee-0000-0000-0000-000000000002',
   'Brake Caliper Housing', 120, 180000.00),

  (co_id, 'outbound', 'eeeeeeee-0000-0000-0000-000000000002',
   'Pump Body - LM6', 60, 90000.00);


-- =============================================================================
-- 6. Production Logs
-- =============================================================================
INSERT INTO production_logs (id, company_id, job_id, material_consumed_kg,
  good_qty, reject_qty) VALUES
  ('ffffffff-0000-0000-0000-000000000001', co_id,
   'cccccccc-0000-0000-0000-000000000001', 180.500, 240, 10),

  ('ffffffff-0000-0000-0000-000000000002', co_id,
   'cccccccc-0000-0000-0000-000000000002', 95.000, 115, 5);


-- Production log items
INSERT INTO production_log_items (log_id, company_id, job_id,
  material_consumed_kg, good_qty, reject_qty) VALUES
  ('ffffffff-0000-0000-0000-000000000001', co_id,
   'cccccccc-0000-0000-0000-000000000001', 180.500, 240, 10),

  ('ffffffff-0000-0000-0000-000000000002', co_id,
   'cccccccc-0000-0000-0000-000000000002', 95.000, 115, 5);


END $$;


-- =============================================================================
-- Owner Profile — run this separately after creating the user in Supabase Auth
-- =============================================================================
-- 1. Go to Supabase → Authentication → Users → Add User
--    Email: owner@moldtech.com   Password: Demo@1234
-- 2. Copy the UUID shown in the users list
-- 3. Find the company id: SELECT id FROM companies WHERE name LIKE 'Mold Tech%';
-- 4. Uncomment and run:
--
-- INSERT INTO profiles (id, company_id, role, full_name)
-- VALUES (
--   '<<OWNER_USER_UUID>>',
--   1,          -- the auto-generated company id (check with SELECT above)
--   'owner',
--   'Madhan Kumar'
-- );
