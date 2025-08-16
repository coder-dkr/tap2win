import { create } from 'zustand';
import type { Auction, Bid, AuctionFilters, PaginationParams, CreateAuctionForm, SellerDecisionForm, CounterOfferResponseForm } from '../types';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

interface AuctionState {
  // Auctions
  auctions: Auction[];
  currentAuction: Auction | null;
  myAuctions: Auction[];
  myBids: Bid[];
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isBidding: boolean;
  
  // Filters
  filters: AuctionFilters;
  
  // Actions
  fetchAuctions: (params?: PaginationParams & AuctionFilters) => Promise<void>;
  fetchAuctionById: (id: string) => Promise<void>;
  createAuction: (auctionData: CreateAuctionForm) => Promise<boolean>;
  placeBid: (auctionId: string, amount: number) => Promise<boolean>;
  fetchMyAuctions: (params?: PaginationParams) => Promise<void>;
  fetchMyBids: (params?: PaginationParams) => Promise<void>;
  updateAuction: (id: string, data: Partial<CreateAuctionForm>) => Promise<boolean>;
  deleteAuction: (id: string) => Promise<boolean>;
  makeSellerDecision: (auctionId: string, decision: SellerDecisionForm) => Promise<boolean>;
  respondToCounterOffer: (auctionId: string, response: CounterOfferResponseForm) => Promise<boolean>;
  setFilters: (filters: AuctionFilters) => void;
  clearFilters: () => void;
  setCurrentAuction: (auction: Auction | null) => void;
}

export const useAuctionStore = create<AuctionState>((set, get) => ({
  // Initial state
  auctions: [],
  currentAuction: null,
  myAuctions: [],
  myBids: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  isLoading: false,
  isCreating: false,
  isBidding: false,
  filters: {},

  // Actions
  fetchAuctions: async (params = {}) => {
    try {
      set({ isLoading: true });
      const response = await api.getAuctions({
        page: params.page || 1,
        limit: params.limit || 10,
        status: params.status,
        category: params.category,
        search: params.search,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      });

      if (response.success && response.data) {
        set({
          auctions: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        });
      } else {
        toast.error(response.message || 'Failed to fetch auctions');
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching auctions:', error);
      toast.error('Failed to fetch auctions');
      set({ isLoading: false });
    }
  },

  fetchAuctionById: async (id: string) => {
    try {
      set({ isLoading: true });
      const response = await api.getAuctionById(id);

      if (response.success && response.data) {
        set({
          currentAuction: response.data.auction,
          isLoading: false,
        });
      } else {
        toast.error(response.message || 'Failed to fetch auction');
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching auction:', error);
      toast.error('Failed to fetch auction');
      set({ isLoading: false });
    }
  },

  createAuction: async (auctionData) => {
    try {
      set({ isCreating: true });
      const response = await api.createAuction(auctionData);

      if (response.success && response.data) {
        toast.success('Auction created successfully!');
        set({ isCreating: false });
        return true;
      } else {
        toast.error(response.message || 'Failed to create auction');
        set({ isCreating: false });
        return false;
      }
    } catch (error) {
      console.error('Error creating auction:', error);
      toast.error('Failed to create auction');
      set({ isCreating: false });
      return false;
    }
  },

  placeBid: async (auctionId: string, amount: number) => {
    try {
      set({ isBidding: true });
      const response = await api.placeBid(auctionId, amount);

      if (response.success && response.data) {
        // Update current auction with new bid data
        const { currentAuction } = get();
        if (currentAuction && currentAuction.id === auctionId) {
          set({
            currentAuction: {
              ...currentAuction,
              currentPrice: response.data.auction.currentPrice,
            },
            isBidding: false,
          });
        }
        
        toast.success('Bid placed successfully!');
        return true;
      } else {
        toast.error(response.message || 'Failed to place bid');
        set({ isBidding: false });
        return false;
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      toast.error('Failed to place bid');
      set({ isBidding: false });
      return false;
    }
  },

  fetchMyAuctions: async (params = {}) => {
    try {
      set({ isLoading: true });
      const response = await api.getMyAuctions({
        page: params.page || 1,
        limit: params.limit || 10,
        status: params.status,
      });

      if (response.success && response.data) {
        set({
          myAuctions: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        });
      } else {
        toast.error(response.message || 'Failed to fetch your auctions');
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching my auctions:', error);
      toast.error('Failed to fetch your auctions');
      set({ isLoading: false });
    }
  },

  fetchMyBids: async (params = {}) => {
    try {
      set({ isLoading: true });
      const response = await api.getMyBids({
        page: params.page || 1,
        limit: params.limit || 10,
      });

      if (response.success && response.data) {
        set({
          myBids: response.data.data,
          pagination: response.data.pagination,
          isLoading: false,
        });
      } else {
        toast.error(response.message || 'Failed to fetch your bids');
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error fetching my bids:', error);
      toast.error('Failed to fetch your bids');
      set({ isLoading: false });
    }
  },

  updateAuction: async (id: string, data: Partial<CreateAuctionForm>) => {
    try {
      set({ isLoading: true });
      const response = await api.updateAuction(id, data);

      if (response.success && response.data) {
        // Update auctions list
        const { auctions, myAuctions } = get();
        const updatedAuction = response.data.auction;
        
        set({
          auctions: auctions.map(auction => 
            auction.id === id ? updatedAuction : auction
          ),
          myAuctions: myAuctions.map(auction => 
            auction.id === id ? updatedAuction : auction
          ),
          isLoading: false,
        });
        
        toast.success('Auction updated successfully!');
        return true;
      } else {
        toast.error(response.message || 'Failed to update auction');
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      console.error('Error updating auction:', error);
      toast.error('Failed to update auction');
      set({ isLoading: false });
      return false;
    }
  },

  deleteAuction: async (id: string) => {
    try {
      set({ isLoading: true });
      const response = await api.deleteAuction(id);

      if (response.success) {
        // Remove from auctions list
        const { auctions, myAuctions } = get();
        
        set({
          auctions: auctions.filter(auction => auction.id !== id),
          myAuctions: myAuctions.filter(auction => auction.id !== id),
          isLoading: false,
        });
        
        toast.success('Auction deleted successfully!');
        return true;
      } else {
        toast.error(response.message || 'Failed to delete auction');
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      console.error('Error deleting auction:', error);
      toast.error('Failed to delete auction');
      set({ isLoading: false });
      return false;
    }
  },

  makeSellerDecision: async (auctionId: string, decision: SellerDecisionForm) => {
    try {
      set({ isLoading: true });
      const response = await api.makeSellerDecision(auctionId, decision);

      if (response.success && response.data) {
        // Update current auction
        const { currentAuction } = get();
        if (currentAuction && currentAuction.id === auctionId) {
          set({
            currentAuction: response.data.auction,
            isLoading: false,
          });
        }
        
        toast.success('Decision made successfully!');
        return true;
      } else {
        toast.error(response.message || 'Failed to make decision');
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      console.error('Error making seller decision:', error);
      toast.error('Failed to make decision');
      set({ isLoading: false });
      return false;
    }
  },

  respondToCounterOffer: async (auctionId: string, response: CounterOfferResponseForm) => {
    try {
      set({ isLoading: true });
      const apiResponse = await api.respondToCounterOffer(auctionId, response);

      if (apiResponse.success && apiResponse.data) {
        // Update current auction
        const { currentAuction } = get();
        if (currentAuction && currentAuction.id === auctionId) {
          set({
            currentAuction: apiResponse.data.auction,
            isLoading: false,
          });
        }
        
        toast.success('Response sent successfully!');
        return true;
      } else {
        toast.error(apiResponse.message || 'Failed to respond to counter offer');
        set({ isLoading: false });
        return false;
      }
    } catch (error) {
      console.error('Error responding to counter offer:', error);
      toast.error('Failed to respond to counter offer');
      set({ isLoading: false });
      return false;
    }
  },

  setFilters: (filters: AuctionFilters) => {
    set({ filters });
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  setCurrentAuction: (auction: Auction | null) => {
    set({ currentAuction: auction });
  },
}));
