import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center mb-4">
            <span className="text-sm">© 2025 BidNest. All rights reserved.</span>
          </div>
          <Link
            to="/admin/login"
            className="flex items-center text-xs text-gray-400 hover:text-white transition-colors"
          >
            <ShieldAlert className="h-3 w-3 mr-1" />
            Admin Access
          </Link>
        </div>
      </div>
    </footer>
  );
}