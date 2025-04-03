/*
  # Add functions for listing management

  1. New Functions
    - update_expired_listings: Updates listings older than a week to 'ended' status
    - set_winner_for_ended_listing: Sets the winner for an ended listing

  2. Changes
    - Adds automatic winner selection for ended listings
    - Handles expired listings (older than 1 week)
*/

-- Function to update expired listings and set winners
CREATE OR REPLACE FUNCTION update_expired_listings(
  seller_id_param uuid,
  week_ago_param timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update expired listings to 'ended' status
  WITH expired_listings AS (
    SELECT 
      l.id,
      (
        SELECT b.bidder_id
        FROM bids b
        WHERE b.listing_id = l.id
        ORDER BY b.amount DESC
        LIMIT 1
      ) as winner_id
    FROM listings l
    WHERE 
      l.seller_id = seller_id_param
      AND l.status = 'active'
      AND l.created_at < week_ago_param
  )
  UPDATE listings l
  SET 
    status = 'ended',
    winner_id = el.winner_id,
    updated_at = NOW()
  FROM expired_listings el
  WHERE l.id = el.id;
END;
$$;

-- Function to set winner for a manually ended listing
CREATE OR REPLACE FUNCTION set_winner_for_ended_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'ended' AND OLD.status = 'active' THEN
    -- Get the highest bidder
    SELECT bidder_id INTO NEW.winner_id
    FROM bids
    WHERE listing_id = NEW.id
    ORDER BY amount DESC
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatically setting winner
DROP TRIGGER IF EXISTS set_winner_on_end ON listings;
CREATE TRIGGER set_winner_on_end
  BEFORE UPDATE ON listings
  FOR EACH ROW
  WHEN (NEW.status = 'ended' AND OLD.status = 'active')
  EXECUTE FUNCTION set_winner_for_ended_listing();