// frontend/src/components/AuthModal.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { forgotPassword } from '../utils/authApi';

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

  // Forgot password flow
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

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

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotSubmitting(true);
    try {
      await forgotPassword(forgotEmail.trim());
      setForgotSent(true);
    } catch (err) {
      setError((err as Error).message || 'Something went wrong');
    } finally {
      setForgotSubmitting(false);
    }
  };

  // Forgot password view
  if (forgotMode) {
    return (
      <div
        style={overlayStyle}
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#00695c', margin: 0 }}>Forgot Password</h2>
            <button onClick={onClose} style={closeBtnStyle} aria-label="Close">×</button>
          </div>

          {forgotSent ? (
            <div>
              <div style={{ padding: '16px', background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '6px', color: '#2e7d32', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📧</div>
                <strong>Check your email</strong>
                <div style={{ fontSize: '13px', marginTop: '6px' }}>
                  If <strong>{forgotEmail}</strong> is registered, you'll receive a reset link within a minute.
                </div>
              </div>
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); }}
                style={{
                  marginTop: '16px', width: '100%', padding: '10px',
                  background: 'transparent', border: 'none', color: '#00897b',
                  fontSize: '14px', cursor: 'pointer', fontWeight: 600,
                }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={submitForgot}>
              <p style={{ color: '#666', fontSize: '14px', marginTop: 0, marginBottom: '20px' }}>
                Enter your email and we'll send you a link to reset your password.
              </p>
              <label style={{ display: 'block', marginBottom: '20px' }}>
                <span style={{ display: 'block', fontSize: '13px', color: '#444', marginBottom: '4px' }}>Email</span>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoComplete="email"
                  style={inputStyle}
                />
              </label>

              {error && <div style={errorStyle}>{error}</div>}

              <button type="submit" disabled={forgotSubmitting} style={primaryBtnStyle(forgotSubmitting)}>
                {forgotSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => { setForgotMode(false); setError(null); }}
                style={{ marginTop: '10px', width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#888', fontSize: '14px', cursor: 'pointer' }}
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#00695c', margin: 0 }}>ChemLab Kenya</h2>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Close">×</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', marginBottom: '20px' }}>
          {(['login', 'signup'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              style={{
                flex: 1, padding: '10px', background: 'transparent', border: 'none',
                borderBottom: tab === t ? '3px solid #00897b' : '3px solid transparent',
                color: tab === t ? '#00897b' : '#666',
                fontWeight: tab === t ? 700 : 500,
                cursor: 'pointer', fontSize: '15px',
              }}
            >
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          {tab === 'signup' && (
            <label style={labelStyle}>
              <span style={labelTextStyle}>Full name</span>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={1} maxLength={100} style={inputStyle} />
            </label>
          )}

          <label style={labelStyle}>
            <span style={labelTextStyle}>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" style={inputStyle} />
          </label>

          <label style={{ display: 'block', marginBottom: '20px' }}>
            <span style={labelTextStyle}>Password</span>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8}
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              style={inputStyle}
            />
            {tab === 'signup' && (
              <span style={{ display: 'block', fontSize: '11px', color: '#888', marginTop: '4px' }}>
                At least 8 characters, with a letter and a number.
              </span>
            )}
          </label>

          {error && <div style={errorStyle}>{error}</div>}

          <button type="submit" disabled={submitting} style={primaryBtnStyle(submitting)}>
            {submitting ? 'Please wait...' : tab === 'signup' ? 'Create Account' : 'Sign In'}
          </button>

          {tab === 'login' && (
            <button
              type="button"
              onClick={() => { setForgotMode(true); setForgotEmail(email); setError(null); }}
              style={{
                marginTop: '12px', width: '100%', padding: '10px',
                background: 'transparent', border: 'none', color: '#00897b',
                fontSize: '14px', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Forgot password?
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000, padding: '20px',
};
const modalStyle: React.CSSProperties = {
  background: 'white', borderRadius: '12px', padding: '28px',
  maxWidth: '420px', width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
};
const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', fontSize: '24px',
  cursor: 'pointer', color: '#666',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #ccc',
  borderRadius: '6px', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '14px' };
const labelTextStyle: React.CSSProperties = { display: 'block', fontSize: '13px', color: '#444', marginBottom: '4px' };
const errorStyle: React.CSSProperties = {
  padding: '10px', background: '#ffebee', border: '1px solid #ef9a9a',
  color: '#c62828', borderRadius: '6px', fontSize: '13px', marginBottom: '14px',
};
const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%', padding: '12px', background: disabled ? '#80cbc4' : '#00897b',
  color: 'white', border: 'none', borderRadius: '6px', fontSize: '15px',
  fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
});

export default AuthModal;
