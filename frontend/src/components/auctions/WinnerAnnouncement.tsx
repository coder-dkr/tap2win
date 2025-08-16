import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import type { Auction } from '../../types';
import { Trophy, CheckCircle, XCircle, DollarSign, User, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WinnerAnnouncementProps {
  auction: Auction;
  winningBid?: {
    id: string;
    amount: number;
    bidder: {
      id: string;
      username: string;
    };
    bidTime: string;
  };
  onAcceptBid?: () => void;
  onRejectBid?: () => void;
  onCounterOffer?: (amount: number) => void;
}

const WinnerAnnouncement = ({
  auction,
  winningBid,
  onAcceptBid,
  onRejectBid,
  onCounterOffer
}: WinnerAnnouncementProps) => {
  const { user } = useAuthStore();
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');

  const isSeller = user?.id === auction.sellerId;
  const isWinner = winningBid?.bidder.id === user?.id;
  const isAuctionEnded = auction.status === 'ended';
  const needsSellerDecision = isSeller && isAuctionEnded && auction.sellerDecision === 'pending';

  const handleCounterOffer = () => {
    const amount = parseFloat(counterAmount);
    if (amount && amount > (winningBid?.amount || 0)) {
      onCounterOffer?.(amount);
      setShowCounterOffer(false);
      setCounterAmount('');
    }
  };

  if (!isAuctionEnded) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-primary/20">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Auction Ended</h3>
              <p className="text-sm text-gray-600">
                Ended {formatDistanceToNow(new Date(auction.endTime), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        {/* Winner Information */}
        {winningBid ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-green-800 mb-2">
                  🎉 Winning Bid: ${winningBid.amount}
                </h4>
                <div className="flex items-center space-x-4 text-sm text-green-700">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {winningBid.bidder.username}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDistanceToNow(new Date(winningBid.bidTime), { addSuffix: true })}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  ${winningBid.amount}
                </div>
                <div className="text-xs text-green-600">Final Price</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="text-center">
              <XCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <h4 className="text-lg font-semibold text-gray-700 mb-1">No Bids Received</h4>
              <p className="text-sm text-gray-600">
                This auction ended without any bids
              </p>
            </div>
          </div>
        )}

        {/* Seller Decision Section */}
        {needsSellerDecision && winningBid && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              Seller Decision Required
            </h4>
            <p className="text-gray-600 mb-4">
              Please decide what to do with the winning bid of ${winningBid.amount} by {winningBid.bidder.username}
            </p>

            <div className="space-y-3">
              <button
                onClick={onAcceptBid}
                className="w-full btn btn-success"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Bid (${winningBid.amount})
              </button>

              <button
                onClick={onRejectBid}
                className="w-full btn btn-danger"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject All Bids
              </button>

              <button
                onClick={() => setShowCounterOffer(true)}
                className="w-full btn btn-secondary"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Make Counter Offer
              </button>
            </div>

            {/* Counter Offer Modal */}
            {showCounterOffer && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Make Counter Offer</h3>
                  <p className="text-gray-600 mb-4">
                    Propose a new price to {winningBid.bidder.username}
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Counter Offer Amount ($)
                      </label>
                      <input
                        type="number"
                        min={winningBid.amount + 1}
                        step="0.01"
                        value={counterAmount}
                        onChange={(e) => setCounterAmount(e.target.value)}
                        placeholder={`Minimum: $${winningBid.amount + 1}`}
                        className="input w-full"
                      />
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={handleCounterOffer}
                        disabled={!counterAmount || parseFloat(counterAmount) <= winningBid.amount}
                        className="btn btn-primary flex-1 disabled:opacity-50"
                      >
                        Send Counter Offer
                      </button>
                      <button
                        onClick={() => {
                          setShowCounterOffer(false);
                          setCounterAmount('');
                        }}
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
        )}

        {/* Winner Notification */}
        {isWinner && auction.status === 'completed' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <h4 className="font-semibold text-blue-800">Congratulations! You won!</h4>
                <p className="text-sm text-blue-600">
                  Your bid of ${winningBid?.amount} was accepted by the seller.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Auction Statistics */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Auction Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Starting Price:</span>
              <span className="font-medium ml-2">${auction.startingPrice}</span>
            </div>
            <div>
              <span className="text-gray-600">Final Price:</span>
              <span className="font-medium ml-2">${winningBid?.amount || auction.startingPrice}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Bids:</span>
              <span className="font-medium ml-2">{auction.bidCount || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium ml-2">
                {formatDistanceToNow(new Date(auction.startTime), { addSuffix: false })} - {formatDistanceToNow(new Date(auction.endTime), { addSuffix: false })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WinnerAnnouncement;
