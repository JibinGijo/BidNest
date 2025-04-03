import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, XCircle, Search, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Listing } from '../types/database';

interface ListingWithSeller extends Listing {
  profiles?: {
    username: string | null;
  } | null;
}

export function ProductManagement() {
  const [listings, setListings] = useState<ListingWithSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchListings();

    // Subscribe to real-time changes
    const listingsSubscription = supabase
      .channel('listings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      listingsSubscription.unsubscribe();
    };
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles!listings_seller_id_fkey(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleEndListing = async (listingId: string) => {
    try {
      setLoading(true);
      
      // Get the highest bid for this listing
      const { data: highestBid } = await supabase
        .from('bids')
        .select('bidder_id')
        .eq('listing_id', listingId)
        .order('amount', { ascending: false })
        .limit(1)
        .single();

      // Update the listing status and winner
      const { error: updateError } = await supabase
        .from('listings')
        .update({ 
          status: 'ended',
          winner_id: highestBid?.bidder_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', listingId);

      if (updateError) throw updateError;

      setShowEndConfirm(null);
      await fetchListings();
    } catch (err) {
      console.error('Error ending listing:', err);
      setError('Failed to end listing');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      setIsDeleting(true);
      setError(null);

      // First, delete all bids associated with this listing
      const { error: bidsError } = await supabase
        .from('bids')
        .delete()
        .eq('listing_id', listingId);

      if (bidsError) throw bidsError;

      // Then delete the listing
      const { error: deleteError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (deleteError) throw deleteError;

      // Update local state
      setListings(prevListings => prevListings.filter(listing => listing.id !== listingId));
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting listing:', err);
      setError('Failed to delete listing. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && listings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
          <button
            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center p-4 text-sm text-red-800 rounded-lg bg-red-50">
            <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search listings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md pl-10"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <div className="border-t border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Starting Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Bid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {listings
                  .filter(listing =>
                    listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    listing.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((listing) => (
                    <tr key={listing.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{listing.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {listing.profiles?.username || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${listing.starting_price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${listing.current_bid || listing.starting_price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          listing.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {listing.status === 'active' && (
                          <button
                            onClick={() => setShowEndConfirm(listing.id)}
                            className="text-red-600 hover:text-red-900 mr-3"
                            title="End auction"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => setShowDeleteConfirm(listing.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete listing"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* End Auction Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">End Auction</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to end this auction? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowEndConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => showEndConfirm && handleEndListing(showEndConfirm)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {loading ? 'Ending...' : 'End Auction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Listing</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this listing? This will also delete all associated bids. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => showDeleteConfirm && handleDeleteListing(showDeleteConfirm)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 flex items-center"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete Listing'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}