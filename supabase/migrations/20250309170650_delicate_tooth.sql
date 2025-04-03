/*
  # Storage Bucket Policies

  1. Security
    - Enable RLS for storage buckets
    - Add policies for authenticated users to manage their own files
    - Allow public read access for listing images

  2. Changes
    - Create storage buckets if they don't exist
    - Set up RLS policies for listing-images bucket
*/

-- Create storage buckets if they don't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('listing-images', 'listing-images', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload listing images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images' AND
    (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own listing images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-images' AND
    (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own listing images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-images' AND
    (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Allow public read access to listing images
CREATE POLICY "Public read access for listing images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'listing-images');