import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { GuestLimitsProvider } from './contexts/GuestLimitsContext';

// Silence console.log in production — keeps the browser console clean for
// visitors, while preserving logs during local development.
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <GuestLimitsProvider>
        <App />
      </GuestLimitsProvider>
    </AuthProvider>
  </React.StrictMode>
);
