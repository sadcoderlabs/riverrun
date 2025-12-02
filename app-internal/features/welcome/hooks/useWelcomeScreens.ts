import { useCallback, useMemo, useState } from 'react';
import { useWallet } from '../../wallet/hooks/useWallet';
import { useWelcomeStore } from '../stores/welcomeStore';

export interface UseWelcomeScreensResult {
  /** Whether the welcome dialog should be shown */
  shouldShow: boolean;
  /** Current page index (0-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Set the current page */
  setCurrentPage: (page: number) => void;
  /** Advance to next page, returns true if there are more pages */
  nextPage: () => boolean;
  /** Dismiss the welcome dialog (marks as seen) */
  dismiss: () => void;
  /** Whether the store has hydrated from storage */
  isReady: boolean;
}

const TOTAL_PAGES = 2;

/**
 * Hook to manage welcome screens state and navigation.
 *
 * Shows welcome screens when:
 * - First sign-in on this device, OR
 * - First sign-in with this wallet address
 *
 * @example
 * ```tsx
 * const { shouldShow, currentPage, nextPage, dismiss } = useWelcomeScreens();
 *
 * if (shouldShow) {
 *   return <WelcomeDialog currentPage={currentPage} onNext={nextPage} onDismiss={dismiss} />;
 * }
 * ```
 */
export function useWelcomeScreens(): UseWelcomeScreensResult {
  const { address, isConnected } = useWallet();
  const { shouldShowWelcome, markSeen, _hasHydrated } = useWelcomeStore();

  const [currentPage, setCurrentPage] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const shouldShow = useMemo(() => {
    // Wait for hydration and connection
    if (!_hasHydrated || !isConnected || !address || dismissed) {
      return false;
    }
    return shouldShowWelcome(address);
  }, [_hasHydrated, isConnected, address, dismissed, shouldShowWelcome]);

  const dismiss = useCallback(() => {
    if (address) {
      markSeen(address);
    }
    setDismissed(true);
    setCurrentPage(0);
  }, [address, markSeen]);

  const nextPage = useCallback(() => {
    if (currentPage < TOTAL_PAGES - 1) {
      setCurrentPage(prev => prev + 1);
      return true;
    }
    // Last page, dismiss
    dismiss();
    return false;
  }, [currentPage, dismiss]);

  return {
    shouldShow,
    currentPage,
    totalPages: TOTAL_PAGES,
    setCurrentPage,
    nextPage,
    dismiss,
    isReady: _hasHydrated,
  };
}
