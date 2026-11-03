/**
 * Secure Environment Configuration
 * Centralizes all environment variable access with validation
 */

const getEnvVar = (key, defaultValue = '') => {
  const value = import.meta.env[key];
  
  // In production, ensure critical env vars are set
  if (import.meta.env.PROD && !value && !defaultValue) {
    console.error(`Missing required environment variable: ${key}`);
  }
  
  return value || defaultValue;
};

// Validate URL format
const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Get API URL with validation
export const getApiUrl = () => {
  const apiUrl = getEnvVar('VITE_API_URL', 'http://localhost:5000/api');
  
  if (!validateUrl(apiUrl)) {
    console.error('Invalid API URL format:', apiUrl);
    return 'http://localhost:5000/api';
  }
  
  return apiUrl;
};

// Get base URL without /api suffix
export const getBaseUrl = () => {
  const apiUrl = getApiUrl();
  return apiUrl.replace(/\/api\/?$/, '');
};

// Check if in development mode
export const isDevelopment = () => {
  return import.meta.env.DEV || getApiUrl().includes('localhost');
};

// Check if in production mode
export const isProduction = () => {
  return import.meta.env.PROD && !getApiUrl().includes('localhost');
};

// Secure console logging (disabled in production)
export const secureLog = (...args) => {
  if (isDevelopment()) {
    console.log(...args);
  }
};

// Export environment config
export const env = {
  apiUrl: getApiUrl(),
  baseUrl: getBaseUrl(),
  isDev: isDevelopment(),
  isProd: isProduction(),
};

export default env;
