// frontend/src/components/UsageLimitModal.tsx
import React, { useState } from 'react';
import AuthModal from './AuthModal';
import { LIMITED_FEATURE_LABELS } from '../utils/guestLimitsLabels';

interface Props {
  feature: 'analyze' | 'compound' | 'chat' | 'nmr' | 'balance';
  onClose: () => void;
}

const UsageLimitModal: React.FC<Props> = ({ feature, onClose }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);

  if (authMode) {
    return <AuthModal initialTab={authMode} onClose={() => setAuthMode(null)} />;
  }

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
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '42px', marginBottom: '10px' }}>🎉</div>
        <h2 style={{ color: '#00695c', marginTop: 0, marginBottom: '12px' }}>
          You've used your free {LIMITED_FEATURE_LABELS[feature].plural}
        </h2>
        <p style={{ color: '#555', fontSize: '15px', lineHeight: 1.6, marginTop: 0 }}>
          Create a free account to continue using the {LIMITED_FEATURE_LABELS[feature].singular}.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '22px' }}>
          <button
            onClick={() => setAuthMode('signup')}
            style={{
              padding: '12px',
              background: '#00897b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Create free account
          </button>
          <button
            onClick={() => setAuthMode('login')}
            style={{
              padding: '12px',
              background: 'white',
              color: '#00897b',
              border: '2px solid #00897b',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            I already have an account
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px',
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsageLimitModal;
