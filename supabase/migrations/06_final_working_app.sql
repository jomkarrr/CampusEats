-- ============================================================
--  Campus Eats — Migration 06: Consolidated Working App Repair
--  File: supabase/migrations/06_final_working_app.sql
--  Run this FIRST in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. SCHEMA UPGRADES ─────────────────────────────────────

-- Add payment columns to orders if not already present
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Fix Choose Purpose bypass:
-- Drop DEFAULT 'customer' and NOT NULL from profiles.role so fresh signups
-- don't automatically get locked into 'customer' before choosing their role.
ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role DROP NOT NULL;

-- Update profile trigger to insert user without pre-assigning 'customer' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ─── 2. DROP ALL EXISTING POLICIES (CLEAN SLATE) ────────────

-- Outlets
DROP POLICY IF EXISTS "outlets: authenticated read" ON public.outlets;
DROP POLICY IF EXISTS "outlets: select policy" ON public.outlets;

-- Menu Items
DROP POLICY IF EXISTS "menu_items: authenticated read" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items: select policy" ON public.menu_items;

-- Profiles
DROP POLICY IF EXISTS "profiles: own row select" ON public.profiles;
DROP POLICY IF EXISTS "profiles: authenticated read" ON public.profiles;
DROP POLICY IF EXISTS "profiles: select policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles: own row update" ON public.profiles;
DROP POLICY IF EXISTS "profiles: own row insert (trigger only)" ON public.profiles;

-- Orders
DROP POLICY IF EXISTS "orders: customer own" ON public.orders;
DROP POLICY IF EXISTS "orders: select policy" ON public.orders;
DROP POLICY IF EXISTS "orders: update own" ON public.orders;
DROP POLICY IF EXISTS "orders: update policy" ON public.orders;
DROP POLICY IF EXISTS "orders: customer insert" ON public.orders;
DROP POLICY IF EXISTS "orders: customer delete placed" ON public.orders;
DROP POLICY IF EXISTS "orders: delete policy" ON public.orders;
DROP POLICY IF EXISTS "orders: demo outlet mode update" ON public.orders;

-- Order Items
DROP POLICY IF EXISTS "order_items: visible via order" ON public.order_items;
DROP POLICY IF EXISTS "order_items: select policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items: insert own order" ON public.order_items;
DROP POLICY IF EXISTS "order_items: delete own placed order" ON public.order_items;

-- Deliveries
DROP POLICY IF EXISTS "deliveries: partner own" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries: select policy" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries: partner update own" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries: partner insert" ON public.deliveries;


-- ─── 3. SECURITY DEFINER HELPER FUNCTIONS ───────────────────
-- All cross-table checks run inside SECURITY DEFINER functions with
-- SET search_path = public. RLS is bypassed internally, completely
-- preventing any infinite mutual recursion (orders <-> deliveries).

-- Helper 1: Current user's role (bypasses profiles RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper 2: Order IDs assigned to the current partner (bypasses deliveries RLS)
CREATE OR REPLACE FUNCTION public.my_delivery_order_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT order_id FROM public.deliveries WHERE partner_id = auth.uid();
$$;

-- Helper 3: Order IDs placed by the current customer (bypasses orders RLS)
CREATE OR REPLACE FUNCTION public.my_customer_order_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.orders WHERE customer_id = auth.uid();
$$;

-- Helper 4: Safe profile viewing permissions (bypasses orders & deliveries RLS)
CREATE OR REPLACE FUNCTION public.can_view_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    -- 1. Users can always read their own profile
    target_profile_id = auth.uid()
    -- 2. Delivery partner can read customer contact for ready or assigned orders
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.customer_id = target_profile_id
        AND o.fulfillment = 'delivery'
        AND (
          o.status = 'ready'
          OR o.id IN (SELECT d.order_id FROM public.deliveries d WHERE d.partner_id = auth.uid())
        )
    )
    -- 3. Customer can view their assigned delivery partner's contact
    OR EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.orders o ON o.id = d.order_id
      WHERE d.partner_id = target_profile_id
        AND o.customer_id = auth.uid()
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.my_delivery_order_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_customer_order_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;


-- ─── 4. RECREATE RLS POLICIES (STRICT & ACYCLIC) ─────────────

-- ─── OUTLETS ───
-- Outlets are public on campus — both authenticated users and guests can view them
CREATE POLICY "outlets: select policy"
  ON public.outlets FOR SELECT
  USING (true);

-- ─── MENU ITEMS ───
-- Menu items are publicly browseable to ensure menus always render
CREATE POLICY "menu_items: select policy"
  ON public.menu_items FOR SELECT
  USING (true);

-- ─── PROFILES ───
CREATE POLICY "profiles: select policy"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.can_view_profile(id)
  );

CREATE POLICY "profiles: update policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: insert policy"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── DELIVERIES ───
-- Deliveries has NO subqueries to orders.
-- Authenticated users can view delivery rows so partners can filter unassigned pool,
-- and customers can check delivery assignment.
CREATE POLICY "deliveries: select policy"
  ON public.deliveries FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "deliveries: partner insert"
  ON public.deliveries FOR INSERT
  WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "deliveries: partner update own"
  ON public.deliveries FOR UPDATE
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

-- ─── ORDERS ───
CREATE POLICY "orders: select policy"
  ON public.orders FOR SELECT
  USING (
    -- Customer views their own orders
    auth.uid() = customer_id
    -- Delivery partner views their assigned orders (via security definer helper)
    OR id IN (SELECT public.my_delivery_order_ids())
    -- Available delivery pool: only visible to delivery partners
    OR (
      fulfillment = 'delivery'
      AND status = 'ready'
      AND public.get_my_role() = 'delivery_partner'
    )
    -- [DEMO-SCOPE] Allow authenticated users to view active orders for Outlet Mode demo
    OR (auth.role() = 'authenticated' AND status IN ('placed', 'accepted', 'preparing', 'ready'))
  );

CREATE POLICY "orders: customer insert"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "orders: update policy"
  ON public.orders FOR UPDATE
  USING (
    -- Customer can update own order
    auth.uid() = customer_id
    -- Assigned partner can update order status (ready -> picked_up -> delivered)
    OR id IN (SELECT public.my_delivery_order_ids())
    -- [DEMO-SCOPE] Outlet Mode: allows authenticated demo stall operators to transition orders (placed -> accepted -> preparing -> ready)
    OR (auth.role() = 'authenticated' AND status IN ('placed', 'accepted', 'preparing', 'ready'))
  )
  WITH CHECK (
    auth.uid() = customer_id
    OR id IN (SELECT public.my_delivery_order_ids())
    OR (auth.role() = 'authenticated' AND status IN ('placed', 'accepted', 'preparing', 'ready', 'cancelled'))
  );

-- Customer can delete their own 'placed' order (essential for rollback if item insertion fails)
CREATE POLICY "orders: customer delete placed"
  ON public.orders FOR DELETE
  USING (
    auth.uid() = customer_id
    AND status = 'placed'
  );

-- ─── ORDER ITEMS ───
CREATE POLICY "order_items: select policy"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
    )
  );

CREATE POLICY "order_items: insert own order"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "order_items: delete own placed order"
  ON public.order_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.customer_id = auth.uid() AND o.status = 'placed'
    )
  );
