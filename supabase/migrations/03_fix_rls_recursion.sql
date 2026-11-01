-- ============================================================
--  Campus Eats — Migration 03: Fix Infinite RLS Policy Recursion
--  File: supabase/migrations/03_fix_rls_recursion.sql
--  Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. DROP EXISTING POLICIES CAUSING RECURSION ────────────

-- Profiles policies
DROP POLICY IF EXISTS "profiles: own row select" ON public.profiles;
DROP POLICY IF EXISTS "profiles: authenticated read" ON public.profiles;
DROP POLICY IF EXISTS "profiles: select policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles: own row update" ON public.profiles;
DROP POLICY IF EXISTS "profiles: own row insert (trigger only)" ON public.profiles;

-- Orders policies
DROP POLICY IF EXISTS "orders: customer own" ON public.orders;
DROP POLICY IF EXISTS "orders: select policy" ON public.orders;
DROP POLICY IF EXISTS "orders: update own" ON public.orders;
DROP POLICY IF EXISTS "orders: update policy" ON public.orders;
DROP POLICY IF EXISTS "orders: customer insert" ON public.orders;

-- Order items policies
DROP POLICY IF EXISTS "order_items: visible via order" ON public.order_items;
DROP POLICY IF EXISTS "order_items: insert own order" ON public.order_items;

-- Deliveries policies
DROP POLICY IF EXISTS "deliveries: partner own" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries: select policy" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries: partner update own" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries: partner insert" ON public.deliveries;


-- ─── 2. CREATE SECURITY DEFINER HELPER FUNCTIONS ───────────
-- Note: SECURITY DEFINER functions run with owner privileges and bypass
-- Row Level Security on the tables queried inside them. This breaks the
-- mutual cyclic dependency between deliveries, orders, and profiles.

-- Helper: Returns order IDs assigned to current delivery partner (bypasses deliveries RLS)
CREATE OR REPLACE FUNCTION public.my_delivery_order_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT order_id
  FROM public.deliveries
  WHERE partner_id = auth.uid();
$$;

-- Helper: Returns order IDs placed by current customer (bypasses orders RLS)
CREATE OR REPLACE FUNCTION public.my_customer_order_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM public.orders
  WHERE customer_id = auth.uid();
$$;

-- Helper: Checks whether current user can view a given target profile (bypasses orders & deliveries RLS)
CREATE OR REPLACE FUNCTION public.can_view_profile(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    -- 1. Users can always view their own profile
    target_profile_id = auth.uid()
    -- 2. Delivery partner can view customer profile for ready delivery orders or assigned orders
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.customer_id = target_profile_id
        AND o.fulfillment = 'delivery'
        AND (
          o.status = 'ready'
          OR o.id IN (SELECT d.order_id FROM public.deliveries d WHERE d.partner_id = auth.uid())
        )
    )
    -- 3. Customer can view their assigned delivery partner's profile
    OR EXISTS (
      SELECT 1 FROM public.deliveries d
      JOIN public.orders o ON o.id = d.order_id
      WHERE d.partner_id = target_profile_id
        AND o.customer_id = auth.uid()
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.my_delivery_order_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_customer_order_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;


-- ─── 3. RECREATE RLS POLICIES (ACYCLIC) ──────────────────────

-- ─── PROFILES ───
CREATE POLICY "profiles: select policy"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.can_view_profile(id)
  );

CREATE POLICY "profiles: own row update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: own row insert (trigger only)"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ─── DELIVERIES ───
-- Deliveries has zero subqueries into orders.
-- Partner access uses direct partner_id match; customer access uses definer function;
-- authenticated role check allows partners to view existing delivery assignments without conflicts.
CREATE POLICY "deliveries: select policy"
  ON public.deliveries FOR SELECT
  USING (
    partner_id = auth.uid()
    OR order_id IN (SELECT public.my_customer_order_ids())
    OR auth.role() = 'authenticated'
  );

CREATE POLICY "deliveries: partner insert"
  ON public.deliveries FOR INSERT
  WITH CHECK (
    auth.uid() = partner_id
  );

CREATE POLICY "deliveries: partner update own"
  ON public.deliveries FOR UPDATE
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);


-- ─── ORDERS ───
-- Orders uses public.my_delivery_order_ids() (SECURITY DEFINER) instead of a direct
-- subquery into deliveries, completely avoiding recursive RLS evaluation.
CREATE POLICY "orders: select policy"
  ON public.orders FOR SELECT
  USING (
    -- Customer sees their own orders
    auth.uid() = customer_id
    -- Assigned delivery partner sees orders assigned to them
    OR id IN (SELECT public.my_delivery_order_ids())
    -- Delivery partners see available ready delivery pool
    OR (
      fulfillment = 'delivery'
      AND status = 'ready'
    )
  );

CREATE POLICY "orders: customer insert"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id
  );

CREATE POLICY "orders: update policy"
  ON public.orders FOR UPDATE
  USING (
    auth.uid() = customer_id
    OR id IN (SELECT public.my_delivery_order_ids())
  )
  WITH CHECK (
    auth.uid() = customer_id
    OR id IN (SELECT public.my_delivery_order_ids())
  );


-- ─── ORDER ITEMS ───
CREATE POLICY "order_items: visible via order"
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
