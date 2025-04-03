/*
  # Fix bidder relationship in bids table

  1. Updates
    - Add foreign key constraint from bids.bidder_id to profiles.id
    - Add index on bidder_id for better performance

  2. Security
    - Ensure proper RLS policies for bids
*/

-- Add foreign key constraint from bids.bidder_id to profiles.id
ALTER TABLE bids
DROP CONSTRAINT IF EXISTS bids_bidder_id_fkey,
ADD CONSTRAINT bids_bidder_id_fkey 
  FOREIGN KEY (bidder_id) 
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Add index for bidder_id
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);

-- Create policy to allow users to view all bids
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'Anyone can view all bids' AND polrelid = 'bids'::regclass
  ) THEN
    CREATE POLICY "Anyone can view all bids"
      ON bids
      FOR SELECT
      USING (true);
  END IF;
END $$;