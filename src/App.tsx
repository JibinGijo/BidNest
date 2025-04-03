import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Chatbot } from './components/Chatbot';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminLogin } from './pages/AdminLogin';
import { ProductListing } from './pages/ProductListing';
import { ProductDetail } from './pages/ProductDetail';
import { ProductManagement } from './pages/ProductManagement';
import { AdminDashboard } from './pages/AdminDashboard';
import { CreateListing } from './pages/CreateListing';
import { YourListings } from './pages/YourListings';
import { AuctionsWon } from './pages/AuctionsWon';
import { Profile } from './pages/Profile';
import { ListingDetail } from './pages/ListingDetail';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100 flex flex-col">
          <Header />
          <div className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/products" element={<ProductListing />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route 
                path="/admin/products" 
                element={
                  <ProtectedRoute requireAdmin>
                    <ProductManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/create-listing" 
                element={
                  <ProtectedRoute>
                    <CreateListing />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/your-listings" 
                element={
                  <ProtectedRoute>
                    <YourListings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/your-listings/:id" 
                element={
                  <ProtectedRoute>
                    <ListingDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/auctions-won" 
                element={
                  <ProtectedRoute>
                    <AuctionsWon />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
          <Footer />
          <Chatbot />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;