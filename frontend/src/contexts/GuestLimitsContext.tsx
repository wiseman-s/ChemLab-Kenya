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
  /** Returns true if the action is allowed. Increments usage and shows paywall if not. */
  tryUse: (feature: LimitedFeature) => boolean;
  /** True if the paywall modal should show. */
  showPaywall: LimitedFeature | null;
  /** Close the paywall modal without signing up. */
  closePaywall: () => void;
  /** True if we should show the gentle "sign up to save work" banner. */
  showBanner: boolean;
  /** Dismiss the banner. */
  hideBanner: () => void;
  /** Remaining uses for a feature (for display in UI). */
  remaining: (feature: LimitedFeature) => number;
  /** Total limit for a feature. */
  limit: (feature: LimitedFeature) => number;
  /** Reset counters (called after login/signup automatically by AuthContext). */
  reset: () => void;
}

const GuestLimitsContext = createContext<GuestLimitsContextValue | undefined>(undefined);

export const GuestLimitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [showPaywall, setShowPaywall] = useState<LimitedFeature | null>(null);
  const [bannerDismissedState, setBannerDismissedState] = useState(() => getUsage().bannerDismissed);

  const tryUse = useCallback(
    (feature: LimitedFeature): boolean => {
      // Logged-in users have no limits
      if (user) return true;

      const usage = getUsage();
      const used = usage[feature] || 0;

      if (used >= LIMITS[feature]) {
        setShowPaywall(feature);
        return false;
      }

      incrementUsage(feature);

      // After the first use, gently nudge (banner shows once per session)
      if (!bannerDismissedState && used === 0) {
        // Banner will be shown by App.tsx reading showBanner
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
