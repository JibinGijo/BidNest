import React from 'react';
import { ArrowRight, Shield, Clock, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
              <span className="block">Find Your Perfect</span>
              <span className="block text-indigo-200">Auction Items</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-indigo-200 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Join the most trusted online auction platform. Bid, win, and discover amazing deals.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <Link
                to="/products"
                className="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 md:py-4 md:text-lg md:px-10"
              >
                Browse Auctions
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-indigo-600" />
              <h3 className="mt-4 text-xl font-medium">Secure Bidding</h3>
              <p className="mt-2 text-gray-600">
                Advanced security measures to protect your transactions
              </p>
            </div>
            <div className="text-center">
              <Clock className="mx-auto h-12 w-12 text-indigo-600" />
              <h3 className="mt-4 text-xl font-medium">Real-time Updates</h3>
              <p className="mt-2 text-gray-600">
                Stay informed with instant bid notifications
              </p>
            </div>
            <div className="text-center">
              <Trophy className="mx-auto h-12 w-12 text-indigo-600" />
              <h3 className="mt-4 text-xl font-medium">Win Great Deals</h3>
              <p className="mt-2 text-gray-600">
                Find unique items at competitive prices
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}