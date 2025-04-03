import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, DollarSign, Search, Loader2, AlertCircle, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Listing } from '../types/database';

export function ProductListing() {
  const [searchTerm, setSearchTerm] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchListings() {
      try {
        // Get current timestamp and timestamp from 1 week ago
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // First, update any expired listings
        await supabase.rpc('update_expired_listings', {
          seller_id_param: null, // Pass null to update all expired listings
          week_ago_param: weekAgo.toISOString()
        });

        // Then fetch all listings with their current status
        const { data, error } = await supabase
          .from('listings')
          .select(`
            *,
            profiles!listings_seller_id_fkey(username)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Process listings to determine their status
        const processedListings = (data || []).map(listing => {
          const endDate = new Date(listing.created_at);
          endDate.setDate(endDate.getDate() + 7);
          const hasExpired = now > endDate;

          return {
            ...listing,
            status: listing.status === 'ended' || hasExpired ? 'ended' : 'active'
          };
        });

        setListings(processedListings);
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError('Failed to load listings');
      } finally {
        setLoading(false);
      }
    }

    fetchListings();

    // Set up real-time subscriptions
    const listingsSubscription = supabase
      .channel('listings_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings'
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            // Update the specific listing in the state
            setListings(currentListings => 
              currentListings.map(listing =>
                listing.id === payload.new.id
                  ? { ...listing, ...payload.new }
                  : listing
              )
            );
          } else if (payload.eventType === 'INSERT') {
            // Fetch the complete listing data including seller info
            const { data: newListing } = await supabase
              .from('listings')
              .select(`
                *,
                profiles!listings_seller_id_fkey(username)
              `)
              .eq('id', payload.new.id)
              .single();

            if (newListing) {
              setListings(currentListings => [newListing, ...currentListings]);
            }
          } else if (payload.eventType === 'DELETE') {
            setListings(currentListings =>
              currentListings.filter(listing => listing.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Subscribe to real-time updates for bids
    const bidsSubscription = supabase
      .channel('bids_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids'
        },
        (payload) => {
          // Update the current_bid of the corresponding listing
          setListings(currentListings =>
            currentListings.map(listing =>
              listing.id === payload.new.listing_id
                ? { ...listing, current_bid: payload.new.amount }
                : listing
            )
          );
        }
      )
      .subscribe();

    // Refresh listings every minute to update status
    const interval = setInterval(fetchListings, 60000);

    return () => {
      clearInterval(interval);
      listingsSubscription.unsubscribe();
      bidsSubscription.unsubscribe();
    };
  }, []);

  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (listing.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

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
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">Auctions</h1>
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Search auctions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map((listing) => {
            const endDate = new Date(listing.created_at);
            endDate.setDate(endDate.getDate() + 7);
            const timeLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60)));
            const isEnded = listing.status === 'ended' || timeLeft === 0;

            return (
              <div
                key={listing.id}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform hover:scale-105"
                onClick={() => navigate(`/products/${listing.id}`)}
              >
                <div className="relative">
                  {listing.image_url && (
                    <img
                      src={listing.image_url}
                      alt={listing.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  {isEnded && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-semibold flex items-center">
                        <Trophy className="h-4 w-4 mr-1" />
                        Ended
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                  <p className="mt-2 text-gray-600 line-clamp-2">{listing.description}</p>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center text-indigo-600">
                      <DollarSign className="h-5 w-5 mr-1" />
                      <span className="font-semibold">
                        ${listing.current_bid || listing.starting_price}
                      </span>
                    </div>
                    {!isEnded ? (
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-sm">{timeLeft}h left</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Auction completed
                      </span>
                    )}
                  </div>
                  
                  <button
                    className={`mt-4 w-full py-2 px-4 rounded-md text-white font-medium ${
                      isEnded 
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {isEnded ? 'Auction Ended' : 'View Details'}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredListings.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No auctions found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}