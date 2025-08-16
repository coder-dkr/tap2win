import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useAuctionStore } from '../../stores/auctionStore';
import { useWebSocketStore } from '../../stores/websocketStore';
import { useAuthStore } from '../../stores/authStore';
import type { PlaceBidForm } from '../../types';
import { 
  ArrowLeft, 
  Clock, 
  DollarSign, 
  CheckCircle,
  XCircle,
  MessageSquare,
  Image as ImageIcon,
  User,
} from 'lucide-react';
import RealTimeStatus from '../../components/auctions/RealTimeStatus';
import WinnerAnnouncement from '../../components/auctions/WinnerAnnouncement';

const AuctionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchAuctionById, placeBid, makeSellerDecision, currentAuction, isLoading } = useAuctionStore();
  const { joinAuction, leaveAuction, isConnected } = useWebSocketStore();
  
  const [bids, setBids] = useState<Array<{ id: string; bidderId: string; amount: number; isWinning: boolean; bidTime: string; bidder?: { username: string } }>>([]);
  const [isBidding, setIsBidding] = useState(false);
  const [showSellerDecision, setShowSellerDecision] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PlaceBidForm>();

  useEffect(() => {
    if (id) {
      loadAuction();
      joinAuction(id);
    }

    return () => {
      if (id) {
        leaveAuction(id);
      }
    };
  }, [id]);

  useEffect(() => {
    if (currentAuction) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const endTime = new Date(currentAuction.endTime).getTime();
        const distance = endTime - now;

        if (distance > 0) {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft('Auction ended');
          if (currentAuction.status === 'active') {
            loadAuction(); // Refresh to get updated status
          }
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentAuction]);

  const loadAuction = async () => {
    try {
      await fetchAuctionById(id!);
      // Fetch bid history for this auction
      if (id) {
        const response = await fetch(`/api/bids/auction/${id}`);
        const data = await response.json();
        if (data.success && data.data) {
          setBids(data.data.bids || []);
        }
      }
    } catch {
      toast.error('Failed to load auction');
    }
  };

  const onSubmitBid = async (data: PlaceBidForm) => {
    if (!user) {
      toast.error('Please login to place a bid');
      return;
    }

    try {
      setIsBidding(true);
      const success = await placeBid(id!, data.amount);
      if (success) {
        toast.success('Bid placed successfully!');
        reset();
        loadAuction();
      } else {
        toast.error('Failed to place bid');
      }
          } catch {
        toast.error('Error placing bid');
      } finally {
      setIsBidding(false);
    }
  };

  const handleSellerDecision = async (decision: 'accept' | 'reject' | 'counter_offer', counterAmount?: number) => {
    try {
      const success = await makeSellerDecision(id!, { decision, counterOfferAmount: counterAmount });
      if (success) {
        toast.success('Decision submitted successfully');
        setShowSellerDecision(false);
        loadAuction();
      } else {
        toast.error('Failed to submit decision');
      }
    } catch {
      toast.error('Error submitting decision');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentAuction) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Auction Not Found</h1>
          <p className="text-gray-600 mb-4">The auction you're looking for doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/auctions')} className="btn btn-primary">
            Browse Auctions
          </button>
        </div>
      </div>
    );
  }

  const isSeller = user?.id === currentAuction.sellerId;
  const isAuctionEnded = currentAuction.status === 'ended';
  const canBid = user && user.role === 'buyer' && currentAuction.status === 'active' && !isSeller;
  const isWinningBid = bids.some(bid => bid.bidderId === user?.id && bid.isWinning);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Auctions
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Images and Details */}
        <div className="space-y-6">
          {/* Images */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {currentAuction.images && currentAuction.images.length > 0 ? (
              <div className="aspect-w-16 aspect-h-9">
                <img
                  src={currentAuction.images[0]}
                  alt={currentAuction.title}
                  className="w-full h-96 object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-96 bg-gray-100 flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-gray-400" />
              </div>
            )}
            
            {currentAuction.images && currentAuction.images.length > 1 && (
              <div className="p-4 grid grid-cols-4 gap-2">
                {currentAuction.images.slice(1).map((image: string, index: number) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${currentAuction.title} ${index + 2}`}
                    className="w-full h-20 object-cover rounded cursor-pointer"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{currentAuction.description}</p>
          </div>
        </div>

        {/* Right Column - Bidding and Info */}
        <div className="space-y-6">
          {/* Real-time Status */}
          <RealTimeStatus auction={currentAuction} />

          {/* Winner Announcement */}
          {currentAuction.status === 'ended' && (
            <WinnerAnnouncement 
              auction={currentAuction}
              winningBid={bids.find(bid => bid.isWinning) ? {
                id: bids.find(bid => bid.isWinning)!.id,
                amount: bids.find(bid => bid.isWinning)!.amount,
                bidder: {
                  id: bids.find(bid => bid.isWinning)!.bidderId,
                  username: bids.find(bid => bid.isWinning)!.bidder?.username || 'Anonymous'
                },
                bidTime: bids.find(bid => bid.isWinning)!.bidTime
              } : undefined}
              onAcceptBid={() => handleSellerDecision('accept')}
              onRejectBid={() => handleSellerDecision('reject')}
              onCounterOffer={(amount) => handleSellerDecision('counter_offer', amount)}
            />
          )}

          {/* Auction Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{currentAuction.title}</h1>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Current Price:</span>
                <span className="text-2xl font-bold text-primary">
                  ${currentAuction.currentPrice || currentAuction.startingPrice}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Starting Price:</span>
                <span className="font-medium">${currentAuction.startingPrice}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Bid Increment:</span>
                <span className="font-medium">${currentAuction.bidIncrement}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Bids:</span>
                <span className="font-medium">{bids.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                  currentAuction.status === 'active' ? 'bg-green-100 text-green-800' :
                  currentAuction.status === 'ended' ? 'bg-red-100 text-red-800' :
                  currentAuction.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {currentAuction.status.charAt(0).toUpperCase() + currentAuction.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Time Remaining */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Time Remaining</h3>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">{timeLeft}</div>
              <div className="text-sm text-gray-600">
                Ends {new Date(currentAuction.endTime).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Bidding Section */}
          {canBid && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Place Your Bid</h3>
              
              <form onSubmit={handleSubmit(onSubmitBid)} className="space-y-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Bid Amount ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...register('amount', {
                        required: 'Bid amount is required',
                        min: {
                          value: (currentAuction.currentPrice || currentAuction.startingPrice) + currentAuction.bidIncrement,
                          message: `Minimum bid is $${(currentAuction.currentPrice || currentAuction.startingPrice) + currentAuction.bidIncrement}`
                        }
                      })}
                      type="number"
                      min={(currentAuction.currentPrice || currentAuction.startingPrice) + currentAuction.bidIncrement}
                      step="0.01"
                      className="input pl-10 w-full"
                      placeholder="Enter your bid"
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isBidding || !isConnected}
                  className="btn btn-primary w-full"
                >
                  {isBidding ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Placing Bid...
                    </div>
                  ) : (
                    'Place Bid'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Seller Decision Section */}
          {isSeller && isAuctionEnded && currentAuction.sellerDecision === 'pending' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Auction Decision</h3>
              <p className="text-gray-600 mb-4">
                The auction has ended. Please make a decision about the highest bid.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleSellerDecision('accept')}
                  className="w-full btn btn-success"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Highest Bid (${currentAuction.currentPrice})
                </button>
                
                <button
                  onClick={() => handleSellerDecision('reject')}
                  className="w-full btn btn-danger"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject All Bids
                </button>
                
                <button
                  onClick={() => setShowSellerDecision(true)}
                  className="w-full btn btn-secondary"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Make Counter Offer
                </button>
              </div>
            </div>
          )}

          {/* Winning Bid Notification */}
          {isWinningBid && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <span className="text-green-800 font-medium">You have the winning bid!</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bid History */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Bid History</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {bids.length > 0 ? (
            bids.map((bid) => (
              <div key={bid.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {bid.bidder?.username || 'Anonymous'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(bid.bidTime), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">${bid.amount}</p>
                  {bid.isWinning && (
                    <span className="text-xs text-green-600 font-medium">Winning</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              No bids yet. Be the first to bid!
            </div>
          )}
        </div>
      </div>

      {/* Counter Offer Modal */}
      {showSellerDecision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Make Counter Offer</h3>
            <p className="text-gray-600 mb-4">
              Propose a new price to the highest bidder.
            </p>
            
            <div className="space-y-4">
              <input
                type="number"
                min={(currentAuction.currentPrice || 0) + 1}
                step="0.01"
                placeholder="Enter counter offer amount"
                className="input w-full"
                id="counterAmount"
              />
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    const amount = (document.getElementById('counterAmount') as HTMLInputElement).value;
                    if (amount) {
                      handleSellerDecision('counter_offer', parseFloat(amount));
                    }
                  }}
                  className="btn btn-primary flex-1"
                >
                  Send Counter Offer
                </button>
                <button
                  onClick={() => setShowSellerDecision(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionDetail;
