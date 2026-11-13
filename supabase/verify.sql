-- ============================================================
--  Campus Eats — Data Verification Script
--  File: supabase/verify.sql
--  Run this in Supabase Dashboard → SQL Editor to confirm data
-- ============================================================

-- 1. Total counts check (expect: 5 outlets, 40+ menu items)
SELECT
  (SELECT COUNT(*) FROM public.outlets)    AS total_outlets,
  (SELECT COUNT(*) FROM public.menu_items) AS total_menu_items;

-- 2. Breakdown per outlet
SELECT
  o.id,
  o.name,
  o.location,
  o.is_open,
  COUNT(m.id) AS menu_item_count,
  COUNT(DISTINCT m.category) AS category_count,
  COUNT(CASE WHEN m.is_veg THEN 1 END) AS veg_items,
  COUNT(CASE WHEN NOT m.is_veg THEN 1 END) AS non_veg_items
FROM public.outlets o
LEFT JOIN public.menu_items m ON m.outlet_id = o.id
GROUP BY o.id, o.name, o.location, o.is_open
ORDER BY o.name;

-- 3. Verify RLS table settings
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'outlets', 'menu_items', 'orders', 'order_items', 'deliveries')
ORDER BY tablename;

