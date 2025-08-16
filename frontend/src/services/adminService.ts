import axios from 'axios';
import type { AdminStats, Auction, User, AuctionListResponse, UserListResponse } from '../types';
import { tokenService } from '../utils/cookies';

const API_BASE = '/api/admin';

// Create axios instance with auth interceptor
const adminApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
adminApi.interceptors.request.use(
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

// Admin Statistics
export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await adminApi.get('/stats');
  return response.data.data;
};

// Auction Management
export const getAllAuctions = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<AuctionListResponse> => {
  const response = await adminApi.get('/auctions', { params });
  return response.data.data;
};

export const startAuction = async (auctionId: string) => {
  const response = await adminApi.post(`/auctions/${auctionId}/start`);
  return response.data;
};

export const endAuction = async (auctionId: string) => {
  const response = await adminApi.post(`/auctions/${auctionId}/end`);
  return response.data;
};

export const resetAuction = async (auctionId: string) => {
  const response = await adminApi.post(`/auctions/${auctionId}/reset`);
  return response.data;
};

export const updateAuction = async (auctionId: string, data: Partial<Auction>) => {
  const response = await adminApi.put(`/auctions/${auctionId}`, data);
  return response.data;
};

export const deleteAuction = async (auctionId: string) => {
  const response = await adminApi.delete(`/auctions/${auctionId}`);
  return response.data;
};

// User Management
export const getAllUsers = async (params: {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}): Promise<UserListResponse> => {
  const response = await adminApi.get('/users', { params });
  return response.data.data;
};

export const getUserById = async (userId: string) => {
  const response = await adminApi.get(`/users/${userId}`);
  return response.data.data;
};

export const updateUser = async (userId: string, data: Partial<User>) => {
  const response = await adminApi.put(`/users/${userId}`, data);
  return response.data;
};

export const deleteUser = async (userId: string) => {
  const response = await adminApi.delete(`/users/${userId}`);
  return response.data;
};

// System Monitoring
export const getSystemStatus = async () => {
  const response = await adminApi.get('/monitoring');
  return response.data.data;
};

export const getRecentActivity = async () => {
  const response = await adminApi.get('/monitoring/activity');
  return response.data.data;
};
