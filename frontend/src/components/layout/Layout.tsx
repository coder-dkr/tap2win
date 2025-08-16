import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useWebSocketStore } from '../../stores/websocketStore';
import { toast } from 'react-hot-toast';
import type { WebSocketMessage } from '../../types';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
  const { user, checkAuth } = useAuthStore();
  const { connect, disconnect } = useWebSocketStore();

  useEffect(() => {
    // Check authentication status on app load
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // ✅ REAL-TIME: Connect to WebSocket immediately for ALL real-time updates
    // This ensures every action in the app is real-time, regardless of authentication
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // ✅ REAL-TIME: Global WebSocket message handler for ALL real-time updates
  useEffect(() => {
    const handleGlobalWebSocketMessage = (message: WebSocketMessage) => {
      // Handle global real-time updates that should work across the entire app
      switch (message.type) {
        case 'newAuction':
          // Show toast for new auctions (works for all users)
          toast.success(`New auction: ${message.auction?.title || 'Auction'}`);
          break;
          
        case 'auctionStarted':
          // Show toast for auction starts
          toast.success(`Auction started: ${message.auctionTitle || 'Auction'}`);
          break;
          
        case 'auctionEnded':
          // Show toast for auction ends
          toast.success(`Auction ended: ${message.auctionTitle || 'Auction'}`);
          break;
          
        case 'notification':
          // Handle global notifications
          if (message.notificationType === 'newUserRegistered' && user?.role === 'admin') {
            toast.success('New user registered!');
          }
          break;
          
        default:
          // Let other components handle their specific messages
          break;
      }
    };

    // Subscribe to global WebSocket messages
    const unsubscribe = useWebSocketStore.getState().subscribe(handleGlobalWebSocketMessage);
    
    return unsubscribe;
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <Outlet />
      </main>
      
      <Footer />
      
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
};

export default Layout;
