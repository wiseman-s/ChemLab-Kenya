// frontend/src/components/ResetPasswordModal.tsx
import React, { useState } from 'react';
import { resetPassword } from '../utils/authApi';

interface Props {
  token: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ResetPasswordModal: React.FC<Props> = ({ token, onSuccess, onCancel }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (err) {
      setError((err as Error).message || 'Failed to reset password.');
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
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '28px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ color: '#00695c', marginTop: 0, marginBottom: '8px' }}>
          Reset your password
        </h2>
        <p style={{ color: '#666', fontSize: '14px', marginTop: 0, marginBottom: '20px' }}>
          Enter a new password for your ChemLab Kenya account.
        </p>

        {success ? (
          <div
            style={{
              padding: '16px',
              background: '#e8f5e9',
              border: '1px solid #a5d6a7',
              borderRadius: '6px',
              color: '#2e7d32',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <strong>Password reset successfully!</strong>
            <div style={{ fontSize: '13px', marginTop: '6px' }}>
              Redirecting you to the app...
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label style={{ display: 'block', marginBottom: '14px' }}>
              <span style={{ display: 'block', fontSize: '13px', color: '#444', marginBottom: '4px' }}>
                New password
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={inputStyle}
              />
            </label>

            <label style={{ display: 'block', marginBottom: '20px' }}>
              <span style={{ display: 'block', fontSize: '13px', color: '#444', marginBottom: '4px' }}>
                Confirm new password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={inputStyle}
              />
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
                marginBottom: '10px',
              }}
            >
              {submitting ? 'Resetting...' : 'Reset Password'}
            </button>

            <button
              type="button"
              onClick={onCancel}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                border: 'none',
                color: '#888',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </form>
        )}
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

export default ResetPasswordModal;
