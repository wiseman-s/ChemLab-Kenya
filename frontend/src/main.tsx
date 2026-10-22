import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { GuestLimitsProvider } from './contexts/GuestLimitsContext';

// Silence console.log in production
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Recover from stale chunk errors after a deploy.
// When a tab holds old HTML and tries to load a deleted chunk, reload once.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'chemlab-chunk-reload';
  const last = Number(sessionStorage.getItem(key) || 0);
  if (Date.now() - last < 10_000) return; // prevent reload loop
  sessionStorage.setItem(key, String(Date.now()));
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <GuestLimitsProvider>
        <App />
      </GuestLimitsProvider>
    </AuthProvider>
  </React.StrictMode>
);
