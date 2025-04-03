/*
  # Add trigger for updating listing current bid

  1. Changes
    - Creates a trigger function to update listing's current bid
    - Adds trigger to automatically update listing when new bid is placed
    - Ensures data consistency between bids and listings tables

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Create trigger function to update listing current bid
CREATE OR REPLACE FUNCTION update_listing_current_bid()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the listing's current bid with the new bid amount
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