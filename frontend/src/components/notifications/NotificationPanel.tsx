import { useState } from 'react';
import { useWebSocketStore } from '../../stores/websocketStore';
// import type { NotificationMessage } from '../../types';
import { Bell, X, CheckCircle, AlertTriangle, DollarSign, Clock, Gavel, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationPanel = () => {
  const { notifications, clearNotifications } = useWebSocketStore();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (notificationType: string) => {
    switch (notificationType) {
      case 'newBid':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'outbid':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'auctionEnded':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'bidAccepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'bidRejected':
        return <X className="h-5 w-5 text-red-500" />;
      case 'counterOffer':
        return <Gavel className="h-5 w-5 text-yellow-500" />;
      case 'newAuction':
        return <Gavel className="h-5 w-5 text-blue-500" />;
      case 'auctionCompleted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'auctionCreated':
        return <Gavel className="h-5 w-5 text-green-500" />;
      case 'counterOfferSent':
        return <Gavel className="h-5 w-5 text-blue-500" />;
      case 'counterOfferAccepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'counterOfferRejected':
        return <X className="h-5 w-5 text-red-500" />;
      case 'newUserRegistered':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'auctionWon':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'winnerAnnouncement':
        return <Gavel className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // const getNotificationColor = (notificationType: string) => {
  //   switch (notificationType) {
  //     case 'newBid':
  //       return 'bg-green-50 border-green-200';
  //     case 'outbid':
  //       return 'bg-red-50 border-red-200';
  //     case 'auctionEnded':
  //       return 'bg-blue-50 border-blue-200';
  //     case 'bidAccepted':
  //       return 'bg-green-50 border-green-200';
  //     case 'bidRejected':
  //       return 'bg-red-50 border-red-200';
  //     case 'counterOffer':
  //       return 'bg-yellow-50 border-yellow-200';
  //     case 'newAuction':
  //       return 'bg-blue-50 border-blue-200';
  //     case 'auctionCompleted':
  //       return 'bg-green-50 border-green-200';
  //     case 'auctionCreated':
  //       return 'bg-green-50 border-green-200';
  //     case 'counterOfferSent':
  //       return 'bg-blue-50 border-blue-200';
  //     case 'counterOfferAccepted':
  //       return 'bg-green-50 border-green-200';
  //     case 'counterOfferRejected':
  //       return 'bg-red-50 border-red-200';
  //     case 'newUserRegistered':
  //       return 'bg-blue-50 border-blue-200';
  //     case 'auctionWon':
  //       return 'bg-green-50 border-green-200';
  //     case 'winnerAnnouncement':
  //       return 'bg-purple-50 border-purple-200';
  //     default:
  //       return 'bg-gray-50 border-gray-200';
  //   }
  // };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification, index) => (
                  <div
                    key={index}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.notificationType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {notification.auctionId && (
                          <button
                            onClick={() => {
                              // Navigate to auction
                              window.location.href = `/auctions/${notification.auctionId}`;
                            }}
                            className="text-xs text-primary hover:text-primary-dark mt-2"
                          >
                            View Auction →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={clearNotifications}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationPanel;
