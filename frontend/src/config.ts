// src/config.ts

// In production, use a relative path so Vercel proxies API requests
// to the Render backend — the browser only ever sees chemlab.co.ke.
// In local development, hit the local backend directly.
export const API_URL = import.meta.env.PROD ? '' : 'http://localhost:5000';
