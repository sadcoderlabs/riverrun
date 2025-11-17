import { useState, useCallback } from 'react';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { toast } from 'sonner-native';

export interface VersionInfo {
  version: string;
  commitHash: string;
  displayVersion: string;
  checkForUpdate: () => Promise<void>;
  isChecking: boolean;
  isDownloading: boolean;
}

/**
 * Hook to access app version information and OTA update functionality
 *
 * Returns version details including:
 * - expo.version from app.json
 * - Git commit hash from EXPO_PUBLIC_GIT_COMMIT_HASH
 * - Formatted display string
 * - OTA update check function
 */
export function useVersion(): VersionInfo {
  const version = Constants.expoConfig?.version || 'unknown';
  const commitHash = process.env.EXPO_PUBLIC_GIT_COMMIT_HASH || 'dev';
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Format: "1.0.0 [a1b2c3d]"
  const displayVersion = `${version} [${commitHash}]`;

  const checkForUpdate = useCallback(async () => {
    // Skip in development mode
    if (__DEV__ || !Updates.isEnabled) {
      toast.info('Updates Disabled', {
        description: 'Updates are not available in development mode',
      });
      console.log('[OTA] Updates disabled in development');
      return;
    }

    try {
      setIsChecking(true);

      // Check for updates
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        toast.info('Update Available', {
          description: 'Downloading new version...',
        });

        setIsChecking(false);
        setIsDownloading(true);

        // Download update
        const fetchResult = await Updates.fetchUpdateAsync();

        if (fetchResult.isNew) {
          toast.success('Update Ready', {
            description: 'Restarting app to apply update...',
          });

          // Reload app with new update
          await Updates.reloadAsync();
        }
      } else {
        toast.success('Up to Date', {
          description: 'You have the latest version',
        });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to check for updates';

      toast.error('Update Check Failed', {
        description: errorMessage,
      });

      console.error('[OTA] Update check failed:', err);
    } finally {
      setIsChecking(false);
      setIsDownloading(false);
    }
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
