import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAuctionStore } from '../stores/auctionStore';
import { useWebSocketStore } from '../stores/websocketStore';
import type { WebSocketMessage } from '../types';
import { Gavel, Plus, Clock, TrendingUp, DollarSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  activeAuctions: number;
  totalBids: number;
  winningBids: number;
  totalRevenue: number;
  recentAuctions: Array<{
    id: string;
    title: string;
    currentPrice: number;
    status: string;
    endTime: string;
  }>;
  recentBids: Array<{
    id: string;
    amount: number;
    auctionTitle: string;
    createdAt: string;
  }>;
}

const Dashboard = () => {
  const { user } = useAuthStore();
  const { fetchMyAuctions, fetchMyBids, myAuctions, myBids } = useAuctionStore();
  const { isConnected, notifications } = useWebSocketStore();
  
  const [stats, setStats] = useState<DashboardStats>({
    activeAuctions: 0,
    totalBids: 0,
    winningBids: 0,
    totalRevenue: 0,
    recentAuctions: [],
    recentBids: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    // Update stats when auction/bid data changes
    updateStats();
  }, [myAuctions, myBids]);

  // ✅ REAL-TIME: Listen for real-time updates and refresh data
  useEffect(() => {
    // Listen for relevant notifications and refresh data
    if (!notifications) return;
    
    const relevantNotifications = notifications.filter(n => 
      n.notificationType === 'newBid' || 
      n.notificationType === 'auctionEnded' ||
      n.notificationType === 'bidAccepted' ||
      n.notificationType === 'auctionCompleted'
    );

    if (relevantNotifications.length > 0) {
      // Refresh data when relevant events occur
      loadDashboardData();
    }
  }, [notifications]);

  // ✅ REAL-TIME: Listen for WebSocket updates
  useEffect(() => {
    const handleWebSocketMessage = (data: WebSocketMessage) => {
      if (data.type === 'newBid' || 
          data.type === 'auctionUpdate' || 
          data.type === 'auctionEnded' || 
          data.type === 'auctionCompleted' ||
          data.type === 'winnerAnnouncement') {
        // ✅ REAL-TIME: Refresh dashboard data
        loadDashboardData();
      }
    };

    const unsubscribe = useWebSocketStore.getState().subscribe(handleWebSocketMessage);
    return unsubscribe;
  }, []);

  // ✅ REAL-TIME: Periodic refresh for real-time stats
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchMyAuctions({ limit: 10 }),
        fetchMyBids({ limit: 10 })
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStats = () => {
    // Safety checks for undefined arrays
    if (!myAuctions || !myBids) {
      setStats({
        activeAuctions: 0,
        totalBids: 0,
        winningBids: 0,
        totalRevenue: 0,
        recentAuctions: [],
        recentBids: []
      });
      return;
    }
    
    const activeAuctions = myAuctions.filter(auction => auction.status === 'active').length;
    const totalBids = myBids.length;
    const winningBids = myBids.filter(bid => bid.isWinning).length;
    
    // Calculate total revenue from completed auctions
    const completedAuctions = myAuctions.filter(auction => auction.status === 'completed');
    const totalRevenue = completedAuctions.reduce((sum, auction) => {
      return sum + (auction.finalPrice || auction.currentPrice || 0);
    }, 0);

    const recentAuctions = myAuctions
      .slice(0, 5)
      .map(auction => ({
        id: auction.id,
        title: auction.title,
        currentPrice: auction.currentPrice || auction.startingPrice,
        status: auction.status,
        endTime: auction.endTime
      }));

    const recentBids = myBids
      .slice(0, 5)
      .map(bid => ({
        id: bid.id,
        amount: bid.amount,
        auctionTitle: bid.auction?.title || 'Unknown Auction',
        createdAt: bid.createdAt
      }));

    setStats({
      activeAuctions,
      totalBids,
      winningBids,
      totalRevenue,
      recentAuctions,
      recentBids
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your auctions and bids
        </p>
        <div className="mt-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {isConnected ? 'Real-time Connected' : 'Real-time Disconnected'}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="bg-primary text-white rounded-full p-3">
                <Gavel className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold">Active Auctions</h3>
                <p className="text-2xl font-bold text-primary">{stats.activeAuctions}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="bg-success text-white rounded-full p-3">
                <Clock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold">My Bids</h3>
                <p className="text-2xl font-bold text-success">{stats.totalBids}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="bg-warning text-white rounded-full p-3">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold">Winning Bids</h3>
                <p className="text-2xl font-bold text-warning">{stats.winningBids}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="bg-purple-500 text-white rounded-full p-3">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold">Total Revenue</h3>
                <p className="text-2xl font-bold text-purple-600">${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Quick Actions</h2>
          </div>
          <div className="card-content space-y-4">
            {user?.role === 'seller' && <>
            <Link to="/auctions/create" className="btn btn-primary w-full">
              <Plus className="h-5 w-5 mr-2" />
              Create New Auction
            </Link>
            <Link to="/auctions" className="btn btn-outline w-full">
              <Gavel className="h-5 w-5 mr-2" />
              Browse Auctions
            </Link>
            <Link to="/my-auctions" className="btn btn-outline w-full">
              View My Auctions
            </Link>
            </>}
            <Link to="/my-bids" className="btn btn-outline w-full py-10">
              View My Bids
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Activity</h2>
          </div>
          <div className="card-content">
            {stats.recentBids.length > 0 ? (
              <div className="space-y-3">
                {stats.recentBids.map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Bid ${bid.amount} on {bid.auctionTitle}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No recent activity to display
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
