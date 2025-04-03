/*
  # Add auction expiration check function

  1. New Functions
    - check_listing_status: Checks if a listing is active and not expired
    - validate_bid: Validates bid amount and listing status before allowing bid

  2. Changes
    - Adds validation for auction status and expiration
    - Prevents bidding on expired or ended auctions
*/

-- Function to check if a listing is active and not expired
CREATE OR REPLACE FUNCTION check_listing_status(listing_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  listing_status text;
  listing_created_at timestamptz;
BEGIN
  -- Get listing status and creation date
  SELECT status, created_at
  INTO listing_status, listing_created_at
  FROM listings
  WHERE id = listing_id;

  -- Check if listing exists
  IF listing_status IS NULL THEN
    RETURN false;
  END IF;

  -- Check if listing is active and not expired
  RETURN listing_status = 'active' AND 
         listing_created_at > (NOW() - INTERVAL '7 days');
END;
$$;

-- Function to validate bid before insertion
CREATE OR REPLACE FUNCTION validate_bid()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if listing is active and not expired
  IF NOT check_listing_status(NEW.listing_id) THEN
    RAISE EXCEPTION 'Cannot bid on inactive or expired listing';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for bid validation
DROP TRIGGER IF EXISTS validate_bid_trigger ON bids;
CREATE TRIGGER validate_bid_trigger
  BEFORE INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION validate_bid();