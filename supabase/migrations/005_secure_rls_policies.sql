-- Secure RLS policies: Only authenticated users can access data
-- This replaces the insecure "USING (true)" policies

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON shops;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON menus;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON items;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON events;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON customers;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON orders;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON order_items;

-- Create secure policies that require authentication
-- auth.role() = 'authenticated' ensures only logged-in users can access

CREATE POLICY "Authenticated users can view shops" ON shops
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage shops" ON shops
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view menus" ON menus
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage menus" ON menus
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view items" ON items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage items" ON items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view events" ON events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage events" ON events
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view customers" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage customers" ON customers
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view orders" ON orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage orders" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view order_items" ON order_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage order_items" ON order_items
  FOR ALL USING (auth.role() = 'authenticated');
