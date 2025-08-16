// User types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'buyer' | 'seller' | 'admin';
  isActive: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Auction types
export interface Auction {
  id: string;
  title: string;
  description: string;
  startingPrice: number;
  currentPrice?: number;
  bidIncrement: number;
  startTime: string;
  endTime: string;
  status: 'pending' | 'active' | 'ended' | 'completed' | 'cancelled';
  images: string[];
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  sellerDecision?: 'pending' | 'accepted' | 'rejected' | 'counter_offered';
  counterOfferAmount?: number;
  counterOfferStatus?: 'pending' | 'accepted' | 'rejected';
  finalPrice?: number;
  completedAt?: string;
  sellerId: string;
  winnerId?: string;
  highestBidId?: string;
  seller?: User;
  winner?: User;
  highestBid?: Bid;
  bidCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Bid types
export interface Bid {
  id: string;
  amount: number;
  isWinning: boolean;
  bidTime: string;
  status: 'active' | 'outbid' | 'winning' | 'lost';
  auctionId: string;
  bidderId: string;
  bidder?: User;
  auction?: Auction;
  createdAt: string;
  updatedAt: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'new_bid' | 'outbid' | 'auction_won' | 'auction_ended' | 'bid_accepted' | 'bid_rejected' | 'counter_offer' | 'counter_offer_accepted' | 'counter_offer_rejected' | 'auction_started' | 'auction_ending_soon';
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuctionListResponse {
  auctions: Auction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BidListResponse {
  bids: Bid[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface AuctionStateMessage extends WebSocketMessage {
  type: 'auctionState';
  auctionId: string;
  highestBid?: Bid;
  bidCount: number;
  participantCount: number;
}

export interface NewBidMessage extends WebSocketMessage {
  type: 'newBid';
  bid: Bid;
  auction: {
    id: string;
    currentPrice: number;
    bidCount: number;
  };
}

export interface NotificationMessage extends WebSocketMessage {
  type: 'notification';
  id: string;
  notificationType: 'newBid' | 'outbid' | 'auctionEnded' | 'bidAccepted' | 'bidRejected' | 'counterOffer' | 'newAuction' | 'auctionCompleted' | 'auctionCreated' | 'counterOfferSent' | 'counterOfferAccepted' | 'counterOfferRejected' | 'newUserRegistered' | 'auctionWon' | 'winnerAnnouncement';
  title: string;
  message: string;
  timestamp: string;
  auctionId?: string;
  isRead: boolean;
}

// Real-time auction update types
export interface NewAuctionMessage extends WebSocketMessage {
  type: 'newAuction';
  auction: Auction;
}

export interface AuctionUpdateMessage extends WebSocketMessage {
  type: 'auctionUpdate';
  auction: Auction;
}

export interface AuctionEndedMessage extends WebSocketMessage {
  type: 'auctionEnded';
  auctionId: string;
  auctionTitle: string;
}

export interface RealTimeBidMessage extends WebSocketMessage {
  type: 'newBid';
  auctionId: string;
  bid: Bid;
  auction: Auction;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string; // Optional - only used for frontend validation
  firstName: string;
  lastName: string;
  role: 'buyer' | 'seller';
}

export interface CreateAuctionForm {
  title: string;
  description: string;
  startingPrice: number;
  bidIncrement: number;
  startTime: string;
  endTime: string;
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  images: string[];
}

export interface PlaceBidForm {
  amount: number;
}

export interface SellerDecisionForm {
  decision: 'accept' | 'reject' | 'counter_offer';
  counterOfferAmount?: number;
}

export interface CounterOfferResponseForm {
  response: 'accept' | 'reject';
}

// Filter and search types
export interface AuctionFilters {
  status?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  status?: string;
  sortOrder?: 'asc' | 'desc';
}

// Profile and user update types
export interface UpdateProfileForm {
  firstName?: string;
  lastName?: string;
  username?: string;
  avatar?: string;
  role?: 'buyer' | 'seller' | 'admin';
}

export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Search and query types
export interface SearchParams {
  q?: string;
  category?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  sellerId?: string;
  startDate?: string;
  endDate?: string;
}

// Error types
export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  statusCode?: number;
}

// WebSocket connection types
export interface WebSocketConnection {
  isConnected: boolean;
  isConnecting: boolean;
  error?: string;
  reconnectAttempts: number;
}

// Dashboard statistics types
export interface DashboardStats {
  totalAuctions: number;
  activeAuctions: number;
  totalBids: number;
  totalRevenue: number;
  recentAuctions: Auction[];
  recentBids: Bid[];
}

// Admin types
export interface AdminStats {
  totalUsers: number;
  totalAuctions: number;
  activeAuctions: number;
  totalBids: number;
  totalRevenue: number;
  completedAuctions: number;
  pendingAuctions: number;
}

export interface SystemStatus {
  websocket: boolean;
  database: boolean;
  redis: boolean;
  emailService: boolean;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  userId?: string;
  auctionId?: string;
  data?: Record<string, unknown>;
}

// File upload types
export interface FileUpload {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

// Email and notification preferences
export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  bidNotifications: boolean;
  auctionNotifications: boolean;
  marketingEmails: boolean;
}
