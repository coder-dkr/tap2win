import axios from 'axios';
import type { AdminStats, Auction, User } from '../types';

const API_BASE = '/api/admin';

// Admin Statistics
export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await axios.get(`${API_BASE}/stats`);
  return response.data.data;
};

// Auction Management
export const getAllAuctions = async (params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) => {
  const response = await axios.get(`${API_BASE}/auctions`, { params });
  return response.data.data;
};

export const startAuction = async (auctionId: string) => {
  const response = await axios.post(`${API_BASE}/auctions/${auctionId}/start`);
  return response.data;
};

export const endAuction = async (auctionId: string) => {
  const response = await axios.post(`${API_BASE}/auctions/${auctionId}/end`);
  return response.data;
};

export const resetAuction = async (auctionId: string) => {
  const response = await axios.post(`${API_BASE}/auctions/${auctionId}/reset`);
  return response.data;
};

export const updateAuction = async (auctionId: string, data: Partial<Auction>) => {
  const response = await axios.put(`${API_BASE}/auctions/${auctionId}`, data);
  return response.data;
};

export const deleteAuction = async (auctionId: string) => {
  const response = await axios.delete(`${API_BASE}/auctions/${auctionId}`);
  return response.data;
};

// User Management
export const getAllUsers = async (params: {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}) => {
  const response = await axios.get(`${API_BASE}/users`, { params });
  return response.data.data;
};

export const getUserById = async (userId: string) => {
  const response = await axios.get(`${API_BASE}/users/${userId}`);
  return response.data.data;
};

export const updateUser = async (userId: string, data: Partial<User>) => {
  const response = await axios.put(`${API_BASE}/users/${userId}`, data);
  return response.data;
};

export const deleteUser = async (userId: string) => {
  const response = await axios.delete(`${API_BASE}/users/${userId}`);
  return response.data;
};

// System Monitoring
export const getSystemStatus = async () => {
  const response = await axios.get(`${API_BASE}/monitoring`);
  return response.data.data;
};

export const getRecentActivity = async () => {
  const response = await axios.get(`${API_BASE}/monitoring/activity`);
  return response.data.data;
};
