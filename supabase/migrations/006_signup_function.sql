-- Create a function for shop creation during signup
-- This function runs with SECURITY DEFINER to bypass RLS during signup

CREATE OR REPLACE FUNCTION create_shop_for_signup(shop_name TEXT)
RETURNS TABLE(shop_id UUID, menu_id UUID)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_shop_id UUID;
  new_menu_id UUID;
BEGIN
  -- Create the shop
  INSERT INTO shops (name)
  VALUES (shop_name)
  RETURNING id INTO new_shop_id;

  -- Create default menu
  INSERT INTO menus (shop_id, name, is_default)
  VALUES (new_shop_id, 'Default Menu', true)
  RETURNING id INTO new_menu_id;

  -- Update shop with default menu
  UPDATE shops
  SET default_menu_id = new_menu_id
  WHERE id = new_shop_id;

  RETURN QUERY SELECT new_shop_id, new_menu_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to anon role (for signup)
GRANT EXECUTE ON FUNCTION create_shop_for_signup(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_shop_for_signup(TEXT) TO authenticated;
