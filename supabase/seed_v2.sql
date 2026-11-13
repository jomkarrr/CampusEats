-- ============================================================
--  Campus Eats — Seed V2 (Idempotent Production Dataset)
--  File: supabase/seed_v2.sql
--  Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. OUTLETS (5 Outlets across Campus) ───────────────────

INSERT INTO public.outlets (id, name, location, image_url, rating, eta_text, open_hours, is_open)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Pizza Stall',
    'Food Street, Block A, VIT-AP Campus',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop',
    4.6,
    '15–20 min',
    '10:00 AM – 11:00 PM',
    TRUE
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Spice Hub',
    'Food Street, Block B, VIT-AP Campus',
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop',
    4.5,
    '15–25 min',
    '11:00 AM – 10:30 PM',
    TRUE
  ),
  (
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Burger Barn',
    'Food Street, Block C, VIT-AP Campus',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop',
    4.4,
    '10–15 min',
    '11:00 AM – 11:00 PM',
    TRUE
  ),
  (
    'd4e5f6a7-b8c9-0123-def1-234567890123',
    'Dosa Junction',
    'Food Street, Block D, VIT-AP Campus',
    'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop',
    4.7,
    '10–15 min',
    '7:30 AM – 10:00 PM',
    TRUE
  ),
  (
    'e5f6a7b8-c9d0-1234-ef12-345678901234',
    'Fresh Juice & Shakes',
    'Near Main Gate, VIT-AP Campus',
    'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&auto=format&fit=crop',
    4.8,
    '5–10 min',
    '8:00 AM – 10:00 PM',
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  image_url = EXCLUDED.image_url,
  rating = EXCLUDED.rating,
  eta_text = EXCLUDED.eta_text,
  open_hours = EXCLUDED.open_hours,
  is_open = EXCLUDED.is_open;


-- ─── 2. MENU ITEMS: Pizza Stall (Block A) ───────────────────

INSERT INTO public.menu_items (id, outlet_id, name, description, price, image_url, category, is_veg, is_available)
VALUES
  (
    '11111111-1111-1111-1111-000000000001',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Margherita Pizza',
    'Classic tomato base with mozzarella cheese and fresh basil.',
    149.00,
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop',
    'Classic Pizza',
    TRUE,
    TRUE
  ),
  (
    '11111111-1111-1111-1111-000000000002',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Paneer Tikka Pizza',
    'Spiced tandoori paneer, crisp capsicum, onions, and chipotle drizzle.',
    189.00,
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&auto=format&fit=crop',
    'Gourmet Pizza',
    TRUE,
    TRUE
  ),
  (
    '11111111-1111-1111-1111-000000000003',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Farmhouse Veggie Pizza',
    'Loaded with sweet corn, mushrooms, olives, bell peppers, and jalapeños.',
    179.00,
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop',
    'Classic Pizza',
    TRUE,
    TRUE
  ),
  (
    '11111111-1111-1111-1111-000000000004',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Chicken BBQ Pizza',
    'Smoky barbecue chicken, red onions, and mozzarella on golden crust.',
    219.00,
    'https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?w=600&auto=format&fit=crop',
    'Gourmet Pizza',
    FALSE,
    TRUE
  ),
  (
    '11111111-1111-1111-1111-000000000005',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Spicy Peri-Peri Chicken Pizza',
    'Fiery shredded peri-peri chicken chunks with paprika and cheese.',
    229.00,
    'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&auto=format&fit=crop',
    'Gourmet Pizza',
    FALSE,
    TRUE
  ),
  (
    '11111111-1111-1111-1111-000000000006',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Cheesy Garlic Bread',
    'Four pieces of oven-baked baguette topped with herb butter and melted mozzarella.',
    89.00,
    'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=600&auto=format&fit=crop',
    'Sides',
    TRUE,
    TRUE
  ),
  (
    '11111111-1111-1111-1111-000000000007',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Stuffed Paneer Calzone',
    'Folded golden crust stuffed with marinated cottage cheese, herbs, and cheese.',
    129.00,
    'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=600&auto=format&fit=crop',
    'Sides',
    TRUE,
    TRUE
  ),
  (
    '11111111-1111-1111-1111-000000000008',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Choco Lava Cake',
    'Warm molten dark chocolate cake with gooey center.',
    79.00,
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop',
    'Desserts',
    TRUE,
    TRUE
  ),
  (
    '11111111-1111-1111-1111-000000000009',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Cold Soft Drink Can (300ml)',
    'Chilled fizzy soda can of your choice.',
    40.00,
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop',
    'Beverages',
    TRUE,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  outlet_id = EXCLUDED.outlet_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  category = EXCLUDED.category,
  is_veg = EXCLUDED.is_veg,
  is_available = EXCLUDED.is_available;


-- ─── 3. MENU ITEMS: Spice Hub (Block B) ─────────────────────

INSERT INTO public.menu_items (id, outlet_id, name, description, price, image_url, category, is_veg, is_available)
VALUES
  (
    '22222222-2222-2222-2222-000000000001',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Special Hyderabadi Chicken Dum Biryani',
    'Fragrant basmati rice dum-cooked with spiced chicken, mint, and fried onions. Served with raita.',
    179.00,
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop',
    'Biryani',
    FALSE,
    TRUE
  ),
  (
    '22222222-2222-2222-2222-000000000002',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Paneer Makhani Biryani',
    'Soft paneer cubes simmered in spiced makhani gravy layered with saffron basmati rice.',
    159.00,
    'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop',
    'Biryani',
    TRUE,
    TRUE
  ),
  (
    '22222222-2222-2222-2222-000000000003',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Butter Chicken + 2 Butter Naan',
    'Tender tandoori chicken pieces in creamy tomato butter gravy with 2 fluffy naan breads.',
    219.00,
    'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop',
    'Curries & Breads',
    FALSE,
    TRUE
  ),
  (
    '22222222-2222-2222-2222-000000000004',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Paneer Butter Masala + 2 Roti',
    'Rich and creamy cottage cheese curry paired with whole wheat tandoori rotis.',
    169.00,
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop',
    'Curries & Breads',
    TRUE,
    TRUE
  ),
  (
    '22222222-2222-2222-2222-000000000005',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Dal Makhani Rice Bowl',
    'Slow-cooked black lentils tempered with butter and cream, served on steamed jeera rice.',
    119.00,
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop',
    'Thali & Bowls',
    TRUE,
    TRUE
  ),
  (
    '22222222-2222-2222-2222-000000000006',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Deluxe Student Veg Thali',
    'Paneer curry, Dal Tadka, Seasonal Sabzi, 3 Rotis, Rice, Salad, and Gulab Jamun.',
    149.00,
    'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop',
    'Thali & Bowls',
    TRUE,
    TRUE
  ),
  (
    '22222222-2222-2222-2222-000000000007',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Crispy Chicken 65',
    'South Indian style spicy deep-fried chicken tossed with curry leaves and green chillies.',
    139.00,
    'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=600&auto=format&fit=crop',
    'Starters',
    FALSE,
    TRUE
  ),
  (
    '22222222-2222-2222-2222-000000000008',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Paneer Tikka Roll',
    'Flaky paratha rolled with chargrilled spicy paneer cubes, onions, and mint chutney.',
    99.00,
    'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop',
    'Rolls',
    TRUE,
    TRUE
  ),
  (
    '22222222-2222-2222-2222-000000000009',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Gulab Jamun (2 Pcs)',
    'Warm, melt-in-mouth milk dumplings soaked in cardamom sugar syrup.',
    49.00,
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
    'Desserts',
    TRUE,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  outlet_id = EXCLUDED.outlet_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  category = EXCLUDED.category,
  is_veg = EXCLUDED.is_veg,
  is_available = EXCLUDED.is_available;


-- ─── 4. MENU ITEMS: Burger Barn (Block C) ───────────────────

INSERT INTO public.menu_items (id, outlet_id, name, description, price, image_url, category, is_veg, is_available)
VALUES
  (
    '33333333-3333-3333-3333-000000000001',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Classic Crispy Veg Burger',
    'Crispy vegetable patty with fresh lettuce, sliced tomatoes, and creamy eggless mayo.',
    79.00,
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop',
    'Burgers',
    TRUE,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-000000000002',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Spicy Paneer Crunch Burger',
    'Thick crumb-fried spiced cottage cheese steak with spicy jalapeño sauce and cheese.',
    129.00,
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop',
    'Burgers',
    TRUE,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-000000000003',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Crispy Fried Chicken Burger',
    'Golden-crusted chicken fillet with crunchy iceberg lettuce, pickles, and garlic aioli.',
    149.00,
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop',
    'Burgers',
    FALSE,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-000000000004',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Double Cheese Smash Burger',
    'Two succulent grilled chicken patties stacked with double melted cheddar and smoky relish.',
    199.00,
    'https://images.unsplash.com/photo-1583032015879-6644f1c9bb73?w=600&auto=format&fit=crop',
    'Burgers',
    FALSE,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-000000000005',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Peri-Peri French Fries',
    'Crispy golden potato fries generously tossed in zesty peri-peri seasoning.',
    69.00,
    'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop',
    'Sides',
    TRUE,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-000000000006',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Loaded Cheesy Fries',
    'Fries smothered with warm liquid cheddar cheese sauce and jalapeño bits.',
    99.00,
    'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600&auto=format&fit=crop',
    'Sides',
    TRUE,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-000000000007',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Crispy Chicken Popcorn',
    'Bite-sized tender seasoned chicken poppers served with honey mustard dip.',
    109.00,
    'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop',
    'Sides',
    FALSE,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-000000000008',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Belgian Chocolate Shake',
    'Thick blended milkshake prepared with rich Belgian chocolate fudge and vanilla ice cream.',
    99.00,
    'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop',
    'Beverages',
    TRUE,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-000000000009',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Veg Burger + Fries + Coke Combo',
    'Crispy Veg Burger, regular salted fries, and a chilled soft drink can.',
    169.00,
    'https://images.unsplash.com/photo-1610440042657-612c34d95e9f?w=600&auto=format&fit=crop',
    'Combos',
    TRUE,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  outlet_id = EXCLUDED.outlet_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  category = EXCLUDED.category,
  is_veg = EXCLUDED.is_veg,
  is_available = EXCLUDED.is_available;


-- ─── 5. MENU ITEMS: Dosa Junction (Block D) ─────────────────

INSERT INTO public.menu_items (id, outlet_id, name, description, price, image_url, category, is_veg, is_available)
VALUES
  (
    '44444444-4444-4444-4444-000000000001',
    'd4e5f6a7-b8c9-0123-def1-234567890123',
    'Crispy Plain Dosa',
    'Golden-brown fermented rice-lentil crepe served with sambar and two fresh chutneys.',
    60.00,
    'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop',
    'Tiffin Classics',
    TRUE,
    TRUE
  ),
  (
    '44444444-4444-4444-4444-000000000002',
    'd4e5f6a7-b8c9-0123-def1-234567890123',
    'Mysore Masala Dosa',
    'Crisp dosa spread with spicy red garlic chutney and stuffed with seasoned potato mash.',
    89.00,
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
    'Tiffin Classics',
    TRUE,
    TRUE
  ),
  (
    '44444444-4444-4444-4444-000000000003',
    'd4e5f6a7-b8c9-0123-def1-234567890123',
    'Ghee Roast Paneer Dosa',
    'Crisp crepe roasted in pure desi ghee, stuffed with seasoned grated cottage cheese.',
    119.00,
    'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop',
    'Special Dosas',
    TRUE,
    TRUE
  ),
  (
    '44444444-4444-4444-4444-000000000004',
    'd4e5f6a7-b8c9-0123-def1-234567890123',
    'Steamed Idli Sambar (3 Pcs)',
    'Fluffy steamed fermented rice cakes served piping hot with vegetable sambar and coconut chutney.',
    50.00,
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
    'Tiffin Classics',
    TRUE,
    TRUE
  ),
  (
    '44444444-4444-4444-4444-000000000005',
    'd4e5f6a7-b8c9-0123-def1-234567890123',
    'Crispy Medu Vada (2 Pcs)',
    'Savory, crispy fried black gram flour doughnuts with peppercorns and curry leaves.',
    55.00,
    'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop',
    'Tiffin Classics',
    TRUE,
    TRUE
  ),
  (
    '44444444-4444-4444-4444-000000000006',
    'd4e5f6a7-b8c9-0123-def1-234567890123',
    'Onion & Tomato Uttapam',
    'Thick soft pancake topped with crunchy chopped red onions, tomatoes, and green coriander.',
    85.00,
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
    'Uttapam',
    TRUE,
    TRUE
  ),
  (
    '44444444-4444-4444-4444-000000000007',
    'd4e5f6a7-b8c9-0123-def1-234567890123',
    'Cheese Corn Masala Dosa',
    'Loaded with melted cheese, sweet yellow corn, and savory potato masala.',
    129.00,
    'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop',
    'Special Dosas',
    TRUE,
    TRUE
  ),
  (
    '44444444-4444-4444-4444-000000000008',
    'd4e5f6a7-b8c9-0123-def1-234567890123',
    'Authentic South Indian Filter Coffee',
    'Frothy, aromatic chicory coffee brewed fresh in traditional brass filter.',
    30.00,
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop',
    'Beverages',
    TRUE,
    TRUE
  ),
  (
    '44444444-4444-4444-4444-000000000009',
    'd4e5f6a7-b8c9-0123-def1-234567890123',
    'Idli + Vada Combo',
    'Two steamed idlis and one crispy medu vada served with sambar and coconut dip.',
    75.00,
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop',
    'Tiffin Classics',
    TRUE,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  outlet_id = EXCLUDED.outlet_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  category = EXCLUDED.category,
  is_veg = EXCLUDED.is_veg,
  is_available = EXCLUDED.is_available;


-- ─── 6. MENU ITEMS: Fresh Juice & Shakes (Near Main Gate) ────

INSERT INTO public.menu_items (id, outlet_id, name, description, price, image_url, category, is_veg, is_available)
VALUES
  (
    '55555555-5555-5555-5555-000000000001',
    'e5f6a7b8-c9d0-1234-ef12-345678901234',
    'Fresh Watermelon Juice',
    'Cold-pressed naturally sweet watermelon juice served with fresh mint sprig and ice.',
    50.00,
    'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600&auto=format&fit=crop',
    'Fresh Juices',
    TRUE,
    TRUE
  ),
  (
    '55555555-5555-5555-5555-000000000002',
    'e5f6a7b8-c9d0-1234-ef12-345678901234',
    'Sweet Lime (Mosambi) Juice',
    'Pure freshly squeezed mosambi juice with a pinch of rock salt and chaat masala.',
    60.00,
    'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop',
    'Fresh Juices',
    TRUE,
    TRUE
  ),
  (
    '55555555-5555-5555-5555-000000000003',
    'e5f6a7b8-c9d0-1234-ef12-345678901234',
    'Alphonso Mango Milkshake',
    'Thick rich milkshake blended with real Alphonso mango pulp and dairy cream.',
    89.00,
    'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop',
    'Thick Shakes',
    TRUE,
    TRUE
  ),
  (
    '55555555-5555-5555-5555-000000000004',
    'e5f6a7b8-c9d0-1234-ef12-345678901234',
    'Oreo Mudslide Thick Shake',
    'Crunchy crushed Oreo cookies whipped with vanilla ice cream and dark chocolate drizzle.',
    99.00,
    'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop',
    'Thick Shakes',
    TRUE,
    TRUE
  ),
  (
    '55555555-5555-5555-5555-000000000005',
    'e5f6a7b8-c9d0-1234-ef12-345678901234',
    'Nutella Brownie Shake',
    'Decadent chocolate hazelnut Nutella shake topped with walnut brownie crumble.',
    119.00,
    'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop',
    'Thick Shakes',
    TRUE,
    TRUE
  ),
  (
    '55555555-5555-5555-5555-000000000006',
    'e5f6a7b8-c9d0-1234-ef12-345678901234',
    'Strawberry Banana Smoothie Bowl',
    'Thick blended frozen strawberry and banana base topped with chia seeds, granola, and honey.',
    129.00,
    'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop',
    'Smoothies & Bowls',
    TRUE,
    TRUE
  ),
  (
    '55555555-5555-5555-5555-000000000007',
    'e5f6a7b8-c9d0-1234-ef12-345678901234',
    'Chilled Cold Coffee with Ice Cream',
    'Brewed espresso blended with chilled milk and topped with rich vanilla scoop.',
    79.00,
    'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop',
    'Beverages',
    TRUE,
    TRUE
  ),
  (
    '55555555-5555-5555-5555-000000000008',
    'e5f6a7b8-c9d0-1234-ef12-345678901234',
    'Fresh Fruit Salad Bowl',
    'Assorted seasonal fruits (apple, papaya, watermelon, pomegranate) tossed with mint and honey-lime.',
    80.00,
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop',
    'Smoothies & Bowls',
    TRUE,
    TRUE
  ),
  (
    '55555555-5555-5555-5555-000000000009',
    'e5f6a7b8-c9d0-1234-ef12-345678901234',
    'Lemon Mint Cooler',
    'Zesty fresh lemon juice, crushed ice, mint leaves, and a dash of black salt.',
    40.00,
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop',
    'Fresh Juices',
    TRUE,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  outlet_id = EXCLUDED.outlet_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  category = EXCLUDED.category,
  is_veg = EXCLUDED.is_veg,
  is_available = EXCLUDED.is_available;

