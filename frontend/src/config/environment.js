/**
 * Environment Configuration
 * Update this file or use environment variables for different environments
 * 
 * For production, set the environment variables:
 * REACT_APP_API_BASE_URL=https://your-production-api.com/api
 * REACT_APP_ENV=production
 */

const getBaseURL = () => {
  // Check environment variables first (highest priority)
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }

  // Fallback to localhost for development
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  return isDevelopment ? 'http://localhost:8080/api' : '/api';
};

export const config = {
  // API Configuration
  API: {
    BASE_URL: getBaseURL(),
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
  },

  // Application Environment
  ENV: process.env.REACT_APP_ENV || process.env.NODE_ENV || 'development',

  // Feature Flags
  FEATURES: {
    FACE_RECOGNITION: process.env.REACT_APP_FEATURE_FACE_RECOGNITION !== 'false',
    PDF_EXPORT: process.env.REACT_APP_FEATURE_PDF_EXPORT !== 'false',
    EXCEL_EXPORT: process.env.REACT_APP_FEATURE_EXCEL_EXPORT !== 'false',
    NOTIFICATIONS: process.env.REACT_APP_FEATURE_NOTIFICATIONS !== 'false',
  },

  // UI Configuration
  UI: {
    ITEMS_PER_PAGE: 10,
    TOAST_DURATION: 3000,
    ANIMATION_DURATION: 300,
  },

  // Session Configuration
  SESSION: {
    TOKEN_KEY: 'token',
    USER_KEY: 'user',
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  },

  // Logging
  LOGGING: {
    ENABLED: process.env.REACT_APP_LOGGING_ENABLED === 'true',
    LEVEL: process.env.REACT_APP_LOG_LEVEL || 'info', // debug, info, warn, error
  },
};

// Validate configuration
export const validateConfig = () => {
  if (!config.API.BASE_URL) {
    console.warn('⚠️ API Base URL is not configured');
  }
  return config;
};

export default config;
