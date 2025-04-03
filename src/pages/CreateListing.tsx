import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function CreateListing() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startingPrice: '',
    image: null as File | null
  });
  const [profileExists, setProfileExists] = useState(false);

  useEffect(() => {
    // Check if profile exists for the current user
    const checkProfile = async () => {
      if (!currentUser) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', currentUser.id)
          .single();
        
        if (error) {
          console.error("Error checking profile:", error);
          setProfileExists(false);
          return;
        }
        
        setProfileExists(!!data);
      } catch (err) {
        console.error("Error checking profile:", err);
        setProfileExists(false);
      }
    };
    
    checkProfile();
  }, [currentUser]);

  const createProfile = async () => {
    if (!currentUser) return false;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          username: currentUser.email?.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error("Error creating profile:", error);
        return false;
      }
      
      setProfileExists(true);
      return true;
    } catch (err) {
      console.error("Error creating profile:", err);
      return false;
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Image size must be less than 10MB');
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('You must be logged in to create a listing');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Ensure profile exists before creating listing
      if (!profileExists) {
        const profileCreated = await createProfile();
        if (!profileCreated) {
          setError('Failed to create user profile. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      // Create storage buckets if they don't exist
      try {
        await supabase.storage.createBucket('listing-images', {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        });
      } catch (bucketError) {
        // Bucket might already exist, continue
        console.log("Bucket might already exist:", bucketError);
      }

      let imageUrl = null;

      if (formData.image) {
        // Create folder path with user ID
        const fileExt = formData.image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${currentUser.id}/${fileName}`;

        // Upload image to storage
        const { error: uploadError, data } = await supabase.storage
          .from('listing-images')
          .upload(filePath, formData.image, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Create listing
      const { error: insertError } = await supabase
        .from('listings')
        .insert({
          title: formData.title,
          description: formData.description,
          starting_price: parseFloat(formData.startingPrice),
          current_bid: null,
          image_url: imageUrl,
          seller_id: currentUser.id,
          status: 'active'
        });

      if (insertError) throw insertError;

      navigate('/your-listings');
    } catch (err) {
      console.error('Error creating listing:', err);
      setError('Failed to create listing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Listing</h1>
          
          {error && (
            <div className="mb-4 flex items-center p-4 text-sm text-red-800 rounded-lg bg-red-50">
              <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                required
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="startingPrice" className="block text-sm font-medium text-gray-700">
                Starting Price ($)
              </label>
              <input
                type="number"
                id="startingPrice"
                min="0"
                step="0.01"
                required
                value={formData.startingPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, startingPrice: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Item Image</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="image" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>Upload a file</span>
                      <input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
              {formData.image && (
                <p className="mt-2 text-sm text-gray-500">
                  Selected file: {formData.image.name}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : 'Create Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}