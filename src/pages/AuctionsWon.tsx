import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, DollarSign, Trophy, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Listing } from '../types/database';

export function AuctionsWon() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [wonAuctions, setWonAuctions] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWonAuctions() {
      if (!currentUser) return;

      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*, profiles!listings_seller_id_fkey(username)')
          .eq('winner_id', currentUser.id)
          .eq('status', 'ended')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setWonAuctions(data || []);
      } catch (err) {
        console.error('Error fetching won auctions:', err);
        setError('Failed to load your won auctions');
      } finally {
        setLoading(false);
      }
    }

    fetchWonAuctions();
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
        <div className="flex items-center mb-8">
          <Trophy className="h-8 w-8 text-indigo-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Auctions Won</h1>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {wonAuctions.map((auction) => (
            <div
              key={auction.id}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform hover:scale-105"
              onClick={() => navigate(`/products/${auction.id}`)}
            >
              <div className="relative">
                {auction.image_url && (
                  <img
                    src={auction.image_url}
                    alt={auction.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <Trophy className="h-4 w-4 mr-1" />
                    Won
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900">{auction.title}</h3>
                <p className="mt-2 text-gray-600">{auction.description}</p>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Final Bid</p>
                    <div className="flex items-center text-indigo-600">
                      <DollarSign className="h-5 w-5 mr-1" />
                      <span className="font-semibold">{auction.current_bid}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Won On</p>
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-5 w-5 mr-1" />
                      <span>
                        {new Date(auction.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Seller: <span className="font-medium text-gray-900">{auction.profiles?.username}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}

          {wonAuctions.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Trophy className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No auctions won yet</h3>
              <p className="mt-1 text-sm text-gray-500">Start bidding to win some amazing items!</p>
              <button
                onClick={() => navigate('/products')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Browse Auctions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}