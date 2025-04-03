import React, { useState, useEffect } from 'react';
import { Users, Package, DollarSign, Activity, Archive, CheckSquare, Search, Eye, Trash2, XCircle, LogOut } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type Tab = 'dashboard' | 'users' | 'listings';

interface DashboardStats {
  totalUsers: number;
  totalListings: number;
  activeListings: number;
  inactiveListings: number;
  totalRevenue: number;
  bidsToday: number;
}

interface RecentActivity {
  id: string;
  type: 'new_listing' | 'ended_auction' | 'new_bid';
  title: string;
  amount?: number;
  timestamp: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface Listing {
  id: string;
  title: string;
  seller_id: string;
  starting_price: number;
  current_bid: number | null;
  status: string;
  seller: {
    username: string;
  } | null;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const isAdmin = localStorage.getItem('adminSession') === 'true';
    if (!isAdmin) {
      navigate('/admin/login');
      return;
    }

    fetchDashboardData();
    setupRealtimeSubscriptions();
  }, [navigate]);

  const setupRealtimeSubscriptions = () => {
    // Subscribe to listings changes
    const listingsSubscription = supabase
      .channel('listings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    // Subscribe to bids changes
    const bidsSubscription = supabase
      .channel('bids_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      listingsSubscription.unsubscribe();
      bidsSubscription.unsubscribe();
    };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch listings statistics
      const { data: listingsData } = await supabase
        .from('listings')
        .select(`
          *,
          profiles!listings_seller_id_fkey(username)
        `);
      
      const activeListings = listingsData?.filter(l => l.status === 'active').length || 0;
      const inactiveListings = listingsData?.filter(l => l.status === 'ended').length || 0;
      const totalRevenue = listingsData?.reduce((sum, listing) => sum + (listing.current_bid || 0), 0) || 0;

      // Fetch today's bids
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: bidsToday } = await supabase
        .from('bids')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        totalListings: listingsData?.length || 0,
        activeListings,
        inactiveListings,
        totalRevenue,
        bidsToday: bidsToday || 0
      });

      // Fetch recent activity
      const { data: recentListings } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          created_at,
          status,
          current_bid,
          profiles!listings_seller_id_fkey(username)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentBids } = await supabase
        .from('bids')
        .select(`
          id,
          amount,
          created_at,
          listings!inner(title)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const activity: RecentActivity[] = [
        ...(recentListings?.map(listing => ({
          id: listing.id,
          type: listing.status === 'active' ? 'new_listing' : 'ended_auction',
          title: listing.title,
          amount: listing.current_bid,
          timestamp: listing.created_at
        })) || []),
        ...(recentBids?.map(bid => ({
          id: bid.id,
          type: 'new_bid',
          title: bid.listings?.title || 'Unknown Listing',
          amount: bid.amount,
          timestamp: bid.created_at
        })) || [])
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 5);

      setRecentActivity(activity);

      // Fetch users for the users tab
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      setUsers(usersData || []);

      // Fetch listings for the listings tab
      const { data: listingsWithSellers } = await supabase
        .from('listings')
        .select(`
          *,
          profiles!listings_seller_id_fkey(username)
        `)
        .order('created_at', { ascending: false });
      
      setListings(listingsWithSellers || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    navigate('/admin/login');
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;
      
      // Refresh listings
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting listing:', error);
    }
  };

  const handleEndListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'ended' })
        .eq('id', listingId);

      if (error) throw error;
      
      // Refresh listings
      fetchDashboardData();
    } catch (error) {
      console.error('Error ending listing:', error);
    }
  };

  const handleViewUserDetails = (userId: string) => {
    navigate(`/admin/users/${userId}`);
  };

  const renderDashboard = () => (
    <>
      {stats && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md p-3 bg-blue-500">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.totalUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md p-3 bg-green-500">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Listings</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.totalListings}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md p-3 bg-indigo-500">
                  <CheckSquare className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Listings</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.activeListings}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md p-3 bg-yellow-500">
                  <Archive className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Inactive Listings</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.inactiveListings}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md p-3 bg-purple-500">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-lg font-semibold text-gray-900">${stats.totalRevenue}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md p-3 bg-pink-500">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Bids Today</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.bidsToday}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600">
                      {activity.type === 'new_listing' && 'New listing created'}
                      {activity.type === 'ended_auction' && 'Auction ended'}
                      {activity.type === 'new_bid' && 'New bid placed'}
                    </p>
                    <p className="text-sm text-gray-500">{activity.title}</p>
                  </div>
                  <div className="text-right">
                    {activity.amount && (
                      <p className="text-sm font-medium text-gray-900">${activity.amount}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );

  const renderUsers = () => (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900">Manage Users</h2>
      </div>
      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.username || user.email}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={() => handleViewUserDetails(user.id)}
                  className="flex items-center text-indigo-600 hover:text-indigo-900"
                >
                  <Eye className="h-5 w-5 mr-1" />
                  View Profile
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderListings = () => (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Manage Listings</h2>
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
                listing.seller?.username?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((listing) => (
                <tr key={listing.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{listing.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {listing.seller?.username || 'Unknown'}
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
                    <button
                      onClick={() => handleEndListing(listing.id)}
                      className="text-red-600 hover:text-red-900 mr-3"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteListing(listing.id)}
                      className="text-red-600 hover:text-red-900"
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
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`ml-4 px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'users'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Manage Users
              </button>
              <button
                onClick={() => setActiveTab('listings')}
                className={`ml-4 px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'listings'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Manage Listings
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-900"
            >
              <LogOut className="h-5 w-5 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'listings' && renderListings()}
          </>
        )}
      </div>
    </div>
  );
}