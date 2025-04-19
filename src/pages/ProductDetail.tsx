import React, { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Clock, DollarSign, User, AlertCircle, Loader2, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Listing, Bid } from '../types/database';

interface BidWithBidder extends Bid {
  bidder_username?: string;
}

interface ExtendedListing extends Listing {
  winner_username?: string;
}

export function ProductDetail() {
  const { id } = useParams();
  const { isLoggedIn, currentUser } = useAuth();
  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBidding, setIsBidding] = useState(false);
  const [listing, setListing] = useState<ExtendedListing | null>(null);
  const [bids, setBids] = useState<BidWithBidder[]>([]);
  const [sellerUsername, setSellerUsername] = useState<string | null>(null);
  const [hasEnded, setHasEnded] = useState(false);
  
  useEffect(() => {
    async function fetchListingDetails() {
      if (!id) return;
      
      try {
        setIsLoading(true);
        
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
        
        if (listingData) {
          const extendedListing: ExtendedListing = {
            ...listingData,
            winner_username: listingData.winner?.username
          };
          setListing(extendedListing);
          setSellerUsername(listingData.profiles?.username);
          
          // Check if auction has ended
          const endDate = new Date(listingData.created_at);
          endDate.setDate(endDate.getDate() + 7);
          setHasEnded(new Date() > endDate);
          
          // Fetch bids with usernames
          const { data: bidsData, error: bidsError } = await supabase
            .from('bids')
            .select(`
              *,
              profiles!bids_bidder_id_fkey(username)
            `)
            .eq('listing_id', id)
            .order('created_at', { ascending: false });
          
          if (bidsError) throw bidsError;
          
          if (bidsData) {
            const bidsWithUsernames = bidsData.map(bid => ({
              ...bid,
              bidder_username: bid.profiles?.username
            }));
            setBids(bidsWithUsernames);
          }
        }
      } catch (err) {
        console.error('Error fetching listing details:', err);
        setError('Failed to load listing details');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchListingDetails();

    // Subscribe to real-time updates for the listing
    const listingsSubscription = supabase
      .channel('listing_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'listings',
          filter: `id=eq.${id}`
        },
        (payload) => {
          setListing(currentListing => 
            currentListing ? { ...currentListing, ...payload.new } : null
          );
        }
      )
      .subscribe();

    // Subscribe to real-time updates for bids
    const bidsSubscription = supabase
      .channel('bid_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `listing_id=eq.${id}`
        },
        async (payload) => {
          // Fetch the username for the new bid
          const { data: bidderData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', payload.new.bidder_id)
            .single();

          const newBid = {
            ...payload.new,
            bidder_username: bidderData?.username
          };

          setBids(currentBids => [newBid, ...currentBids]);
        }
      )
      .subscribe();

    return () => {
      listingsSubscription.unsubscribe();
      bidsSubscription.unsubscribe();
    };
  }, [id]);
  
  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoggedIn || !currentUser) {
      setError('You must be logged in to place a bid');
      return;
    }
    
    if (!listing) {
      setError('Listing information not available');
      return;
    }

    if (hasEnded) {
      setError('This auction has ended');
      return;
    }
    
    const amount = parseFloat(bidAmount);
    
    // Validate bid amount
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid bid amount');
      return;
    }
    
    const currentHighestBid = listing.current_bid || listing.starting_price;
    
    if (amount <= currentHighestBid) {
      setError(`Bid must be higher than current bid ($${currentHighestBid})`);
      return;
    }
    
    // Prevent bidding on own listing
    if (listing.seller_id === currentUser.id) {
      setError('You cannot bid on your own listing');
      return;
    }
    
    setIsBidding(true);
    setError('');
    setSuccess('');
    
    try {
      // Start a transaction
      const { data: newBid, error: bidError } = await supabase
        .from('bids')
        .insert({
          listing_id: listing.id,
          bidder_id: currentUser.id,
          amount: amount
        })
        .select()
        .single();
      
      if (bidError) throw bidError;

      // Update the listing's current bid
      const { error: updateError } = await supabase
        .from('listings')
        .update({ current_bid: amount })
        .eq('id', listing.id)
        .select();

      if (updateError) throw updateError;

      // Update local state
      setListing(prev => prev ? { ...prev, current_bid: amount } : null);
      setBidAmount('');
      setSuccess('Your bid was placed successfully!');
      
    } catch (err: any) {
      console.error('Error placing bid:', err);
      setError(err.message || 'Failed to place bid. Please try again.');
    } finally {
      setIsBidding(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }
  
  if (!listing) {
    return <Navigate to="/products" replace />;
  }
  
  // Calculate time left
  const endDate = new Date(listing.created_at);
  endDate.setDate(endDate.getDate() + 7); // 7-day auctions
  const timeLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60)));
  
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8">
              <div className="relative w-full">
                <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden">
                  {listing.image_url ? (
                    <img
                      src={listing.image_url}
                      alt={listing.title}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">No image available</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{listing.title}</h1>
              
              <div className="flex items-center text-gray-600 mb-6">
                <User className="h-5 w-5 mr-2" />
                <span>Listed by {sellerUsername || 'Unknown'}</span>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
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
                        {timeLeft > 0 ? `${timeLeft}h left` : 'Auction ended'}
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
              
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
                <p className="text-gray-600">{listing.description}</p>
              </div>
              
              {isLoggedIn ? (
                hasEnded ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                      <p className="text-sm text-yellow-700">
                        This auction has ended. No more bids can be placed.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleBid} className="space-y-4">
                    {error && (
                      <div className="flex items-center text-red-600 bg-red-50 p-3 rounded-md">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <span>{error}</span>
                      </div>
                    )}
                    
                    {success && (
                      <div className="bg-green-50 text-green-700 p-3 rounded-md">
                        {success}
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="bid" className="block text-sm font-medium text-gray-700">
                        Your Bid Amount ($)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          id="bid"
                          min={(listing.current_bid || listing.starting_price) + 1}
                          step="0.01"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                          placeholder="Enter bid amount"
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isBidding || listing.seller_id === currentUser?.id}
                      className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBidding ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Placing Bid...
                        </div>
                      ) : listing.seller_id === currentUser?.id ? (
                        "You can't bid on your own listing"
                      ) : (
                        "Place Bid"
                      )}
                    </button>
                  </form>
                )
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                    <p className="text-sm text-yellow-700">
                      Please <Link to="/login" className="font-medium underline">log in</Link> to place a bid on this item.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Bid History */}
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Bid History</h2>
                {bids.length > 0 ? (
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {bids.map((bid) => (
                      <div key={bid.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <User className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {bid.bidder_id === currentUser?.id ? 'You' : bid.bidder_username || 'Anonymous'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-indigo-600 font-semibold">${bid.amount}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(bid.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No bids yet. Be the first to bid!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
