-- Create a function to create an order in a single database call
-- This reduces network round trips from 3+ to 1

CREATE OR REPLACE FUNCTION create_order(
  p_event_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_items JSONB  -- Array of {item_id, modifications}
)
RETURNS JSONB
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
  v_order_number INTEGER;
  v_item JSONB;
BEGIN
  -- Create customer
  INSERT INTO customers (name, phone)
  VALUES (p_customer_name, NULLIF(p_customer_phone, ''))
  RETURNING id INTO v_customer_id;

  -- Get next order number
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO v_order_number
  FROM orders
  WHERE event_id = p_event_id;

  -- Create order
  INSERT INTO orders (event_id, customer_id, order_number)
  VALUES (p_event_id, v_customer_id, v_order_number)
  RETURNING id INTO v_order_id;

  -- Create order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (order_id, item_id, modifications)
    VALUES (
      v_order_id,
      (v_item->>'item_id')::UUID,
      NULLIF(v_item->>'modifications', '')
    );
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'customer_id', v_customer_id
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_order(UUID, TEXT, TEXT, JSONB) TO authenticated;
