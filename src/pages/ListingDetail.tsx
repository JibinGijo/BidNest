import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Clock, DollarSign, User, AlertCircle, XCircle, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Listing, Bid } from '../types/database';

interface BidWithBidder extends Bid {
  bidder_username?: string;
}

interface ExtendedListing extends Listing {
  winner_username?: string;
}

export function ListingDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [listing, setListing] = useState<ExtendedListing | null>(null);
  const [bids, setBids] = useState<BidWithBidder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    fetchListingDetails();

    // Set up real-time subscription
    const subscription = supabase
      .channel('listing_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings',
          filter: `id=eq.${id}`
        },
        (payload) => {
          if (payload.new) {
            setListing(current => ({
              ...current,
              ...payload.new
            } as ExtendedListing));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    if (!listing) return;

    const endDate = new Date(listing.created_at);
    endDate.setDate(endDate.getDate() + 7);

    const updateTimeLeft = () => {
      const now = new Date();
      const timeDiff = endDate.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeLeft('Auction ended');
        if (listing.status === 'active') {
          handleAuctionExpiration();
        }
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [listing]);

  const handleAuctionExpiration = async () => {
    if (!id) return;

    try {
      const { error: endError } = await supabase
        .rpc('end_auction', { listing_id: id });

      if (endError) throw endError;
    } catch (err) {
      console.error('Error ending expired auction:', err);
    }
  };

  const fetchListingDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch listing details with winner information
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select(`
          *,
          profiles!listings_seller_id_fkey(username),
          winner:profiles!listings_winner_id_fkey(username)
        `)
        .eq('id', id)
        .single();
      
      if (listingError) throw listingError;

      // Add winner username to listing data
      const extendedListing: ExtendedListing = {
        ...listingData,
        winner_username: listingData.winner?.username
      };
      
      setListing(extendedListing);
      
      // Fetch bids with usernames
      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select(`
          *,
          profiles!bids_bidder_id_fkey(username)
        `)
        .eq('listing_id', id)
        .order('amount', { ascending: false });
      
      if (bidsError) throw bidsError;
      
      if (bidsData) {
        const bidsWithUsernames = bidsData.map(bid => ({
          ...bid,
          bidder_username: bid.profiles?.username
        }));
        setBids(bidsWithUsernames);
      }
    } catch (err) {
      console.error('Error fetching listing details:', err);
      setError('Failed to load listing details');
    } finally {
      setLoading(false);
    }
  };

  const handleEndAuction = async () => {
    if (!listing || !id) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { error: endError } = await supabase
        .rpc('end_auction', { listing_id: id });

      if (endError) throw endError;

      setSuccess('Auction ended successfully');
      setShowConfirmEnd(false);
      await fetchListingDetails(); // Refresh the listing details
    } catch (err) {
      console.error('Error ending auction:', err);
      setError('Failed to end auction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!listing) {
    return <Navigate to="/your-listings" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8">
              {listing.image_url ? (
                <img
                  src={listing.image_url}
                  alt={listing.title}
                  className="w-full h-96 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">No image available</p>
                </div>
              )}
            </div>
            
            <div className="p-8">
              <div className="flex justify-between items-start">
                <h1 className="text-3xl font-bold text-gray-900">{listing.title}</h1>
                {listing.status === 'active' && listing.seller_id === currentUser?.id && (
                  <button
                    onClick={() => setShowConfirmEnd(true)}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    End Auction
                  </button>
                )}
              </div>

              {error && (
                <div className="mt-4 flex items-center p-4 text-sm text-red-800 rounded-lg bg-red-50">
                  <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mt-4 p-4 text-sm text-green-800 rounded-lg bg-green-50">
                  {success}
                </div>
              )}
              
              <div className="bg-gray-50 rounded-lg p-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Current Bid</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      ${listing.current_bid || listing.starting_price}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Starting Price</p>
                    <p className="text-2xl font-bold text-gray-900">${listing.starting_price}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="flex items-center text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      listing.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                    </span>
                    {listing.status === 'active' ? (
                      <span className="ml-2">
                        <Clock className="h-5 w-5 inline mr-1" />
                        {timeLeft}
                      </span>
                    ) : listing.winner_username && (
                      <span className="ml-2 flex items-center text-green-600">
                        <Trophy className="h-5 w-5 mr-1" />
                        Won by {listing.winner_username}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
                <p className="text-gray-600">{listing.description}</p>
              </div>
              
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Bid History</h2>
                <div className="space-y-4">
                  {bids.map((bid) => (
                    <div key={bid.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-600">{bid.bidder_username}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-indigo-600 font-semibold">${bid.amount}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(bid.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}

                  {bids.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No bids yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* End Auction Confirmation Modal */}
      {showConfirmEnd && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">End Auction</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to end this auction? This action cannot be undone.
              {bids.length > 0 && (
                <>
                  <br /><br />
                  Current highest bid: ${bids[0].amount} by {bids[0].bidder_username}
                </>
              )}
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmEnd(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleEndAuction}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {loading ? 'Ending...' : 'End Auction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
