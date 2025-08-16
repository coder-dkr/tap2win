import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import api from '../lib/api';
import { tokenService, userDataService } from '../utils/cookies';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'buyer' | 'seller';
  }) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (profileData: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    role?: 'buyer' | 'seller';
  }) => Promise<boolean>;
  changePassword: (passwords: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<boolean>;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // State
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      // Actions
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          const response = await api.login(email, password);
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            tokenService.setToken(token);
            userDataService.setUserData(user);
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } else {
            set({ isLoading: false });
            return false;
          }
        } catch (error) {
          set({ isLoading: false });
          console.error('Login error:', error);
          return false;
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true });
          const response = await api.register(userData);
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            tokenService.setToken(token);
            userDataService.setUserData(user);
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } else {
            set({ isLoading: false });
            return false;
          }
        } catch (error) {
          set({ isLoading: false });
          console.error('Register error:', error);
          return false;
        }
      },

      logout: () => {
        tokenService.removeToken();
        userDataService.removeUserData();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      checkAuth: async () => {
        const token = tokenService.getToken();
        const userData = userDataService.getUserData();
        
        if (!token) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        try {
          set({ isLoading: true });
          
          // Try to use cached user data first
          if (userData) {
            set({
              user: userData,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
          
          const response = await api.getProfile();
          
          if (response.success && response.data) {
            set({
              user: response.data.user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Token is invalid, clear auth state
            tokenService.removeToken();
            userDataService.removeUserData();
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          tokenService.removeToken();
          userDataService.removeUserData();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      updateProfile: async (profileData) => {
        try {
          set({ isLoading: true });
          const response = await api.updateProfile(profileData);
          
          if (response.success && response.data) {
            set({
              user: response.data.user,
              isLoading: false,
            });
            return true;
          } else {
            set({ isLoading: false });
            return false;
          }
        } catch (error) {
          set({ isLoading: false });
          console.error('Update profile error:', error);
          return false;
        }
      },

      changePassword: async (passwords) => {
        try {
          set({ isLoading: true });
          const response = await api.changePassword(passwords);
          set({ isLoading: false });
          return response.success;
        } catch (error) {
          set({ isLoading: false });
          console.error('Change password error:', error);
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
