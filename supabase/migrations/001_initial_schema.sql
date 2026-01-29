-- Enable UUID extension (use schema-qualified or gen_random_uuid for Supabase compatibility)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Shops table (accounts)
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  default_menu_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menus table
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for default_menu_id after menus table exists
ALTER TABLE shops
ADD CONSTRAINT fk_default_menu
FOREIGN KEY (default_menu_id) REFERENCES menus(id) ON DELETE SET NULL;

-- Menu Items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (days the shop is open)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ
);

-- Order Items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  modifications TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_events_shop_id ON events(shop_id);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_items_menu_id ON items(menu_id);

-- Enable Row Level Security
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to access their shop's data
-- For now, we'll use a simple policy that allows all authenticated access
-- In production, you'd want to link users to shops via auth.uid()

CREATE POLICY "Allow all for authenticated users" ON shops
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON menus
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON items
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON events
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON customers
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON orders
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON order_items
  FOR ALL USING (true);

-- Enable realtime for orders table (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- Function to get the next order number for an event
CREATE OR REPLACE FUNCTION get_next_order_number(p_event_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO next_number
  FROM orders
  WHERE event_id = p_event_id;

  RETURN next_number;
END;
$$ LANGUAGE plpgsql;
