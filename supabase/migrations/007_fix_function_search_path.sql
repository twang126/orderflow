-- Fix security warning: set immutable search_path for function
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
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;
