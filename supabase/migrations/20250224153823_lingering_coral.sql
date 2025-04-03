/*
  # Create storage buckets for listings and avatars

  1. Changes
    - Create public storage buckets for listing images and avatars
    - Set up storage policies for authenticated users
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('listing-images', 'listing-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for listing-images
CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'listing-images' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);

CREATE POLICY "Authenticated users can update their listing images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'listing-images' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);

CREATE POLICY "Anyone can view listing images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'listing-images');

-- Set up storage policies for avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);

CREATE POLICY "Authenticated users can update their avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');