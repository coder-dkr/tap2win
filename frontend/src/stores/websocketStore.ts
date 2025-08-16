import { create } from 'zustand';
import type { WebSocketMessage, AuctionStateMessage, NewBidMessage, NotificationMessage, Bid } from '../types';
import { useAuthStore } from './authStore';
import { tokenService } from '../utils/cookies';

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  clientId: string | null;
  currentAuctionId: string | null;
  auctionState: {
    highestBid?: Bid;
    bidCount: number;
    participantCount: number;
  } | null;
  notifications: NotificationMessage[];
}

interface WebSocketActions {
  connect: () => void;
  disconnect: () => void;
  joinAuction: (auctionId: string) => void;
  leaveAuction: (auctionId: string) => void;
  sendMessage: (message: WebSocketMessage) => void;
  addNotification: (notification: NotificationMessage) => void;
  clearNotifications: () => void;
  setAuctionState: (state: {
    highestBid?: Bid;
    bidCount: number;
    participantCount: number;
  } | null) => void;
  handleMessage: (message: WebSocketMessage) => void;
}

type WebSocketStore = WebSocketState & WebSocketActions;

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  // State
  socket: null,
  isConnected: false,
  isConnecting: false,
  clientId: null,
  currentAuctionId: null,
  auctionState: null,
  notifications: [],

  // Actions
  connect: () => {
    const { user } = useAuthStore.getState();
    if (!user || get().isConnected || get().isConnecting) return;

    set({ isConnecting: true });

    const token = tokenService.getToken();
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${token}`;
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connected');
      set({ 
        socket, 
        isConnected: true, 
        isConnecting: false 
      });
    };

    socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        get().handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      set({ 
        socket: null, 
        isConnected: false, 
        isConnecting: false,
        clientId: null,
        currentAuctionId: null,
        auctionState: null
      });
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (useAuthStore.getState().isAuthenticated) {
          get().connect();
        }
      }, 3000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      set({ 
        isConnecting: false,
        isConnected: false 
      });
    };
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
    }
    set({ 
      socket: null, 
      isConnected: false, 
      isConnecting: false,
      clientId: null,
      currentAuctionId: null,
      auctionState: null
    });
  },

  joinAuction: (auctionId: string) => {
    const { socket, isConnected } = get();
    if (!socket || !isConnected) return;

    set({ currentAuctionId: auctionId });
    
    socket.send(JSON.stringify({
      type: 'joinAuction',
      auctionId
    }));
  },

  leaveAuction: (auctionId: string) => {
    const { socket, isConnected, currentAuctionId } = get();
    if (!socket || !isConnected || currentAuctionId !== auctionId) return;

    socket.send(JSON.stringify({
      type: 'leaveAuction',
      auctionId
    }));

    set({ 
      currentAuctionId: null,
      auctionState: null
    });
  },

  sendMessage: (message: WebSocketMessage) => {
    const { socket, isConnected } = get();
    if (!socket || !isConnected) return;

    socket.send(JSON.stringify(message));
  },

  addNotification: (notification: NotificationMessage) => {
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50) // Keep last 50 notifications
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },

  setAuctionState: (state: {
    highestBid?: Bid;
    bidCount: number;
    participantCount: number;
  } | null) => {
    set({ auctionState: state });
  },

  // Internal message handler
  handleMessage: (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        set({ clientId: message.clientId as string });
        break;

      case 'auctionState':
        set({ auctionState: message as AuctionStateMessage });
        break;

      case 'newAuction': {
        // ✅ REAL-TIME: Handle new auction creation
        const newAuctionMessage = message as unknown as { auction: { id: string; title: string; startingPrice: number } };
        get().addNotification({
          id: `new-auction-${Date.now()}`,
          type: 'notification',
          notificationType: 'newAuction',
          title: 'New Auction Available',
          message: `New auction: ${newAuctionMessage.auction.title} - Starting at $${newAuctionMessage.auction.startingPrice}`,
          timestamp: new Date().toISOString(),
          auctionId: newAuctionMessage.auction.id,
          isRead: false
        });
        break;
      }

      case 'newBid': {
        // Update auction state with new bid
        const newBidMessage = message as NewBidMessage;
        set((state) => ({
          auctionState: state.auctionState ? {
            ...state.auctionState,
            highestBid: newBidMessage.bid,
            bidCount: newBidMessage.auction.bidCount
          } : null
        }));
        
        // Add notification for new bid
        get().addNotification({
          id: `bid-${Date.now()}`,
          type: 'notification',
          notificationType: 'newBid',
          title: 'New Bid Placed',
          message: `A new bid of $${newBidMessage.bid.amount} was placed on the auction`,
          timestamp: new Date().toISOString(),
          auctionId: newBidMessage.auction.id,
          isRead: false
        });
        break;
      }

      case 'outbid': {
        // Add notification for outbid
        get().addNotification({
          id: `outbid-${Date.now()}`,
          type: 'notification',
          notificationType: 'outbid',
          title: 'You\'ve Been Outbid',
          message: `Someone placed a higher bid on the auction`,
          timestamp: new Date().toISOString(),
          auctionId: message.auctionId as string,
          isRead: false
        });
        break;
      }

      case 'auctionEnded': {
        // Add notification for auction ended
        get().addNotification({
          id: `ended-${Date.now()}`,
          type: 'notification',
          notificationType: 'auctionEnded',
          title: 'Auction Ended',
          message: `The auction has ended`,
          timestamp: new Date().toISOString(),
          auctionId: message.auctionId as string,
          isRead: false
        });
        break;
      }

      case 'notification':
        get().addNotification(message as NotificationMessage);
        break;

      case 'userJoined':
      case 'userLeft':
        // Update participant count
        set((state) => ({
          auctionState: state.auctionState ? {
            ...state.auctionState,
            participantCount: message.participantCount as number
          } : null
        }));
        break;

      case 'auctionUpdate':
        set({ auctionState: message as AuctionStateMessage });
        break;

      case 'auctionCompleted': {
        // ✅ REAL-TIME: Handle auction completion events
        const title = message.decision === 'accepted' ? 'Auction Won!' : 
                     message.decision === 'rejected' ? 'Auction Ended' :
                     message.decision === 'counter_offer_accepted' ? 'Counter Offer Accepted!' :
                     message.decision === 'counter_offer_rejected' ? 'Counter Offer Rejected' :
                     'Auction Completed';
                     
        const messageText = message.decision === 'accepted' ? 
                           `Congratulations! You won with a bid of $${message.finalPrice}` :
                           message.decision === 'rejected' ? 
                           'The seller did not accept the highest bid' :
                           message.decision === 'counter_offer_accepted' ?
                           `Counter offer of $${message.finalPrice} was accepted!` :
                           message.decision === 'counter_offer_rejected' ?
                           'Counter offer was rejected' :
                           'The auction has been completed';

        const completedMessage = message as unknown as { auctionId: string; decision: string; finalPrice: number };
        get().addNotification({
          id: `auction-completed-${Date.now()}`,
          type: 'notification',
          notificationType: 'auctionCompleted',
          title,
          message: messageText,
          timestamp: new Date().toISOString(),
          auctionId: completedMessage.auctionId,
          isRead: false
        });
        break;
      }

      case 'winnerAnnouncement': {
        // ✅ REAL-TIME: Handle winner announcements
        const winnerMessage = message as unknown as { 
          winner: { username: string }; 
          auctionTitle: string; 
          winningAmount: number; 
          auctionId: string 
        };
        get().addNotification({
          id: `winner-${Date.now()}`,
          type: 'notification',
          notificationType: 'winnerAnnouncement',
          title: 'Auction Winner!',
          message: `${winnerMessage.winner.username} won "${winnerMessage.auctionTitle}" for $${winnerMessage.winningAmount}`,
          timestamp: new Date().toISOString(),
          auctionId: winnerMessage.auctionId,
          isRead: false
        });
        break;
      }

      case 'systemActivity': {
        // ✅ REAL-TIME: Handle system activity for activity feeds
        // This can be used by admin panel or dashboard for live activity updates
        console.log('System Activity:', message.message);
        break;
      }

      case 'pong':
        // Handle pong response
        break;

      case 'error':
        console.error('WebSocket error message:', message.message);
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  },
}));
