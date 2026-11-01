-- ============================================================
--  Campus Eats — Seed Data
--  Run AFTER schema.sql in Supabase → SQL Editor
--  (or combine into a single migration file)
-- ============================================================

-- ─── OUTLETS ───────────────────────────────────────────────

INSERT INTO public.outlets (id, name, location, image_url, rating, eta_text, open_hours, is_open)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Pizza Stall',
    'Food Street, Block A, VIT-AP Campus',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format',
    4.5,
    '10–15 min',
    '9:00 AM – 10:00 PM',
    TRUE
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Spice Hub',
    'Food Street, Block B, VIT-AP Campus',
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format',
    4.3,
    '15–20 min',
    '8:00 AM – 9:00 PM',
    TRUE
  );

-- ─── MENU ITEMS: Pizza Stall ───────────────────────────────

INSERT INTO public.menu_items (outlet_id, name, description, price, image_url, category, is_veg, is_available)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Margherita Pizza',
    'Classic tomato base with fresh mozzarella and basil, baked in our stone oven.',
    149.00,
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format',
    'Pizza',
    TRUE,
    TRUE
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Paneer Tikka Pizza',
    'Tandoor-marinated paneer on a spiced tomato base with bell peppers and onions.',
    179.00,
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&auto=format',
    'Pizza',
    TRUE,
    TRUE
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Chicken BBQ Pizza',
    'Smoky BBQ chicken, caramelised onions, and cheddar on a crispy thin crust.',
    199.00,
    'https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?w=400&auto=format',
    'Pizza',
    FALSE,
    TRUE
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Garlic Bread (4 pcs)',
    'Toasted baguette slices with herb butter and a side of marinara dip.',
    59.00,
    'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&auto=format',
    'Sides',
    TRUE,
    TRUE
  );

-- ─── MENU ITEMS: Spice Hub ────────────────────────────────

INSERT INTO public.menu_items (outlet_id, name, description, price, image_url, category, is_veg, is_available)
VALUES
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Dal Tadka + Rice',
    'Slow-cooked yellow lentils tempered with cumin, garlic and dried chilli. Served with steamed basmati.',
    89.00,
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format',
    'Thali',
    TRUE,
    TRUE
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Chicken Biryani',
    'Aromatic long-grain basmati cooked dum-style with tender chicken and whole spices.',
    149.00,
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format',
    'Biryani',
    FALSE,
    TRUE
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Veg Fried Rice',
    'Wok-tossed basmati with seasonal vegetables, soy sauce, and spring onions.',
    79.00,
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format',
    'Rice',
    TRUE,
    TRUE
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Masala Chai',
    'Freshly brewed ginger-cardamom-cinnamon tea with full-cream milk. Campus fuel.',
    25.00,
    'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&auto=format',
    'Beverages',
    TRUE,
    TRUE
  );
