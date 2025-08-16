import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { ApiResponse, PaginatedResponse, User, Auction, Bid, Notification } from '../types';
import { tokenService } from '../utils/cookies';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = tokenService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          tokenService.removeToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  private async request<T>(config: {
    method: string;
    url: string;
    data?: unknown;
    params?: Record<string, unknown>;
  }): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client(config);
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {
        return error.response.data as ApiResponse<T>;
      }
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request({
      method: 'POST',
      url: '/auth/login',
      data: { email, password },
    });
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'buyer' | 'seller';
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request({
      method: 'POST',
      url: '/auth/register',
      data: userData,
    });
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request({
      method: 'GET',
      url: '/auth/profile',
    });
  }

  async updateProfile(profileData: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    role?: 'buyer' | 'seller';
  }): Promise<ApiResponse<{ user: User }>> {
    return this.request({
      method: 'PUT',
      url: '/auth/profile',
      data: profileData,
    });
  }

  async changePassword(passwords: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse> {
    return this.request({
      method: 'PUT',
      url: '/auth/change-password',
      data: passwords,
    });
  }

  // Auction endpoints
  async getAuctions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<PaginatedResponse<Auction>>> {
    return this.request({
      method: 'GET',
      url: '/auctions',
      params,
    });
  }

  async getAuctionById(id: string): Promise<ApiResponse<{ auction: Auction }>> {
    return this.request({
      method: 'GET',
      url: `/auctions/${id}`,
    });
  }

  async createAuction(auctionData: {
    title: string;
    description: string;
    startingPrice: number;
    bidIncrement: number;
    startTime: string;
    endTime: string;
    category: string;
    condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
    images: string[];
  }): Promise<ApiResponse<{ auction: Auction }>> {
    return this.request({
      method: 'POST',
      url: '/auctions',
      data: auctionData,
    });
  }

  async updateAuction(id: string, auctionData: Partial<{
    title: string;
    description: string;
    startingPrice: number;
    bidIncrement: number;
    startTime: string;
    endTime: string;
    category: string;
    condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
    images: string[];
  }>): Promise<ApiResponse<{ auction: Auction }>> {
    return this.request({
      method: 'PUT',
      url: `/auctions/${id}`,
      data: auctionData,
    });
  }

  async deleteAuction(id: string): Promise<ApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/auctions/${id}`,
    });
  }

  async getMyAuctions(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<Auction>>> {
    return this.request({
      method: 'GET',
      url: '/auctions/user/my-auctions',
      params,
    });
  }

  // Bid endpoints
  async placeBid(auctionId: string, amount: number): Promise<ApiResponse<{ bid: Bid; auction: Auction }>> {
    return this.request({
      method: 'POST',
      url: `/auctions/${auctionId}/bids`,
      data: { amount },
    });
  }

  async getAuctionBids(auctionId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Bid>>> {
    return this.request({
      method: 'GET',
      url: `/auctions/${auctionId}/bids`,
      params,
    });
  }

  async getBidById(id: string): Promise<ApiResponse<{ bid: Bid }>> {
    return this.request({
      method: 'GET',
      url: `/bids/${id}`,
    });
  }

  async deleteBid(id: string): Promise<ApiResponse> {
    return this.request({
      method: 'DELETE',
      url: `/bids/${id}`,
    });
  }

  async getMyBids(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<Bid>>> {
    return this.request({
      method: 'GET',
      url: '/auctions/user/my-bids',
      params,
    });
  }

  // Seller decision endpoints
  async makeSellerDecision(auctionId: string, decision: {
    decision: 'accept' | 'reject' | 'counter_offer';
    counterOfferAmount?: number;
  }): Promise<ApiResponse<{ auction: Auction }>> {
    return this.request({
      method: 'POST',
      url: `/auctions/${auctionId}/decision`,
      data: decision,
    });
  }

  async respondToCounterOffer(auctionId: string, response: {
    response: 'accept' | 'reject';
  }): Promise<ApiResponse<{ auction: Auction }>> {
    return this.request({
      method: 'POST',
      url: `/auctions/${auctionId}/counter-offer-response`,
      data: response,
    });
  }

  // Notification endpoints
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
  }): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    return this.request({
      method: 'GET',
      url: '/notifications',
      params,
    });
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse> {
    return this.request({
      method: 'PUT',
      url: `/notifications/${id}/read`,
    });
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    return this.request({
      method: 'PUT',
      url: '/notifications/read-all',
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.request({
      method: 'GET',
      url: '/health',
    });
  }
}

export const api = new ApiClient();
export default api;
