// Central place for the backend API URL.
//
// Local development: leave VITE_API_URL unset — it falls back to localhost:5000.
// Production: set VITE_API_URL in your .env.production (or your hosting
// provider's environment variable settings) to your deployed backend's
// public URL, e.g. https://api.chemlabkenya.com
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
