import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gavel, User, LogIn, PlusCircle, Package, Trophy, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const { isLoggedIn, currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="bg-indigo-600 text-white">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Gavel className="h-8 w-8" />
            <span className="text-xl font-bold">BidNest</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link to="/products" className="hover:text-indigo-200">Auctions</Link>
            
            {isLoggedIn ? (
              <>
                <Link to="/create-listing" className="flex items-center space-x-1 hover:text-indigo-200">
                  <PlusCircle className="h-5 w-5" />
                  <span>Create Listing</span>
                </Link>
                <Link to="/your-listings" className="flex items-center space-x-1 hover:text-indigo-200">
                  <Package className="h-5 w-5" />
                  <span>Your Listings</span>
                </Link>
                <Link to="/auctions-won" className="flex items-center space-x-1 hover:text-indigo-200">
                  <Trophy className="h-5 w-5" />
                  <span>Auctions Won</span>
                </Link>
                
                <div className="relative group">
                  <button className="flex items-center space-x-1 hover:text-indigo-200">
                    <User className="h-5 w-5" />
                    <span>{currentUser?.email}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <div className="absolute right-0 w-48 mt-2 py-2 bg-white rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 inline mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/register" className="flex items-center space-x-1 hover:text-indigo-200">
                  <User className="h-5 w-5" />
                  <span>Register</span>
                </Link>
                <Link to="/login" className="flex items-center space-x-1 hover:text-indigo-200">
                  <LogIn className="h-5 w-5" />
                  <span>Login</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}