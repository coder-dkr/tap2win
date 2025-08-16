import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuctionStore } from '../../stores/auctionStore';
import { useWebSocketStore } from '../../stores/websocketStore';
import type { Auction } from '../../types';
import { Search, Filter, Clock, Users, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const AuctionList = () => {
  const {
    auctions,
    pagination,
    isLoading,
    fetchAuctions,
    clearFilters,
  } = useAuctionStore();

  const { joinAuction, leaveAuction } = useWebSocketStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAuctions({
      page: 1,
      limit: 12,
      search: searchTerm,
      status: selectedStatus,
      category: selectedCategory,
    });
  }, [searchTerm, selectedStatus, selectedCategory]);

  useEffect(() => {
    // Join all active auctions for real-time updates
    auctions.forEach(auction => {
      if (auction.status === 'active') {
        joinAuction(auction.id);
      }
    });

    return () => {
      // Leave all auctions when component unmounts
      auctions.forEach(auction => {
        leaveAuction(auction.id);
      });
    };
  }, [auctions]);

  // ✅ REAL-TIME: Listen for new auctions and refresh list
  useEffect(() => {
    const handleNewAuction = () => {
      // Refresh auction list when new auction is created
      fetchAuctions({
        page: 1,
        limit: 12,
        search: searchTerm,
        status: selectedStatus,
        category: selectedCategory,
      });
    };

    // Listen for WebSocket notifications about new auctions
    const interval = setInterval(() => {
      handleNewAuction();
    }, 10000); // Refresh every 10 seconds to catch new auctions

    return () => clearInterval(interval);
  }, [searchTerm, selectedStatus, selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuctions({
      page: 1,
      limit: 12,
      search: searchTerm,
      status: selectedStatus,
      category: selectedCategory,
    });
  };

  const handlePageChange = (page: number) => {
    fetchAuctions({
      page,
      limit: 12,
      search: searchTerm,
      status: selectedStatus,
      category: selectedCategory,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      ended: { color: 'bg-red-100 text-red-800', text: 'Ended' },
      completed: { color: 'bg-blue-100 text-blue-800', text: 'Completed' },
      cancelled: { color: 'bg-gray-100 text-gray-800', text: 'Cancelled' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getTimeRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const categories = [
    'Electronics',
    'Collectibles',
    'Art',
    'Jewelry',
    'Vehicles',
    'Real Estate',
    'Sports',
    'Books',
    'Fashion',
    'Other',
  ];

  const statuses = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'ended', label: 'Ended' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Auctions</h1>
        <p className="text-gray-600">Discover and bid on amazing items</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search auctions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary px-6"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-outline px-6"
          >
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </button>
        </form>

        {/* Filter Options */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg border mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="input"
                >
                  {statuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={clearFilters}
                className="btn btn-outline"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-gray-600">
          Showing {pagination.total} auctions
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Auctions Grid */}
      {!isLoading && (
        <>
          {auctions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">No auctions found</p>
              <Link to="/auctions/create" className="btn btn-primary">
                Create First Auction
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {auctions.map((auction: Auction) => (
                <div key={auction.id} className="card hover:shadow-lg transition-shadow">
                  {/* Auction Image */}
                  <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                    {auction.images && auction.images.length > 0 ? (
                      <img
                        src={auction.images[0]}
                        alt={auction.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Eye className="h-12 w-12" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(auction.status)}
                    </div>
                  </div>

                  {/* Auction Info */}
                  <div className="card-content">
                    <h3 className="card-title text-lg mb-2 line-clamp-2">
                      {auction.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {auction.description}
                    </p>

                    {/* Price and Time */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Current Price</span>
                        <span className="font-semibold text-lg text-primary">
                          ${auction.currentPrice || auction.startingPrice}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Time Left</span>
                        <span className="text-sm font-medium">
                          {getTimeRemaining(auction.endTime)}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {auction.bidCount || 0} bids
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDistanceToNow(new Date(auction.createdAt), { addSuffix: true })}
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link
                      to={`/auctions/${auction.id}`}
                      className="btn btn-primary w-full"
                    >
                      {auction.status === 'active' ? 'Place Bid' : 'View Details'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-8 flex justify-center">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Previous
                </button>
                
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`btn btn-sm ${
                      page === pagination.page ? 'btn-primary' : 'btn-outline'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuctionList;
