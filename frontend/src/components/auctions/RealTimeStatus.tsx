import { useEffect, useState } from 'react';
import { useWebSocketStore } from '../../stores/websocketStore';
import type { Auction } from '../../types';
import { Users, DollarSign, Clock, TrendingUp, Wifi, WifiOff } from 'lucide-react';

interface RealTimeStatusProps {
  auction: Auction;
}

const RealTimeStatus = ({ auction }: RealTimeStatusProps) => {
  const { isConnected, auctionState } = useWebSocketStore();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getTimeRemaining = () => {
    const end = new Date(auction.endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return { ended: true, text: 'Auction Ended' };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return { ended: false, text: `${days}d ${hours}h ${minutes}m` };
    if (hours > 0) return { ended: false, text: `${hours}h ${minutes}m ${seconds}s` };
    if (minutes > 0) return { ended: false, text: `${minutes}m ${seconds}s` };
    return { ended: false, text: `${seconds}s` };
  };

  const timeInfo = getTimeRemaining();
  const isUrgent = !timeInfo.ended && timeInfo.text.includes('m') && parseInt(timeInfo.text) < 5;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Live Auction Status</h3>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Time Remaining */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Time Remaining</span>
          <Clock className="h-4 w-4 text-gray-400" />
        </div>
        <div className={`text-2xl font-bold mt-1 ${
          timeInfo.ended 
            ? 'text-red-600' 
            : isUrgent 
              ? 'text-red-500' 
              : 'text-primary'
        }`}>
          {timeInfo.text}
        </div>
        {!timeInfo.ended && (
          <div className="text-xs text-gray-500 mt-1">
            Ends {new Date(auction.endTime).toLocaleString()}
          </div>
        )}
      </div>

      {/* Current Price */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Current Price</span>
          <DollarSign className="h-4 w-4 text-gray-400" />
        </div>
        <div className="text-2xl font-bold text-primary mt-1">
          ${auction.currentPrice || auction.startingPrice}
        </div>
        {auction.currentPrice && auction.currentPrice > auction.startingPrice && (
          <div className="flex items-center text-xs text-green-600 mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            +${(auction.currentPrice - auction.startingPrice).toFixed(2)} from starting price
          </div>
        )}
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Bids</span>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {auctionState?.bidCount || auction.bidCount || 0}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Participants</span>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {auctionState?.participantCount || 0}
          </div>
        </div>
      </div>

      {/* Last Update */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last updated</span>
          <span>{lastUpdate.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mt-3 flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
        <span className="text-xs text-gray-500">
          {isConnected ? 'Real-time updates active' : 'Connection lost'}
        </span>
      </div>
    </div>
  );
};

export default RealTimeStatus;
