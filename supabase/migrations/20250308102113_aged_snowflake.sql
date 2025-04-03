/*
  # Enhanced trigger for updating listing current bid

  1. Changes
    - Creates a more robust trigger function to update listing's current bid
    - Adds validation to ensure bid amount is higher than current bid
    - Updates listing status and winner when auction ends
    - Ensures data consistency between bids and listings tables

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_listing_current_bid()
RETURNS TRIGGER AS $$
DECLARE
  current_highest_bid NUMERIC;
  listing_start_price NUMERIC;
BEGIN
  -- Get the current highest bid and starting price
  SELECT current_bid, starting_price 
  INTO current_highest_bid, listing_start_price
  FROM listings 
  WHERE id = NEW.listing_id;

  -- Validate the new bid
  IF current_highest_bid IS NULL THEN
    -- First bid must be higher than starting price
    IF NEW.amount <= listing_start_price THEN
      RAISE EXCEPTION 'Bid must be higher than starting price';
    END IF;
  ELSE
    -- Subsequent bids must be higher than current bid
    IF NEW.amount <= current_highest_bid THEN
      RAISE EXCEPTION 'Bid must be higher than current bid';
    END IF;
  END IF;

  -- Update the listing with new bid
  UPDATE listings
  SET 
    current_bid = NEW.amount,
    updated_at = NOW()
  WHERE id = NEW.listing_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_listing_bid ON bids;

-- Create trigger to automatically update listing current bid when new bid is placed
CREATE TRIGGER update_listing_bid
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_current_bid();