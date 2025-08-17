import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useAuctionStore } from '../../stores/auctionStore';
import { useWebSocketStore } from '../../stores/websocketStore';
import type { WebSocketMessage } from '../../types';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Clock, 
  // DollarSign, 
  // Users,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const MyAuctions = () => {
  const { myAuctions, fetchMyAuctions, deleteAuction, isLoading } = useAuctionStore();
  const { subscribe } = useWebSocketStore();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchMyAuctions();
  }, [fetchMyAuctions]);

  // Listen for real-time updates
  useEffect(() => {
    const handleWebSocketMessage = (data: WebSocketMessage) => {
      if (data.type === 'auctionUpdate') {
        // ✅ REAL-TIME: Update auction in my auctions list
        fetchMyAuctions(); // Refresh the list to get updated data
      } else if (data.type === 'auctionStarted') {
        // ✅ REAL-TIME: Refresh when auction starts
        fetchMyAuctions();
        toast.success(`Auction started: ${data.auctionTitle}`);
      } else if (data.type === 'auctionEnded') {
        // ✅ REAL-TIME: Refresh when auction ends and update seller decision
        fetchMyAuctions();
        toast.success(`Auction ended: ${data.auctionTitle}`);
      } else if (data.type === 'newBid') {
        // ✅ REAL-TIME: Update auction with new bid information
        fetchMyAuctions();
      } else if (data.type === 'sellerDecisionInterface') {
        // ✅ REAL-TIME: Seller decision interface activated
        fetchMyAuctions();
        toast.success('Seller decision interface activated');
      } else if (data.type === 'winnerAnnouncement') {
        // ✅ REAL-TIME: Winner announced
        fetchMyAuctions();
        toast.success('Winner announced!');
      }
    };

    const unsubscribe = subscribe(handleWebSocketMessage);
    return unsubscribe;
  }, [subscribe, fetchMyAuctions]);

  const handleDeleteAuction = async (auctionId: string) => {
    if (window.confirm('Are you sure you want to delete this auction?')) {
      try {
        const success = await deleteAuction(auctionId);
        if (success) {
          toast.success('Auction deleted successfully');
          fetchMyAuctions();
        } else {
          toast.error('Failed to delete auction');
        }
      } catch {
        toast.error('Error deleting auction');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-green-500" />;
      case 'ended':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
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

  // Calculate real-time status for an auction
  const getRealTimeStatus = (auction: { startTime: string; endTime: string; status: string }) => {
    const now = new Date();
    const startTime = new Date(auction.startTime);
    const endTime = new Date(auction.endTime);
    
    if (now < startTime) {
      return 'pending';
    } else if (now >= startTime && now < endTime) {
      return 'active';
    } else if (now >= endTime) {
      return 'ended';
    }
    
    return auction.status;
  };

  // Safety check for undefined myAuctions
  if (!myAuctions) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Data Not Found</h1>
          <p className="text-gray-600">Unable to load auction data. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const filteredAuctions = selectedStatus === 'all' 
    ? myAuctions 
    : myAuctions.filter(auction => getRealTimeStatus(auction) === selectedStatus);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Auctions</h1>
          <p className="text-gray-600 mt-2">Manage your auction listings</p>
        </div>
        <Link
          to="/auctions/create"
          className="btn btn-primary mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Auction
        </Link>
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
            All ({myAuctions.length})
          </button>
          <button
            onClick={() => setSelectedStatus('active')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              selectedStatus === 'active'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active ({myAuctions.filter(a => a.status === 'active').length})
          </button>
          <button
            onClick={() => setSelectedStatus('ended')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              selectedStatus === 'ended'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ended ({myAuctions.filter(a => a.status === 'ended').length})
          </button>
          <button
            onClick={() => setSelectedStatus('completed')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              selectedStatus === 'completed'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completed ({myAuctions.filter(a => a.status === 'completed').length})
          </button>
        </div>
      </div>

      {filteredAuctions.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedStatus === 'all' ? 'No auctions yet' : `No ${selectedStatus} auctions`}
          </h3>
          <p className="text-gray-600 mb-6">
            {selectedStatus === 'all' 
              ? 'Start by creating your first auction to sell items.'
              : `You don't have any ${selectedStatus} auctions at the moment.`
            }
          </p>
          {selectedStatus === 'all' && (
            <Link to="/auctions/create" className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Auction
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuctions.map((auction) => (
            <div key={auction.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Auction Image */}
              <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                {auction.images && auction.images.length > 0 ? (
                  <img
                    src={auction.images[0]}
                    alt={auction.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <AlertCircle className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Auction Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {auction.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getRealTimeStatus(auction))}`}>
                    {getRealTimeStatus(auction).charAt(0).toUpperCase() + getRealTimeStatus(auction).slice(1)}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {auction.description}
                </p>

                {/* Auction Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Current Price:</span>
                    <span className="font-semibold text-primary">
                      ${auction.currentPrice || auction.startingPrice}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Bids:</span>
                    <span className="font-medium">{auction.bidCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Ends:</span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(auction.endTime), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <Link
                      to={`/auctions/${auction.id}`}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="View Auction"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    {getRealTimeStatus(auction) === 'pending' && (
                      <Link
                        to={`/auctions/${auction.id}/edit`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Auction"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    )}
                    {getRealTimeStatus(auction) === 'pending' && (
                      <button
                        onClick={() => handleDeleteAuction(auction.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Auction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div className="flex items-center">
                    {getStatusIcon(auction.status)}
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

export default MyAuctions;
