import Cookies from 'js-cookie';

// Cookie configuration
const COOKIE_CONFIG = {
  expires: 7, // 7 days
  secure: import.meta.env.PROD, // HTTPS only in production
  sameSite: 'strict' as const,
  path: '/'
};

// Cookie keys
export const COOKIE_KEYS = {
  AUTH_TOKEN: 'tap2win_auth_token',
  USER_DATA: 'tap2win_user_data',
  THEME: 'tap2win_theme',
  LANGUAGE: 'tap2win_language'
} as const;

// Token management
export const tokenService = {
  getToken: (): string | undefined => {
    return Cookies.get(COOKIE_KEYS.AUTH_TOKEN);
  },

  setToken: (token: string): void => {
    Cookies.set(COOKIE_KEYS.AUTH_TOKEN, token, COOKIE_CONFIG);
  },

  removeToken: (): void => {
    Cookies.remove(COOKIE_KEYS.AUTH_TOKEN, { path: '/' });
  },

  hasToken: (): boolean => {
    return !!Cookies.get(COOKIE_KEYS.AUTH_TOKEN);
  }
};

// User data management
export const userDataService = {
  getUserData: (): any => {
    const userData = Cookies.get(COOKIE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  },

  setUserData: (userData: any): void => {
    Cookies.set(COOKIE_KEYS.USER_DATA, JSON.stringify(userData), COOKIE_CONFIG);
  },

  removeUserData: (): void => {
    Cookies.remove(COOKIE_KEYS.USER_DATA, { path: '/' });
  },

  hasUserData: (): boolean => {
    return !!Cookies.get(COOKIE_KEYS.USER_DATA);
  }
};

// Theme management
export const themeService = {
  getTheme: (): string => {
    return Cookies.get(COOKIE_KEYS.THEME) || 'light';
  },

  setTheme: (theme: string): void => {
    Cookies.set(COOKIE_KEYS.THEME, theme, COOKIE_CONFIG);
  }
};

// Language management
export const languageService = {
  getLanguage: (): string => {
    return Cookies.get(COOKIE_KEYS.LANGUAGE) || 'en';
  },

  setLanguage: (language: string): void => {
    Cookies.set(COOKIE_KEYS.LANGUAGE, language, COOKIE_CONFIG);
  }
};

// Clear all app cookies
export const clearAllCookies = (): void => {
  Object.values(COOKIE_KEYS).forEach(key => {
    Cookies.remove(key, { path: '/' });
  });
};

// Check if cookies are supported
export const isCookiesSupported = (): boolean => {
  try {
    Cookies.set('test', 'test');
    Cookies.remove('test');
    return true;
  } catch {
    return false;
  }
};
