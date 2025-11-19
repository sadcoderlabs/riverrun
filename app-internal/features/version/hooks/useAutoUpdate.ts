import { useState, useCallback, useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import { isEnabled } from 'expo-updates/build/Updates';
import { useAppLifecycle } from '@/app-internal/components/shared/hooks/useAppLifecycle';
import { isDevelopmentBuild } from '@/config/environment';
import { performOTAUpdateFlow, UpdateStatus } from '../updateService';

/**
 * Version and update information returned by the hook
 */
export interface VersionInfo {
  version: string;
  commitHash: string;
  displayVersion: string;
  checkForUpdate: () => Promise<void>;
  isChecking: boolean;
  isDownloading: boolean;
}

/**
 * Hook for app version information and automatic/manual OTA updates
 *
 * Features:
 * - Provides version information (version, commit hash, display string)
 * - Automatic update check on cold boot (preview/production builds only)
 * - Manual update check via `checkForUpdate()` method (for Settings)
 * - Update status tracking (checking, downloading)
 *
 * Automatic update behavior:
 * - Only runs on cold boot (not on foreground return)
 * - Only runs on preview/production builds (not development)
 * - Shows confirmation dialog before downloading
 * - User can decline and continue using current version
 *
 * @example
 * ```tsx
 * // Automatic updates (in _layout.tsx)
 * function App() {
 *   useAutoUpdate(); // Handles cold boot updates automatically
 *   return <YourApp />;
 * }
 *
 * // Manual updates (in Settings)
 * function Settings() {
 *   const { checkForUpdate, isChecking } = useAutoUpdate();
 *   return (
 *     <Button onPress={checkForUpdate} disabled={isChecking}>
 *       Check for Updates
 *     </Button>
 *   );
 * }
 * ```
 */
export function useAutoUpdate(): VersionInfo {
  const version = Constants.expoConfig?.version || 'unknown';
  const commitHash = process.env.EXPO_PUBLIC_GIT_COMMIT_HASH || 'dev';
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Track if we've checked on this cold boot
  const hasCheckedOnBootRef = useRef(false);

  // Monitor app lifecycle
  const appState = useAppLifecycle();

  // Format: "1.0.0 [a1b2c3d]"
  const displayVersion = `${version} [${commitHash}]`;

  /**
   * Manual update check (for Settings button)
   */
  const checkForUpdate = useCallback(async () => {
    await performOTAUpdateFlow({
      showPrompt: true,
      showToast: true,
      onStatusChange: status => {
        setIsChecking(status === UpdateStatus.CHECKING);
        setIsDownloading(status === UpdateStatus.DOWNLOADING);
      },
    });

    // Reset states if not downloading
    setIsChecking(false);
    setIsDownloading(false);
  }, []);

  /**
   * Automatic update check on cold boot
   */
  useEffect(() => {
    // Only check once per cold boot
    if (hasCheckedOnBootRef.current) {
      return;
    }

    // Only check when app becomes active
    if (appState !== 'active') {
      return;
    }

    // Only check on preview/production builds
    const shouldAutoCheck = isEnabled && !isDevelopmentBuild;

    if (!shouldAutoCheck) {
      console.log('[AutoUpdate] Skipping auto-check (development build or updates disabled)');
      return;
    }

    // Mark as checked to prevent duplicate checks
    hasCheckedOnBootRef.current = true;

    console.log('[AutoUpdate] Performing automatic update check on cold boot');

    // Perform update check asynchronously (don't block render)
    performOTAUpdateFlow({
      showPrompt: true,
      showToast: false,
      onStatusChange: status => {
        setIsChecking(status === UpdateStatus.CHECKING);
        setIsDownloading(status === UpdateStatus.DOWNLOADING);
      },
    })
      .then(() => {
        setIsChecking(false);
        setIsDownloading(false);
      })
      .catch(error => {
        console.error('[AutoUpdate] Auto-check failed:', error);
        setIsChecking(false);
        setIsDownloading(false);
      });
  }, [appState]);

  return {
    version,
    commitHash,
    displayVersion,
    checkForUpdate,
    isChecking,
    isDownloading,
  };
}
