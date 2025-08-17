import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import type { Auction } from '../../types';
import { Trophy, CheckCircle, XCircle, DollarSign, User, Calendar, Clock } from 'lucide-react';
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
  onAcceptCounterOffer?: () => void;
  onRejectCounterOffer?: () => void;
}

const WinnerAnnouncement = ({
  auction,
  winningBid,
  onAcceptBid,
  onRejectBid,
  onCounterOffer,
  onAcceptCounterOffer,
  onRejectCounterOffer
}: WinnerAnnouncementProps) => {

  console.log("winningBid",winningBid)

  const { user } = useAuthStore();
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');

  const isSeller = user?.id === auction.sellerId;
  const isWinner = winningBid?.bidder?.id === user?.id;

  console.log("🔍 Winner check:", {
    winningBidId: winningBid?.id,
    bidderId: winningBid?.bidder?.id,
    userId: user?.id,
    isWinner: isWinner,
    winningBid: winningBid
  });
  
  // Calculate if auction has ended based on both status and time
  const isAuctionEnded = auction.status === 'ended' || auction.status === 'completed';
  
  const needsSellerDecision = isSeller && isAuctionEnded && (auction.sellerDecision === 'pending' || auction.sellerDecision === null);
  const sellerDecisionPending = isWinner && isAuctionEnded && (auction.sellerDecision === 'pending' || auction.sellerDecision === null);
  
  console.log("🔍 Auction data in WinnerAnnouncement:", {
    sellerDecision: auction.sellerDecision,
    status: auction.status,
    winnerId: auction.winnerId,
    isAuctionEnded: isAuctionEnded,
    needsSellerDecision: needsSellerDecision,
    sellerDecisionPending: sellerDecisionPending
  });
  const hasCounterOffer = auction.sellerDecision === 'counter_offered' && auction.counterOfferAmount;
  const isCounterOfferRecipient = isWinner && hasCounterOffer;
  
  // Check if counter offer decision has been made
  const counterOfferAccepted = auction.counterOfferStatus === 'accepted';
  const counterOfferRejected = auction.counterOfferStatus === 'rejected';
  const counterOfferDecisionMade = counterOfferAccepted || counterOfferRejected;



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

  // Safety check for winningBid structure
  if (!winningBid || !winningBid.bidder || !winningBid.bidder.id) {
    console.log('⚠️ Invalid winningBid structure:', winningBid);
    return (
      <div className="bg-white rounded-lg shadow-lg border-2 border-primary/20">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
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
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-center">
              <p className="text-gray-600">Loading winner information...</p>
            </div>
          </div>
        </div>
      </div>
    );
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

        {/* Winner Notification - Seller Decision Pending */}
        {sellerDecisionPending && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-yellow-500 mr-2" />
              <div>
                <h4 className="font-semibold text-yellow-800">Seller Decision Pending</h4>
                <p className="text-sm text-yellow-600">
                  The seller is reviewing your winning bid of ${winningBid?.amount}. You'll be notified once they make a decision.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Seller Decision Made - For Winner */}
        {isWinner && auction.sellerDecision === 'accepted' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <h4 className="font-semibold text-green-800">Congratulations! Your Bid Was Accepted</h4>
                <p className="text-sm text-green-600">
                  The seller has accepted your winning bid of ${winningBid?.amount}. The deal is complete!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Seller Decision Made - For Winner (Rejected) */}
        {isWinner && auction.sellerDecision === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <h4 className="font-semibold text-red-800">Bid Not Accepted</h4>
                <p className="text-sm text-red-600">
                  Unfortunately, the seller has not accepted your winning bid of ${winningBid?.amount}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Seller Decision Made - For Seller */}
        {isSeller && auction.sellerDecision === 'accepted' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <h4 className="font-semibold text-green-800">Auction Completed Successfully</h4>
                <p className="text-sm text-green-600">
                  You have accepted the winning bid of ${winningBid?.amount} by {winningBid?.bidder?.username}. The deal is complete!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Seller Decision Made - For Seller (Rejected) */}
        {isSeller && auction.sellerDecision === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <h4 className="font-semibold text-red-800">Auction Completed - Bid Rejected</h4>
                <p className="text-sm text-red-600">
                  You have rejected the winning bid of ${winningBid?.amount} by {winningBid?.bidder?.username}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Counter Offer Notification */}
        {isCounterOfferRecipient && !counterOfferDecisionMade && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-orange-500 mr-2" />
                <div>
                  <h4 className="font-semibold text-orange-800">Counter Offer Received</h4>
                  <p className="text-sm text-orange-600">
                    The seller has made a counter offer of ${auction.counterOfferAmount} for your winning bid of ${winningBid?.amount}.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-orange-600">
                  ${auction.counterOfferAmount}
                </div>
                <div className="text-xs text-orange-600">Counter Offer</div>
              </div>
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button
                onClick={onAcceptCounterOffer}
                className="btn btn-success flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Counter Offer
              </button>
              <button
                onClick={onRejectCounterOffer}
                className="btn btn-danger flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Counter Offer
              </button>
            </div>
          </div>
        )}

        {/* Counter Offer Decision Made - For Winner */}
        {counterOfferDecisionMade && isWinner && (
          <div className={`border rounded-lg p-4 ${counterOfferAccepted ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center">
              {counterOfferAccepted ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <div>
                <h4 className={`font-semibold ${counterOfferAccepted ? 'text-green-800' : 'text-red-800'}`}>
                  {counterOfferAccepted ? 'Counter Offer Accepted' : 'Counter Offer Rejected'}
                </h4>
                <p className={`text-sm ${counterOfferAccepted ? 'text-green-600' : 'text-red-600'}`}>
                  {counterOfferAccepted 
                    ? `You accepted the counter offer of $${auction.counterOfferAmount}. The deal is complete!`
                    : `You rejected the counter offer of $${auction.counterOfferAmount}. The auction is closed.`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Counter Offer Decision Made - For Seller */}
        {counterOfferDecisionMade && isSeller && (
          <div className={`border rounded-lg p-4 ${counterOfferAccepted ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center">
              {counterOfferAccepted ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <div>
                <h4 className={`font-semibold ${counterOfferAccepted ? 'text-green-800' : 'text-red-800'}`}>
                  {counterOfferAccepted ? 'Counter Offer Accepted' : 'Counter Offer Rejected'}
                </h4>
                <p className={`text-sm ${counterOfferAccepted ? 'text-green-600' : 'text-red-600'}`}>
                  {counterOfferAccepted 
                    ? `${winningBid?.bidder?.username} accepted your counter offer of $${auction.counterOfferAmount}. The deal is complete!`
                    : `${winningBid?.bidder?.username} rejected your counter offer of $${auction.counterOfferAmount}. The auction is closed.`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

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
