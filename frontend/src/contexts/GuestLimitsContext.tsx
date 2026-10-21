// frontend/src/contexts/GuestLimitsContext.tsx
import React, { createContext, useCallback, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  LIMITS,
  LimitedFeature,
  getUsage,
  incrementUsage,
  dismissBanner,
  resetLimits,
} from '../utils/guestLimits';

interface GuestLimitsContextValue {
  tryUse: (feature: LimitedFeature) => boolean;
  showPaywall: LimitedFeature | null;
  closePaywall: () => void;
  showBanner: boolean;
  hideBanner: () => void;
  remaining: (feature: LimitedFeature) => number;
  limit: (feature: LimitedFeature) => number;
  reset: () => void;
}

const GuestLimitsContext = createContext<GuestLimitsContextValue | undefined>(undefined);

export const GuestLimitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [showPaywall, setShowPaywall] = useState<LimitedFeature | null>(null);
  const [bannerDismissedState, setBannerDismissedState] = useState(() => getUsage().bannerDismissed);

  const tryUse = useCallback(
    (feature: LimitedFeature): boolean => {
      if (user) return true;

      const usage = getUsage();
      const used = usage[feature] || 0;

      if (used >= LIMITS[feature]) {
        setShowPaywall(feature);
        return false;
      }

      incrementUsage(feature);

      if (!bannerDismissedState && used === 0) {
        setBannerDismissedState(getUsage().bannerDismissed);
      }

      return true;
    },
    [user, bannerDismissedState]
  );

  const closePaywall = useCallback(() => setShowPaywall(null), []);
  const hideBanner = useCallback(() => {
    dismissBanner();
    setBannerDismissedState(true);
  }, []);
  const reset = useCallback(() => {
    resetLimits();
    setBannerDismissedState(false);
  }, []);

  const remaining = useCallback(
    (feature: LimitedFeature) => {
      if (user) return Infinity;
      const usage = getUsage();
      return Math.max(0, LIMITS[feature] - (usage[feature] || 0));
    },
    [user]
  );

  const limit = useCallback((feature: LimitedFeature) => LIMITS[feature], []);

  const showBanner = !user && !bannerDismissedState;

  return (
    <GuestLimitsContext.Provider
      value={{
        tryUse,
        showPaywall,
        closePaywall,
        showBanner,
        hideBanner,
        remaining,
        limit,
        reset,
      }}
    >
      {children}
    </GuestLimitsContext.Provider>
  );
};

export function useGuestLimits(): GuestLimitsContextValue {
  const ctx = useContext(GuestLimitsContext);
  if (!ctx) throw new Error('useGuestLimits must be used inside <GuestLimitsProvider>');
  return ctx;
}
