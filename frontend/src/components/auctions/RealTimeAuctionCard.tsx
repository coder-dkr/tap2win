import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {  TrendingUp, Gavel, DollarSign, Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useWebSocketStore } from '../../stores/websocketStore';
import { api } from '../../lib/api';
import { safeNumber, formatDollar } from '../../utils/numberUtils';
import type { Auction, Bid, WebSocketMessage, RealTimeBidMessage, AuctionUpdateMessage } from '../../types';

interface RealTimeAuctionCardProps {
  auction: Auction;
  onBidPlaced: (auctionId: string, newBid: Bid) => void;
  onAuctionUpdate: (auctionId: string, updatedAuction: Auction) => void;
}

interface BidFormData {
  amount: number;
}

const RealTimeAuctionCard: React.FC<RealTimeAuctionCardProps> = ({
  auction,
  onBidPlaced,
  onAuctionUpdate
}) => {
  const { user } = useAuthStore();

  const [isBidding, setIsBidding] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [recentBids, setRecentBids] = useState<Bid[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [bidAnimation, setBidAnimation] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<BidFormData>();

  const currentBidAmount = watch('amount') || 0;
  const minBidAmount = (safeNumber(auction.currentPrice) || safeNumber(auction.startingPrice)) + safeNumber(auction.bidIncrement);

  // Calculate time left (NO DATABASE UPDATE - purely frontend calculation)
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const startTime = new Date(auction.startTime).getTime();
      const endTime = new Date(auction.endTime).getTime();
      
      // Calculate status based on time (NO DATABASE UPDATE)
      if (now < startTime) {
        // Auction hasn't started yet
        const difference = startTime - now;
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`Starts in ${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m`);
      } else if (now >= startTime && now < endTime) {
        // Auction is active
        const difference = endTime - now;
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
      } else {
        // Auction has ended
        setTimeLeft('Auction Ended');
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [auction.startTime, auction.endTime]);

  // Fetch recent bids (initial load only - updates come via WebSocket)
  useEffect(() => {
    const fetchRecentBids = async () => {
      try {
        const response = await api.getAuctionBids(auction.id, { page: 1, limit: 3 });
        if (response.success && response.data?.bids) {
          setRecentBids(response.data.bids);
        }
      } catch (error) {
        console.error('Error fetching recent bids:', error);
      }
    };

    fetchRecentBids();
  }, [auction.id]);

  // Listen for real-time updates (ALL updates via WebSocket)
  useEffect(() => {
    const handleAuctionUpdate = (data: WebSocketMessage) => {
      if (data.auctionId === auction.id) {
        if (data.type === 'newBid') {
          // ✅ REAL-TIME: Add new bid to the top of the list
          const bidMessage = data as RealTimeBidMessage;
          setRecentBids(prev => [bidMessage.bid, ...prev.slice(0, 2)]);
          
          // ✅ REAL-TIME: Update auction with new price and bid count
          const updatedAuction = {
            ...auction,
            currentPrice: bidMessage.bid.amount,
            bidCount: (auction.bidCount || 0) + 1,
            highestBidId: bidMessage.bid.id
          };
          onAuctionUpdate(auction.id, updatedAuction);
          
          // ✅ REAL-TIME: Trigger bid animation
          setBidAnimation(true);
          setTimeout(() => setBidAnimation(false), 1000);
          
          // ✅ REAL-TIME: Show toast notification for new bid
          toast.success(`New bid: ${formatDollar(bidMessage.bid.amount)} by ${bidMessage.bid.bidder?.username || 'Anonymous'}`);
        } else if (data.type === 'auctionUpdate') {
          // ✅ REAL-TIME: Update auction with any changes
          const updateMessage = data as AuctionUpdateMessage;
          onAuctionUpdate(auction.id, updateMessage.auction);
        } else if (data.type === 'auctionStarted') {
          // ✅ REAL-TIME: Update auction status to active
          const updatedAuction = {
            ...auction,
            status: 'active' as const
          };
          onAuctionUpdate(auction.id, updatedAuction);
          toast.success(`Auction started: ${auction.title}`);
        } else if (data.type === 'auctionEnded') {
          // ✅ REAL-TIME: Update auction status to ended
          const updatedAuction = {
            ...auction,
            status: 'ended' as const
          };
          onAuctionUpdate(auction.id, updatedAuction);
          toast.success(`Auction ended: ${auction.title}`);
        }
      }
    };

    // Subscribe to auction updates
    const unsubscribe = useWebSocketStore.getState().subscribe(handleAuctionUpdate);
    return unsubscribe;
  }, [auction.id, onAuctionUpdate, auction.title]);

  const handleBidSubmit = async (data: BidFormData) => {
    if (!user) {
      toast.error('Please login to place a bid');
      return;
    }

    if (user.id === auction.sellerId) {
      toast.error('You cannot bid on your own auction');
      return;
    }

    if (data.amount < minBidAmount) {
      toast.error(`Minimum bid amount is ${formatDollar(minBidAmount)}`);
      return;
    }

    setIsBidding(true);
    try {
      const response = await api.placeBid(auction.id, data.amount);
      if (response.success) {
        // ✅ REAL-TIME: Update local state immediately
        const newBid = response.data!.bid;
        setRecentBids(prev => [newBid, ...prev.slice(0, 2)]);
        
        // Update auction with new price
        const updatedAuction = {
          ...auction,
          currentPrice: data.amount,
          bidCount: (auction.bidCount || 0) + 1
        };
        onAuctionUpdate(auction.id, updatedAuction);
        
        toast.success(`Bid placed successfully! ${formatDollar(data.amount)}`);
        reset();
        
        // ✅ REAL-TIME: The WebSocket will also update this, but we update immediately for better UX
        onBidPlaced(auction.id, newBid);
      } else {
        toast.error(response.message || 'Failed to place bid');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to place bid';
      toast.error(errorMessage);
    } finally {
      setIsBidding(false);
    }
  };

  const getStatusColor = () => {
    switch (realTimeStatus) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'ended':
        return 'text-red-600 bg-red-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  console.log('Auction',auction)
  // Calculate real-time status (NO DATABASE UPDATE)
  const now = new Date();
  const startTime = new Date(auction.startTime);
  const endTime = new Date(auction.endTime);
  
  let realTimeStatus = auction.status;
  if (now < startTime) {
    realTimeStatus = 'pending';
  } else if (now >= startTime && now < endTime) {
    realTimeStatus = 'active';
  } else if (now >= endTime) {
    realTimeStatus = 'ended';
  }
  
  const isAuctionActive = realTimeStatus === 'active';
  const canBid = user && user.id !== auction.sellerId && isAuctionActive;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900 truncate">
                {auction.title}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
                {realTimeStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600 text-sm line-clamp-2">
              {auction.description}
            </p>
          </div>
          
          {/* Image */}
          <div className="ml-4 flex-shrink-0">
            {auction.images && auction.images.length > 0 ? (
              <img
                src={auction.images[0]}
                alt={auction.title}
                className="w-20 h-20 object-cover rounded-lg"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Auction Info */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="text-center">
            <div className={`text-2xl font-bold text-green-600 transition-all duration-300 ${bidAnimation ? 'scale-110 text-green-500' : ''}`}>
              {formatDollar(auction.currentPrice || auction.startingPrice)}
            </div>
            <div className="text-xs text-gray-500">Current Price</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700">
              {auction.bidCount || recentBids.length}
            </div>
            <div className="text-xs text-gray-500">Total Bids</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700">
              {timeLeft}
            </div>
            <div className="text-xs text-gray-500">Time Left</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700">
              {formatDollar(auction.bidIncrement)}
            </div>
            <div className="text-xs text-gray-500">Min Increment</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {recentBids.length > 0 ? recentBids.length : 0}
            </div>
            <div className="text-xs text-gray-500">Active Bidders</div>
          </div>
        </div>

        {/* Recent Bids */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-700">Recent Bids</h4>
          </div>
          
          {recentBids.length > 0 ? (
            <div className="space-y-2">
              {recentBids.slice(0, 3).map((bid, index) => (
                <div key={bid.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {bid.bidder?.username || 'Anonymous'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-green-600">
                    {formatDollar(bid.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Gavel className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No bids yet. Be the first to bid!</p>
            </div>
          )}
        </div>

        {/* Bidding Section */}
        {canBid && (
          <div className="border-t pt-4">
            <form onSubmit={handleSubmit(handleBidSubmit)} className="flex gap-3">
              <div className="flex-1">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min={minBidAmount}
                    placeholder={`Min: ${formatDollar(minBidAmount)}`}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    {...register('amount', {
                      required: 'Bid amount is required',
                      min: {
                        value: minBidAmount,
                        message: `Minimum bid is ${formatDollar(minBidAmount)}`
                      }
                    })}
                  />
                </div>
                {errors.amount && (
                  <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isBidding || currentBidAmount < minBidAmount}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isBidding ? 'Placing...' : 'Place Bid'}
              </button>
            </form>
            
            <div className="mt-2 text-xs text-gray-500">
              Minimum bid: {formatDollar(minBidAmount)}
            </div>
          </div>
        )}

        {/* Show login prompt if user is not logged in and auction is active */}
        {!user && isAuctionActive && (
          <div className="border-t pt-4">
            <div className="text-center py-4">
              <p className="text-gray-600 mb-3">Login to place a bid on this auction</p>
              <button
                onClick={() => window.location.href = '/login'}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Login to Bid
              </button>
            </div>
          </div>
        )}

        {/* Show seller message if user is the seller */}
        {user && user.id === auction.sellerId && isAuctionActive && (
          <div className="border-t pt-4">
            <div className="text-center py-4">
              <p className="text-gray-600">You cannot bid on your own auction</p>
            </div>
          </div>
        )}

        {/* Show ended message if auction is ended */}
        {!isAuctionActive && auction.status === 'ended' && (
          <div className="border-t pt-4">
            <div className="text-center py-4">
              <p className="text-red-600 font-medium">This auction has ended</p>
            </div>
          </div>
        )}

        {/* Expand/Collapse Details */}
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            {isExpanded ? 'Show Less' : 'Show More Details'}
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isExpanded && (
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Category:</span>
                <span className="font-medium">{auction.category}</span>
              </div>
              <div className="flex justify-between">
                <span>Condition:</span>
                <span className="font-medium capitalize">{auction.condition.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span>Seller:</span>
                <span className="font-medium">{auction.seller?.username || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span>Started:</span>
                <span className="font-medium">
                  {new Date(auction.startTime).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimeAuctionCard;
