import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Filter, Search, RefreshCw, Zap, Gavel } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useAuctionStore } from '../../stores/auctionStore';
import { useWebSocketStore } from '../../stores/websocketStore';

import RealTimeAuctionCard from './RealTimeAuctionCard';
import type { Auction, Bid, WebSocketMessage, NewAuctionMessage, AuctionUpdateMessage, RealTimeBidMessage } from '../../types';

const RealTimeAuctionList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { auctions, pagination, isLoading, fetchAuctions } = useAuctionStore();
  const { isConnected } = useWebSocketStore();
  
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('endTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveAuctions, setLiveAuctions] = useState<Auction[]>([]);
  const processedAuctionsRef = useRef<Set<string>>(new Set());

  // Fetch initial auctions
  useEffect(() => {
    fetchAuctions({
      page: 1,
      limit: 20,
      status: filterStatus,
      search: searchTerm,
      sortBy,
      sortOrder,
    });
  }, [fetchAuctions, filterStatus, sortBy, sortOrder, searchTerm]);

  // Listen for real-time updates (ALL updates via WebSocket)
  useEffect(() => {
    let isSubscribed = true;
    
        const handleWebSocketMessage = (data: WebSocketMessage) => {
      if (!isSubscribed) return;
      
      if (data.type === 'newAuction') {
        // ✅ REAL-TIME: Add new auction to the top of the list (with deduplication)
        const newAuction = data as NewAuctionMessage;
        
        console.log('Received newAuction message:', newAuction.auction.id, newAuction.auction.title);
        
        // Check if we've already processed this auction
        if (processedAuctionsRef.current.has(newAuction.auction.id)) {
          console.log('Auction already processed, skipping:', newAuction.auction.id);
          return; // Already processed, skip
        }
        
        // Mark as processed
        processedAuctionsRef.current.add(newAuction.auction.id);
        console.log('Processing new auction:', newAuction.auction.id);
        
        setLiveAuctions(prev => {
          // Check if auction already exists to prevent duplicates
          const exists = prev.some(auction => auction.id === newAuction.auction.id);
          if (exists) {
            console.log('Auction already in list, skipping:', newAuction.auction.id);
            return prev; // Don't add if already exists
          }
          console.log('Adding new auction to list:', newAuction.auction.id);
          return [newAuction.auction, ...prev.slice(0, 19)];
        });
        toast.success(`New auction: ${newAuction.auction.title}`);
      } else if (data.type === 'auctionUpdate') {
        // ✅ REAL-TIME: Update existing auction with any changes
        const updateMessage = data as AuctionUpdateMessage;
        setLiveAuctions(prev => 
          prev.map(auction => 
            auction.id === updateMessage.auction.id 
              ? { ...auction, ...updateMessage.auction }
              : auction
          )
        );
      } else if (data.type === 'newBid') {
        // ✅ REAL-TIME: Update auction with new bid information
        const bidMessage = data as RealTimeBidMessage;
        setLiveAuctions(prev => 
          prev.map(auction => 
            auction.id === bidMessage.auction.id 
              ? { 
                  ...auction, 
                  currentPrice: bidMessage.bid.amount,
                  bidCount: (auction.bidCount || 0) + 1,
                  highestBidId: bidMessage.bid.id
                }
              : auction
          )
        );
      } else if (data.type === 'auctionStarted') {
        // ✅ REAL-TIME: Update auction status to active
        setLiveAuctions(prev => 
          prev.map(auction => 
            auction.id === data.auctionId 
              ? { ...auction, status: 'active' as const }
              : auction
          )
        );
        toast.success(`Auction started: ${data.auctionTitle}`);
      } else if (data.type === 'auctionEnded') {
        // ✅ REAL-TIME: Update auction status to ended
        setLiveAuctions(prev => 
          prev.map(auction => 
            auction.id === data.auctionId 
              ? { ...auction, status: 'ended' as const }
              : auction
          )
        );
        toast.success(`Auction ended: ${data.auctionTitle}`);
      }
    };

    // Subscribe to WebSocket updates
    const unsubscribe = useWebSocketStore.getState().subscribe(handleWebSocketMessage);
    
    // Cleanup processed auctions when component unmounts
    return () => {
      isSubscribed = false;
      unsubscribe();
      processedAuctionsRef.current.clear();
    };
  }, []);

  // Update live auctions when auctions change
  useEffect(() => {
    setLiveAuctions(auctions);
  }, [auctions]);

  // Cleanup processed auctions every 5 minutes to prevent memory leaks
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      processedAuctionsRef.current.clear();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  const handleBidPlaced = (auctionId: string, newBid: Bid) => {
    // Update the auction with new bid
    setLiveAuctions(prev => 
      prev.map(auction => 
        auction.id === auctionId 
          ? { 
              ...auction, 
              currentPrice: newBid.amount,
              bidCount: (auction.bidCount || 0) + 1
            }
          : auction
      )
    );
  };

  const handleAuctionUpdate = (auctionId: string, updatedAuction: Auction) => {
    setLiveAuctions(prev => 
      prev.map(auction => 
        auction.id === auctionId ? updatedAuction : auction
      )
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAuctions({
        page: 1,
        limit: 20,
        status: filterStatus,
        search: searchTerm,
        sortBy,
        sortOrder,
      });
      toast.success('Auctions refreshed!');
    } catch {
      toast.error('Failed to refresh auctions');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.pages) {
      fetchAuctions({
        page: pagination.page + 1,
        limit: 20,
        status: filterStatus,
        search: searchTerm,
        sortBy,
        sortOrder,
      });
    }
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuctions({
      page: 1,
      limit: 20,
      status: filterStatus,
      search: searchTerm,
      sortBy,
      sortOrder,
    });
  };

  // Show all auctions in one list, sorted by latest first, with status filtering
  const filteredAndSortedAuctions = liveAuctions
    .filter(auction => {
      if (!filterStatus) return true;
      
      // Calculate real-time status
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
      
      return realTimeStatus === filterStatus;
    })
    .sort((a, b) => {
      // Sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Live Auctions</h1>
              </div>
              {isConnected && (
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Live</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              {user?.role === 'seller' && (
                <button
                  onClick={() => navigate('/auctions/create')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Auction
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search auctions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="ended">Ended</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="endTime">End Time</option>
                <option value="currentPrice">Current Price</option>
                <option value="createdAt">Created Date</option>
                <option value="title">Title</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* All Auctions in One List */}
            {filteredAndSortedAuctions.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {filterStatus ? `${filterStatus?.charAt(0)?.toUpperCase() + filterStatus.slice(1)} Auctions` : 'All Auctions'} ({filteredAndSortedAuctions.length})
                  </h2>
                </div>
                <div className="space-y-4">
                  {filteredAndSortedAuctions.map((auction) => (
                    <RealTimeAuctionCard
                      key={auction.id}
                      auction={auction}
                      onBidPlaced={handleBidPlaced}
                      onAuctionUpdate={handleAuctionUpdate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Auctions */}
            {filteredAndSortedAuctions.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gavel className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No auctions found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || filterStatus 
                    ? 'Try adjusting your search or filters'
                    : 'Be the first to create an auction!'
                  }
                </p>
                {user?.role === 'seller' && (
                  <button
                    onClick={() => navigate('/auctions/create')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Auction
                  </button>
                )}
              </div>
            )}

            {/* Load More */}
            {pagination && pagination.page < pagination.pages && (
              <div className="text-center pt-6">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Load More Auctions
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeAuctionList;
