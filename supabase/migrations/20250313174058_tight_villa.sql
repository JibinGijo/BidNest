/*
  # Fix winner relationship between listings and profiles

  1. Changes
    - Add foreign key constraint from listings.winner_id to profiles.id
    - Add ON DELETE SET NULL behavior for winner_id references

  2. Security
    - No changes to RLS policies
*/

-- Add foreign key constraint for winner_id
ALTER TABLE listings
DROP CONSTRAINT IF EXISTS listings_winner_id_fkey;

ALTER TABLE listings
ADD CONSTRAINT listings_winner_id_fkey 
  FOREIGN KEY (winner_id) 
  REFERENCES profiles(id)
  ON DELETE SET NULL;