-- ============================================================
--  Campus Eats — Phase 4: Delivery Partner RLS Policies
--  File: supabase/migrations/02_partner_policies.sql
--  Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. PROFILES: Allow delivery partners to read profile (name, phone, hostel_block)
-- of customers whose orders they have been assigned to, OR of customer orders that are ready for delivery.
-- Also allow customers to read their assigned delivery partner's profile (name, phone).

-- Drop existing restrictive select policy if exists and create a comprehensive one
DROP POLICY IF EXISTS "profiles: own row select" ON public.profiles;
DROP POLICY IF EXISTS "profiles: authenticated read" ON public.profiles;

CREATE POLICY "profiles: authenticated read"
  ON public.profiles FOR SELECT
  USING (
    -- Users can read their own profile
    auth.uid() = id
    -- OR a delivery partner can view customer profiles for delivery orders
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.customer_id = profiles.id
        AND o.fulfillment = 'delivery'
        AND (
          o.status IN ('ready', 'picked_up', 'delivered')
          OR EXISTS (
            SELECT 1 FROM public.deliveries d
            WHERE d.order_id = o.id AND d.partner_id = auth.uid()
          )
        )
    )
    -- OR a customer can view their assigned delivery partner's profile
    OR EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.orders o ON o.id = d.order_id
      WHERE d.partner_id = profiles.id
        AND o.customer_id = auth.uid()
    )
  );

-- 2. ORDERS: Allow delivery partners to view:
-- - orders that are fulfillment = 'delivery' and status = 'ready' (available pool)
-- - orders that they are currently assigned to (via deliveries table)
DROP POLICY IF EXISTS "orders: customer own" ON public.orders;
DROP POLICY IF EXISTS "orders: select policy" ON public.orders;

CREATE POLICY "orders: select policy"
  ON public.orders FOR SELECT
  USING (
    -- Customer sees their own orders
    auth.uid() = customer_id
    -- Delivery partner sees orders assigned to them
    OR EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.order_id = orders.id AND d.partner_id = auth.uid()
    )
    -- Delivery partner can see unassigned ready delivery orders
    OR (
      fulfillment = 'delivery'
      AND status = 'ready'
    )
  );

-- Allow delivery partners to update orders that are assigned to them (e.g. ready -> picked_up -> delivered)
DROP POLICY IF EXISTS "orders: update own" ON public.orders;
DROP POLICY IF EXISTS "orders: update policy" ON public.orders;

CREATE POLICY "orders: update policy"
  ON public.orders FOR UPDATE
  USING (
    auth.uid() = customer_id
    OR EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.order_id = orders.id AND d.partner_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = customer_id
    OR EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.order_id = orders.id AND d.partner_id = auth.uid()
    )
  );

-- 3. ORDER ITEMS: Visible to customers and assigned delivery partners, or for available ready delivery orders
DROP POLICY IF EXISTS "order_items: visible via order" ON public.order_items;

CREATE POLICY "order_items: visible via order"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          o.customer_id = auth.uid()
          OR (o.fulfillment = 'delivery' AND o.status = 'ready')
          OR EXISTS (
            SELECT 1 FROM public.deliveries d
            WHERE d.order_id = o.id AND d.partner_id = auth.uid()
          )
        )
    )
  );

-- 4. DELIVERIES:
-- Delivery partners can:
-- - SELECT their own deliveries, or any delivery row to check availability / conflicts
-- - INSERT delivery row when accepting an order (with partner_id = auth.uid())
-- - UPDATE delivery row assigned to them (status, earnings)
DROP POLICY IF EXISTS "deliveries: partner own" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries: select policy" ON public.deliveries;

CREATE POLICY "deliveries: select policy"
  ON public.deliveries FOR SELECT
  USING (
    auth.uid() = partner_id
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deliveries.order_id AND o.customer_id = auth.uid()
    )
    -- Let partners check existing delivery rows to verify if an order is taken
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "deliveries: partner insert" ON public.deliveries;

CREATE POLICY "deliveries: partner insert"
  ON public.deliveries FOR INSERT
  WITH CHECK (
    auth.uid() = partner_id
  );

DROP POLICY IF EXISTS "deliveries: partner update own" ON public.deliveries;

CREATE POLICY "deliveries: partner update own"
  ON public.deliveries FOR UPDATE
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);
