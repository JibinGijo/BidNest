import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Listing } from '../types/database';

export function YourListings() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchListings() {
      if (!currentUser) return;

      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('seller_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setListings(data || []);
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError('Failed to load your listings');
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Listings</h1>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              onClick={() => navigate(`/your-listings/${listing.id}`)}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform hover:scale-105"
            >
              {listing.image_url && (
                <img
                  src={listing.image_url}
                  alt={listing.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center text-indigo-600">
                    <DollarSign className="h-5 w-5 mr-1" />
                    <span className="font-semibold">
                      ${listing.current_bid || listing.starting_price}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      listing.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {listings.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">You haven't created any listings yet.</p>
              <button
                onClick={() => navigate('/create-listing')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Your First Listing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}