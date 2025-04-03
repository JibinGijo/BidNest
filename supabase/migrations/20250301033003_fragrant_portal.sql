/*
  # Add bid functionality

  1. Updates
    - Add public policy for viewing listings without authentication
    - Add public policy for viewing bids without authentication
    - Add trigger to update listing current_bid when a new bid is placed

  2. Security
    - Ensure proper RLS policies for bids
*/

-- Add public policies for viewing listings and bids without authentication
CREATE POLICY "Anyone can view listings without authentication"
  ON listings
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view bids without authentication"
  ON bids
  FOR SELECT
  USING (true);

-- Create function to update listing current_bid when a new bid is placed
CREATE OR REPLACE FUNCTION update_listing_current_bid()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the listing's current_bid with the new bid amount
  UPDATE listings
  SET current_bid = NEW.amount, updated_at = NOW()
  WHERE id = NEW.listing_id AND (current_bid IS NULL OR current_bid < NEW.amount);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update listing current_bid
DROP TRIGGER IF EXISTS update_listing_bid ON bids;
CREATE TRIGGER update_listing_bid
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_current_bid();