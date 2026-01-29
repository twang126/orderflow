-- Seed data for OrderFlow local development

-- Create a demo user (email: demo@example.com, password: password123)
-- This uses Supabase's auth.users table
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'demo@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"shop_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "shop_name": "Demo Coffee Shop"}'::jsonb,
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create identity for the demo user
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'demo@example.com',
  '{"sub": "a0000000-0000-0000-0000-000000000001", "email": "demo@example.com"}'::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW()
);

-- Create a demo shop
INSERT INTO shops (id, name) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Demo Coffee Shop');

-- Create a default menu
INSERT INTO menus (id, shop_id, name, is_default) VALUES
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Main Menu', true);

-- Link the default menu to the shop
UPDATE shops SET default_menu_id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Create menu items with colors
INSERT INTO items (id, menu_id, name, code, price, color) VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Espresso', 'E', 3.50, '#ef4444'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Americano', 'A', 4.00, '#f97316'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Latte', 'L', 5.00, '#eab308'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Cappuccino', 'C', 5.00, '#22c55e'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Mocha', 'M', 5.50, '#14b8a6'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Cold Brew', 'CB', 4.50, '#3b82f6'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Iced Tea', 'IT', 3.50, '#8b5cf6'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a08', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Hot Chocolate', 'HC', 4.00, '#ec4899');

-- Create an active event for today
INSERT INTO events (id, shop_id, name, date, menu_id, status) VALUES
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Today''s Service', CURRENT_DATE, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'in_progress');

-- Create some sample customers
INSERT INTO customers (id, name, phone) VALUES
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'John Doe', '555-0101'),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'Jane Smith', '555-0102'),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'Bob Wilson', NULL);

-- Create sample orders
INSERT INTO orders (id, event_id, customer_id, order_number, created_at) VALUES
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 1, NOW() - INTERVAL '30 minutes'),
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 2, NOW() - INTERVAL '20 minutes'),
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 3, NOW() - INTERVAL '10 minutes');

-- Create order items
INSERT INTO order_items (order_id, item_id, modifications) VALUES
  -- Order 1: Latte + Espresso
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'extra shot'),
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', NULL),
  -- Order 2: Cappuccino + Mocha
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'oat milk'),
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'no whip'),
  -- Order 3: Cold Brew + Iced Tea
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'light ice'),
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', NULL);

-- Mark first order as completed (to show different states)
UPDATE orders SET completed_at = NOW() - INTERVAL '5 minutes'
WHERE id = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
