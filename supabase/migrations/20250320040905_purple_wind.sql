/*
  # Fix storage bucket policies

  1. Changes
    - Drop existing storage policies
    - Create new storage policies with proper permissions
    - Fix RLS for authenticated users uploading files
*/

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload listing images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their listing images" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view listing images" ON storage.objects;
END $$;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Public can view listing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

CREATE POLICY "Users can upload listing images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'listing-images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their listing images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'listing-images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their listing images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'listing-images' AND
  auth.role() = 'authenticated'
);