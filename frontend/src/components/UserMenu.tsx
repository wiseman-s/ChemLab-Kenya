// frontend/src/components/UserMenu.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

const UserMenu: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<'login' | 'signup'>('login');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  if (loading) {
    return <div style={{ width: '120px', height: '36px' }} />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => { setInitialTab('login'); setModalOpen(true); }}
          style={{
            padding: '8px 18px',
            background: '#00897b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Sign In
        </button>
        {modalOpen && <AuthModal initialTab={initialTab} onClose={() => setModalOpen(false)} />}
      </>
    );
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          padding: '8px 14px',
          background: 'white',
          color: '#00695c',
          border: '2px solid #00897b',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          maxWidth: '220px',
        }}
      >
        <span>👤</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.full_name || user.email}
        </span>
        <span style={{ fontSize: '10px' }}>▾</span>
      </button>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: '220px',
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '8px',
            zIndex: 100,
          }}
        >
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #eee', marginBottom: '6px' }}>
            <div style={{ fontSize: '13px', color: '#666' }}>Signed in as</div>
            <div style={{ fontSize: '14px', fontWeight: 600, wordBreak: 'break-all' }}>{user.email}</div>
          </div>
          <button
            onClick={async () => { setMenuOpen(false); await logout(); }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              color: '#c62828',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#ffebee')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
