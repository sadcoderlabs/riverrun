import { useState, useCallback } from 'react';
import Constants from 'expo-constants';
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
 * Hook for app version information and manual OTA updates
 *
 * Features:
 * - Provides version information (version, commit hash, display string)
 * - Manual update check via `checkForUpdate()` method
 * - Update status tracking (checking, downloading)
 *
 * This hook does NOT perform automatic update checks.
 * For automatic updates on cold boot, use `useAutoUpdate()` instead.
 *
 * @example
 * ```tsx
 * // Manual updates (in Settings)
 * function Settings() {
 *   const { displayVersion, checkForUpdate, isChecking } = useVersionInfo();
 *   return (
 *     <>
 *       <Text>Version: {displayVersion}</Text>
 *       <Button onPress={checkForUpdate} disabled={isChecking}>
 *         Check for Updates
 *       </Button>
 *     </>
 *   );
 * }
 * ```
 */
export function useVersionInfo(): VersionInfo {
  const version = Constants.expoConfig?.version || 'unknown';
  const commitHash = process.env.EXPO_PUBLIC_GIT_COMMIT_HASH || 'dev';
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Format: "1.0.0 [a1b2c3d]"
  const displayVersion = `${version} [${commitHash}]`;

  /**
   * Manual update check (for Settings button)
   */
  const checkForUpdate = useCallback(async () => {
    await performOTAUpdateFlow({
      showPrompt: true,
      onStatusChange: status => {
        setIsChecking(status === UpdateStatus.CHECKING);
        setIsDownloading(status === UpdateStatus.DOWNLOADING);
      },
    });

    // Reset states if not downloading
    setIsChecking(false);
    setIsDownloading(false);
  }, []);

  return {
    version,
    commitHash,
    displayVersion,
    checkForUpdate,
    isChecking,
    isDownloading,
  };
}
