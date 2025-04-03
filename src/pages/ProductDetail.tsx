import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, DollarSign, User, AlertCircle, Loader2, UserCircle, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Listing } from '../types/database';

interface BidWithBidder {
  id: string;
  amount: number;
  created_at: string;
  bidder_username?: string;
}

interface WinnerProfile {
  username: string;
  first_name: string | null;
  last_name: string | null;
}

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, currentUser } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [bids, setBids] = useState<BidWithBidder[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [winner, setWinner] = useState<WinnerProfile | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchListingDetails();
  }, [id]);

  const fetchListingDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch listing details with seller profile AND winner profile
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select(`
          *,
          profiles!listings_seller_id_fkey(
            username,
            first_name,
            last_name
          ),
          winner:profiles!listings_winner_id_fkey(
            username,
            first_name,
            last_name
          )
        `)
        .eq('id', id)
        .single();
      
      if (listingError) throw listingError;
      setListing(listingData);
      
      // Set winner information if available
      if (listingData.winner) {
        setWinner(listingData.winner);
      }
      
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

    // Check if auction has ended or expired
    const endDate = new Date(listing.created_at);
    endDate.setDate(endDate.getDate() + 7);
    const hasExpired = new Date() > endDate;

    if (listing.status === 'ended' || hasExpired) {
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
      // Place the bid
      const { data: newBid, error: bidError } = await supabase
        .from('bids')
        .insert({
          listing_id: listing.id,
          bidder_id: currentUser.id,
          amount: amount
        })
        .select()
        .single();
      
      if (bidError) {
        if (bidError.message.includes('Cannot bid on inactive or expired listing')) {
          throw new Error('This auction has ended');
        }
        throw bidError;
      }

      // Update the listing's current bid
      const { error: updateError } = await supabase
        .from('listings')
        .update({ current_bid: amount })
        .eq('id', listing.id);

      if (updateError) throw updateError;

      // Update local state
      setListing(prev => prev ? { ...prev, current_bid: amount } : null);
      setBidAmount('');
      setSuccess('Your bid was placed successfully!');
      
      // Refresh bids list
      fetchListingDetails();
      
    } catch (err: any) {
      console.error('Error placing bid:', err);
      setError(err.message || 'Failed to place bid. Please try again.');
    } finally {
      setIsBidding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Listing not found</h2>
          <button
            onClick={() => navigate('/products')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Back to Listings
          </button>
        </div>
      </div>
    );
  }

  // Calculate time left
  const endDate = new Date(listing.created_at);
  endDate.setDate(endDate.getDate() + 7);
  const timeLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60)));
  const isEnded = listing.status === 'ended' || timeLeft === 0;
  const isOwnListing = currentUser?.id === listing.seller_id;

  // Format seller name
  const sellerName = listing.profiles?.first_name && listing.profiles?.last_name
    ? `${listing.profiles.first_name} ${listing.profiles.last_name}`
    : listing.profiles?.username || 'Unknown Seller';

  // Format winner name
  const winnerName = winner?.first_name && winner?.last_name
    ? `${winner.first_name} ${winner.last_name}`
    : winner?.username || 'Unknown Winner';

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
              <h1 className="text-3xl font-bold text-gray-900">{listing.title}</h1>
              
              {/* Seller Information */}
              <div className="mt-4 flex items-center text-gray-600">
                <UserCircle className="h-5 w-5 mr-2" />
                <span>Listed by: <span className="font-medium">{sellerName}</span></span>
                {isOwnListing && (
                  <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                    Your Listing
                  </span>
                )}
              </div>

              {/* Winner Information */}
              {isEnded && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <Trophy className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-800">
                      {winner ? (
                        <>
                          Auction Winner: {winner.first_name && winner.last_name 
                            ? `${winner.first_name} ${winner.last_name}`
                            : winner.username}
                        </>
                      ) : (
                        'No winner (no bids placed)'
                      )}
                    </span>
                  </div>
                  {winner && listing?.current_bid && (
                    <p className="mt-2 text-sm text-green-600">
                      Winning Bid: ${listing.current_bid}
                    </p>
                  )}
                </div>
              )}
              
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
                      !isEnded 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {isEnded ? 'Ended' : 'Active'}
                    </span>
                    {!isEnded && (
                      <span className="ml-2">
                        <Clock className="h-5 w-5 inline mr-1" />
                        {timeLeft}h left
                      </span>
                    )}
                  </div>
                </div>

                {!isEnded && isLoggedIn && !isOwnListing && (
                  <form onSubmit={handleBid} className="mt-6">
                    <div>
                      <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700">
                        Your Bid
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          name="bidAmount"
                          id="bidAmount"
                          step="0.01"
                          min={listing.current_bid ? listing.current_bid + 0.01 : listing.starting_price + 0.01}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                          placeholder="Enter bid amount"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isBidding}
                      className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isBidding ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Placing Bid...
                        </>
                      ) : 'Place Bid'}
                    </button>
                  </form>
                )}

                {isOwnListing && !isEnded && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      This is your listing. You cannot bid on your own items.
                    </p>
                  </div>
                )}

                {!isLoggedIn && !isEnded && (
                  <div className="mt-4">
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Login to Place Bid
                    </button>
                  </div>
                )}
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
    </div>
  );
}