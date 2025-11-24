import { useState, useCallback, useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import { isEnabled } from 'expo-updates/build/Updates';
import { useAppLifecycle } from '@/app-internal/components/shared/hooks/useAppLifecycle';
import { isDevelopmentBuild } from '@/config/environment';
import { performOTAUpdateFlow, performNativeUpdateFlow, UpdateStatus } from '../updateService';

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
 * Hook for app version information and automatic/manual updates
 *
 * Features:
 * - Provides version information (version, commit hash, display string)
 * - Automatic update check on cold boot (preview/production builds only)
 * - Manual update check via `checkForUpdate()` method (for Settings)
 * - Update status tracking (checking, downloading)
 *
 * Update flow:
 * 1. Check for native app updates (App Store/Play Store)
 * 2. Check for OTA updates (if native is up to date)
 *
 * Automatic update behavior:
 * - Only runs on cold boot (not on foreground return)
 * - Only runs on preview/production builds (not development)
 * - Shows confirmation dialog before downloading
 * - User can decline and continue using current version (non-blocking)
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
   * Checks both native and OTA updates in sequence
   */
  const checkForUpdate = useCallback(async () => {
    try {
      // Step 1: Check for native updates first
      await performNativeUpdateFlow({
        showToast: true,
        onStatusChange: status => {
          setIsChecking(status === UpdateStatus.CHECKING);
        },
      });

      // Step 2: Check for OTA updates (if native check passed)
      await performOTAUpdateFlow({
        showPrompt: true,
        showToast: true,
        onStatusChange: status => {
          setIsChecking(status === UpdateStatus.CHECKING);
          setIsDownloading(status === UpdateStatus.DOWNLOADING);
        },
      });
    } finally {
      // Reset states after completion
      setIsChecking(false);
      setIsDownloading(false);
    }
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
    // Check native updates first, then OTA updates
    (async () => {
      try {
        // Step 1: Check for native updates
        await performNativeUpdateFlow({
          showToast: false, // No toast for automatic checks
          onStatusChange: status => {
            setIsChecking(status === UpdateStatus.CHECKING);
          },
        });

        // Step 2: Check for OTA updates (if native check passed)
        await performOTAUpdateFlow({
          showPrompt: true,
          showToast: false, // No toast for automatic checks
          onStatusChange: status => {
            setIsChecking(status === UpdateStatus.CHECKING);
            setIsDownloading(status === UpdateStatus.DOWNLOADING);
          },
        });
      } catch (error) {
        console.error('[AutoUpdate] Auto-check failed:', error);
      } finally {
        setIsChecking(false);
        setIsDownloading(false);
      }
    })();
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
