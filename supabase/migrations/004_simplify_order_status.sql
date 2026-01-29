-- Simplify order status: replace ready_at and picked_up_at with single completed_at
-- Migrate existing data: if picked_up_at exists, use it as completed_at; otherwise use ready_at

ALTER TABLE orders ADD COLUMN completed_at TIMESTAMPTZ;

-- Migrate existing data
UPDATE orders SET completed_at = COALESCE(picked_up_at, ready_at);

-- Drop the old columns
ALTER TABLE orders DROP COLUMN ready_at;
ALTER TABLE orders DROP COLUMN picked_up_at;
