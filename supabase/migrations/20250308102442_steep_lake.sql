/*
  # Storage and RLS Policies

  1. Storage Policies
    - Create storage buckets for listing images and avatars
    - Add policies for authenticated users to upload/read images
  
  2. Security
    - Enable RLS on storage buckets
    - Add policies for public read access
    - Add policies for authenticated user uploads
*/

-- Create storage buckets if they don't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES 
    ('listing-images', 'listing-images', true),
    ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  -- Drop listing-images policies if they exist
  DROP POLICY IF EXISTS "Public can view listing images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
  
  -- Drop avatars policies if they exist
  DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
  
  -- Drop listings policies if they exist
  DROP POLICY IF EXISTS "Anyone can view listings" ON listings;
  DROP POLICY IF EXISTS "Authenticated users can create listings" ON listings;
  DROP POLICY IF EXISTS "Sellers can update their own listings" ON listings;
  
  -- Drop bids policies if they exist
  DROP POLICY IF EXISTS "Anyone can view bids" ON bids;
  DROP POLICY IF EXISTS "Authenticated users can create bids" ON bids;
  
  -- Drop profiles policies if they exist
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
END $$;

-- Storage policies for listing-images
CREATE POLICY "Public can view listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-images' AND
    auth.role() = 'authenticated'
  );

-- Storage policies for avatars
CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Ensure RLS is enabled on listings table
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Update listings policies
CREATE POLICY "Anyone can view listings"
  ON listings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create listings"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own listings"
  ON listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Ensure RLS is enabled on bids table
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Update bids policies
CREATE POLICY "Anyone can view bids"
  ON bids FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create bids"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = bidder_id);

-- Ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create trigger function to update listing current_bid
CREATE OR REPLACE FUNCTION update_listing_current_bid()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE listings
  SET current_bid = NEW.amount
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update listing current_bid when new bid is placed
DROP TRIGGER IF EXISTS update_listing_bid ON bids;
CREATE TRIGGER update_listing_bid
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_current_bid();