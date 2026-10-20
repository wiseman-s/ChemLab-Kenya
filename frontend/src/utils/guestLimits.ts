// frontend/src/utils/guestLimits.ts
// Tracks guest usage per session using sessionStorage.
// Cleared when the browser session ends. Client-side only — this is
// motivational, not security. Real enforcement requires backend auth.

const STORAGE_KEY = 'chemlab_guest_usage';

export type LimitedFeature = 'analyze' | 'compound' | 'chat';

export const LIMITS: Record<LimitedFeature, number> = {
  analyze: 3,
  compound: 3,
  chat: 5,
};

export interface GuestUsage {
  analyze: number;
  compound: number;
  chat: number;
  bannerDismissed: boolean;
}

const EMPTY_USAGE: GuestUsage = {
  analyze: 0,
  compound: 0,
  chat: 0,
  bannerDismissed: false,
};

export function getUsage(): GuestUsage {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_USAGE };
    const parsed = JSON.parse(raw) as Partial<GuestUsage>;
    return { ...EMPTY_USAGE, ...parsed };
  } catch {
    return { ...EMPTY_USAGE };
  }
}

export function setUsage(usage: GuestUsage): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // sessionStorage may be disabled (private mode) — fail silently
  }
}

export function incrementUsage(feature: LimitedFeature): GuestUsage {
  const usage = getUsage();
  usage[feature] = (usage[feature] || 0) + 1;
  setUsage(usage);
  return usage;
}

export function isAtLimit(feature: LimitedFeature): boolean {
  const usage = getUsage();
  return (usage[feature] || 0) >= LIMITS[feature];
}

export function remaining(feature: LimitedFeature): number {
  const usage = getUsage();
  return Math.max(0, LIMITS[feature] - (usage[feature] || 0));
}

export function dismissBanner(): void {
  const usage = getUsage();
  usage.bannerDismissed = true;
  setUsage(usage);
}

export function resetLimits(): void {
  // Called after successful login/signup — since they're now authenticated,
  // limits no longer apply and we clear any counters.
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}
