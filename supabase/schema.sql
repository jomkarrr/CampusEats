-- ============================================================
--  Campus Eats — Supabase Schema
--  Run this in Supabase → SQL Editor (fresh schema)
-- ============================================================

-- Enable UUID extension (already enabled in Supabase by default)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ─────────────────────────────────────────────────

CREATE TYPE user_role         AS ENUM ('customer', 'delivery_partner');
CREATE TYPE order_status      AS ENUM ('placed','accepted','preparing','ready','picked_up','delivered','cancelled');
CREATE TYPE fulfillment_type  AS ENUM ('pickup','delivery');
CREATE TYPE delivery_status   AS ENUM ('assigned','picked_up','delivered');

-- ─── TABLES ────────────────────────────────────────────────

-- profiles: one row per auth.users user
CREATE TABLE public.profiles (
  id          UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role     NOT NULL DEFAULT 'customer',
  full_name   TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- outlets (seeded via seed.sql — not managed by app users)
CREATE TABLE public.outlets (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT          NOT NULL,
  location    TEXT,
  image_url   TEXT,
  rating      NUMERIC(2,1)  CHECK (rating >= 0 AND rating <= 5),
  eta_text    TEXT,
  open_hours  TEXT,
  is_open     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- menu_items
CREATE TABLE public.menu_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id     UUID        NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  description   TEXT,
  price         NUMERIC(8,2) NOT NULL CHECK (price >= 0),
  image_url     TEXT,
  category      TEXT,
  is_veg        BOOLEAN     NOT NULL DEFAULT TRUE,
  is_available  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- orders
CREATE TABLE public.orders (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID             NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  outlet_id    UUID             NOT NULL REFERENCES public.outlets(id)  ON DELETE RESTRICT,
  status       order_status     NOT NULL DEFAULT 'placed',
  fulfillment  fulfillment_type NOT NULL,
  total        NUMERIC(10,2)    NOT NULL CHECK (total >= 0),
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- order_items
CREATE TABLE public.order_items (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID         NOT NULL REFERENCES public.orders(id)     ON DELETE CASCADE,
  menu_item_id  UUID         NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  qty           INTEGER      NOT NULL CHECK (qty > 0),
  unit_price    NUMERIC(8,2) NOT NULL CHECK (unit_price >= 0)
);

-- deliveries
CREATE TABLE public.deliveries (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID             NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  partner_id  UUID             NOT NULL REFERENCES public.profiles(id)      ON DELETE RESTRICT,
  status      delivery_status  NOT NULL DEFAULT 'assigned',
  earnings    NUMERIC(8,2)     NOT NULL DEFAULT 0 CHECK (earnings >= 0),
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ───────────────────────────────────────────────

CREATE INDEX idx_menu_items_outlet    ON public.menu_items (outlet_id);
CREATE INDEX idx_orders_customer      ON public.orders (customer_id);
CREATE INDEX idx_orders_outlet        ON public.orders (outlet_id);
CREATE INDEX idx_orders_status        ON public.orders (status);
CREATE INDEX idx_order_items_order    ON public.order_items (order_id);
CREATE INDEX idx_deliveries_partner   ON public.deliveries (partner_id);
CREATE INDEX idx_deliveries_order     ON public.deliveries (order_id);

-- ─── TRIGGER: auto-create profile on signup ───────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- profiles: users can only read/update their own row
CREATE POLICY "profiles: own row select"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: own row update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: own row insert (trigger only)"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- outlets: everyone authenticated can read
CREATE POLICY "outlets: authenticated read"
  ON public.outlets FOR SELECT
  USING (auth.role() = 'authenticated');

-- menu_items: everyone authenticated can read
CREATE POLICY "menu_items: authenticated read"
  ON public.menu_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- orders: customers see their own; delivery partners see orders assigned to them
CREATE POLICY "orders: customer own"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = customer_id
    OR EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.order_id = orders.id AND d.partner_id = auth.uid()
    )
  );

CREATE POLICY "orders: customer insert"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "orders: update own"
  ON public.orders FOR UPDATE
  USING (
    auth.uid() = customer_id
    OR EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.order_id = orders.id AND d.partner_id = auth.uid()
    )
  );

-- order_items: visible when the parent order is visible
CREATE POLICY "order_items: visible via order"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          o.customer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.deliveries d
            WHERE d.order_id = o.id AND d.partner_id = auth.uid()
          )
        )
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

-- deliveries: partners see their own; customers see delivery for their order
CREATE POLICY "deliveries: partner own"
  ON public.deliveries FOR SELECT
  USING (
    auth.uid() = partner_id
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = deliveries.order_id AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "deliveries: partner update own"
  ON public.deliveries FOR UPDATE
  USING (auth.uid() = partner_id);

-- service role (used by backend / edge functions) bypasses RLS automatically
