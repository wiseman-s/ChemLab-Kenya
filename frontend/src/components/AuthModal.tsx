// frontend/src/components/AuthModal.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'login' | 'signup';

interface Props {
  initialTab?: Tab;
  onClose: () => void;
}

const AuthModal: React.FC<Props> = ({ initialTab = 'login', onClose }) => {
  const { login, signup } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (tab === 'signup') {
        await signup(email.trim(), password, fullName.trim());
      } else {
        await login(email.trim(), password);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '28px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#00695c', margin: 0 }}>ChemLab Kenya</h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', marginBottom: '20px' }}>
          {(['login', 'signup'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              style={{
                flex: 1,
                padding: '10px',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t ? '3px solid #00897b' : '3px solid transparent',
                color: tab === t ? '#00897b' : '#666',
                fontWeight: tab === t ? 700 : 500,
                cursor: 'pointer',
                fontSize: '15px',
              }}
            >
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          {tab === 'signup' && (
            <label style={{ display: 'block', marginBottom: '14px' }}>
              <span style={{ display: 'block', fontSize: '13px', color: '#444', marginBottom: '4px' }}>
                Full name
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={1}
                maxLength={100}
                style={inputStyle}
              />
            </label>
          )}

          <label style={{ display: 'block', marginBottom: '14px' }}>
            <span style={{ display: 'block', fontSize: '13px', color: '#444', marginBottom: '4px' }}>
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'block', marginBottom: '20px' }}>
            <span style={{ display: 'block', fontSize: '13px', color: '#444', marginBottom: '4px' }}>
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              style={inputStyle}
            />
            {tab === 'signup' && (
              <span style={{ display: 'block', fontSize: '11px', color: '#888', marginTop: '4px' }}>
                At least 8 characters, with a letter and a number.
              </span>
            )}
          </label>

          {error && (
            <div
              style={{
                padding: '10px',
                background: '#ffebee',
                border: '1px solid #ef9a9a',
                color: '#c62828',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '14px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '12px',
              background: submitting ? '#80cbc4' : '#00897b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Please wait...' : tab === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ccc',
  borderRadius: '6px',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
};

export default AuthModal;
