/*
  # Add auction expiration functionality

  1. Changes
    - Add function to check and update expired auctions
    - Add trigger to automatically end auctions after 7 days
    - Add function to handle manual auction ending

  2. Security
    - Maintains existing RLS policies
*/

-- Function to check if an auction has expired
CREATE OR REPLACE FUNCTION is_auction_expired(created_at timestamptz)
RETURNS boolean AS $$
BEGIN
  RETURN EXTRACT(EPOCH FROM (NOW() - created_at)) > 7 * 24 * 60 * 60;
END;
$$ LANGUAGE plpgsql;

-- Function to end auction and set winner
CREATE OR REPLACE FUNCTION end_auction(listing_id uuid)
RETURNS void AS $$
DECLARE
  highest_bidder uuid;
BEGIN
  -- Get the highest bidder
  SELECT bidder_id INTO highest_bidder
  FROM bids
  WHERE listing_id = end_auction.listing_id
  ORDER BY amount DESC
  LIMIT 1;

  -- Update the listing
  UPDATE listings
  SET 
    status = 'ended',
    winner_id = highest_bidder,
    updated_at = NOW()
  WHERE id = end_auction.listing_id;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically check and end expired auctions
CREATE OR REPLACE FUNCTION check_expired_auctions()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    IF is_auction_expired(NEW.created_at) AND NEW.status = 'active' THEN
      PERFORM end_auction(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check for expired auctions
DROP TRIGGER IF EXISTS check_auction_expiration ON listings;
CREATE TRIGGER check_auction_expiration
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION check_expired_auctions();
