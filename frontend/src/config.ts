// src/config.ts

// In production, call Render directly to avoid Vercel's proxy timeout
// when the Render free tier is waking up from sleep.
// In local development, hit the local backend directly.
export const API_URL = import.meta.env.PROD
  ? 'https://chemlab-kenya.onrender.com'
  : 'http://localhost:5000';
