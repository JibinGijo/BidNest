/*
  # Add foreign key relationship between listings and profiles

  1. Changes
    - Add foreign key constraint from listings.seller_id to profiles.id
    - Update existing listings table structure
    - Add indexes for better query performance

  2. Security
    - Maintain existing RLS policies
*/

-- Add foreign key constraint
ALTER TABLE listings
DROP CONSTRAINT IF EXISTS listings_seller_id_fkey,
ADD CONSTRAINT listings_seller_id_fkey 
  FOREIGN KEY (seller_id) 
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Add index for seller_id
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id);