import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useAuctionStore } from '../../stores/auctionStore';
import { useAuthStore } from '../../stores/authStore';
import { useWebSocketStore } from '../../stores/websocketStore';
import type { WebSocketMessage } from '../../types';
import { 
  Eye, 
  DollarSign, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const MyBids = () => {
  const { user } = useAuthStore();
  const { myBids, fetchMyBids, isLoading } = useAuctionStore();
  const { subscribe } = useWebSocketStore();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchMyBids();
    if (user) {
      toast.success(`Welcome back, ${user.firstName || user.username}!`);
    }
  }, [user]);

  // Listen for real-time updates
  useEffect(() => {
    const handleWebSocketMessage = (data: WebSocketMessage) => {
      if (data.type === 'newBid') {
        // ✅ REAL-TIME: Refresh bids when new bid is placed
        fetchMyBids();
      } else if (data.type === 'auctionUpdate') {
        // ✅ REAL-TIME: Refresh when auction is updated
        fetchMyBids();
      } else if (data.type === 'auctionEnded') {
        // ✅ REAL-TIME: Refresh when auction ends
        fetchMyBids();
        toast.success(`Auction ended: ${data.auctionTitle}`);
      } else if (data.type === 'winnerAnnouncement') {
        // ✅ REAL-TIME: Refresh when winner is announced
        fetchMyBids();
        toast.success('Winner announced!');
      } else if (data.type === 'auctionCompleted') {
        // ✅ REAL-TIME: Refresh when auction is completed
        fetchMyBids();
        toast.success('Auction completed!');
      }
    };

    const unsubscribe = subscribe(handleWebSocketMessage);
    return unsubscribe;
  }, [subscribe, fetchMyBids]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'winning':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'outbid':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'lost':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'active':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'winning':
        return 'bg-green-100 text-green-800';
      case 'outbid':
        return 'bg-red-100 text-red-800';
      case 'lost':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAuctionStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'ended':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Safety check for undefined myBids
  if (!myBids) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Data Not Found</h1>
          <p className="text-gray-600">Unable to load bid data. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const filteredBids = selectedStatus === 'all' 
    ? myBids 
    : myBids.filter(bid => bid.status === selectedStatus);

  const totalSpent = myBids.reduce((sum, bid) => sum + bid.amount, 0);
  const winningBids = myBids.filter(bid => bid.status === 'winning').length;
  const activeBids = myBids.filter(bid => bid.auction?.status === 'active').length;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Bids</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user?.firstName || user?.username || 'User'}! Track your bidding activity and auction participation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bids</p>
              <p className="text-2xl font-bold text-gray-900">{myBids.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">${totalSpent.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Winning Bids</p>
              <p className="text-2xl font-bold text-gray-900">{winningBids}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Auctions</p>
              <p className="text-2xl font-bold text-gray-900">{activeBids}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              selectedStatus === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({myBids.length})
          </button>
          <button
            onClick={() => setSelectedStatus('winning')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              selectedStatus === 'winning'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Winning ({myBids.filter(b => b.status === 'winning').length})
          </button>
          <button
            onClick={() => setSelectedStatus('outbid')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              selectedStatus === 'outbid'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Outbid ({myBids.filter(b => b.status === 'outbid').length})
          </button>
          <button
            onClick={() => setSelectedStatus('lost')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              selectedStatus === 'lost'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Lost ({myBids.filter(b => b.status === 'lost').length})
          </button>
        </div>
      </div>

      {filteredBids.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedStatus === 'all' ? 'No bids yet' : `No ${selectedStatus} bids`}
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedStatus === 'all' 
              ? 'Start bidding on auctions to see your activity here.'
              : `You don't have any ${selectedStatus} bids at the moment.`
            }
          </p>
          {selectedStatus === 'all' && (
            <Link to="/auctions" className="btn btn-primary">
              Browse Auctions
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBids.map((bid) => (
            <div key={bid.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {bid.auction?.title || 'Auction'}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bid.status)}`}>
                          {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                        </span>
                        {bid.auction && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAuctionStatusColor(bid.auction.status)}`}>
                            {bid.auction.status.charAt(0).toUpperCase() + bid.auction.status.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Your Bid</p>
                        <p className="text-lg font-bold text-primary">${bid.amount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Current Price</p>
                        <p className="text-lg font-medium text-gray-900">
                          ${bid.auction?.currentPrice || bid.auction?.startingPrice || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Bid Time</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDistanceToNow(new Date(bid.bidTime), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {bid.auction && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-4 w-4 mr-1" />
                            {bid.auction.status === 'active' 
                              ? `Ends ${formatDistanceToNow(new Date(bid.auction.endTime), { addSuffix: true })}`
                              : `Ended ${formatDistanceToNow(new Date(bid.auction.endTime), { addSuffix: true })}`
                            }
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {bid.auction.bidCount || 0} bids
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {getStatusIcon(bid.status)}
                          <Link
                            to={`/auctions/${bid.auction.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Auction
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBids;
