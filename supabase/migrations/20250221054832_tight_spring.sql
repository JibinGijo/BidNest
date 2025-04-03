/*
  # Initial Schema Setup for BidNest

  1. New Tables
    - `profiles`
      - User profile information including name, address, phone, etc.
    - `listings`
      - Auction listings with title, description, prices, etc.
    - `bids`
      - Bid history for each listing

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE,
  first_name text,
  last_name text,
  address text,
  phone text,
  dob date,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  starting_price decimal NOT NULL,
  current_bid decimal,
  image_url text,
  seller_id uuid REFERENCES auth.users(id) NOT NULL,
  winner_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bids table
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) NOT NULL,
  bidder_id uuid REFERENCES auth.users(id) NOT NULL,
  amount decimal NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Listings policies
CREATE POLICY "Anyone can view listings"
  ON listings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create listings"
  ON listings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own listings"
  ON listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Bids policies
CREATE POLICY "Anyone can view bids"
  ON bids
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create bids"
  ON bids
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = bidder_id);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();