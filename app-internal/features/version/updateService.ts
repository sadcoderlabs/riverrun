// Import from Updates submodule to ensure proper type resolution
import {
  isEnabled,
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
} from 'expo-updates/build/Updates';
import type { Manifest } from 'expo-updates/build/Updates.types';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';

/**
 * Update types supported by the app
 */
export enum UpdateType {
  /** Over-the-air update via expo-updates */
  OTA = 'OTA',
  /** Native app update via App Store/Play Store */
  NATIVE = 'NATIVE',
  /** No update available */
  NONE = 'NONE',
}

/**
 * Status of an ongoing update process
 */
export enum UpdateStatus {
  CHECKING = 'checking',
  AVAILABLE = 'available',
  DOWNLOADING = 'downloading',
  READY = 'ready',
  UP_TO_DATE = 'up_to_date',
  ERROR = 'error',
}

/**
 * Result of checking for updates
 */
export interface UpdateCheckResult {
  type: UpdateType;
  isAvailable: boolean;
  manifest?: Manifest;
  // For future native updates
  currentVersion?: string;
  latestVersion?: string;
  updateUrl?: string; // App Store/Play Store URL
}

/**
 * Options for OTA update flow
 */
export interface OTAUpdateFlowOptions {
  /**
   * Whether to show a confirmation prompt before downloading
   * @default true
   */
  showPrompt?: boolean;
  /**
   * Callback for status changes during update process
   */
  onStatusChange?: (status: UpdateStatus) => void;
}

/**
 * Check for OTA updates via expo-updates
 *
 * @returns Update check result with availability and manifest
 */
export async function checkOTAUpdate(): Promise<UpdateCheckResult> {
  if (!isEnabled) {
    return {
      type: UpdateType.NONE,
      isAvailable: false,
    };
  }

  try {
    const update = await checkForUpdateAsync();

    if (update.isAvailable) {
      return {
        type: UpdateType.OTA,
        isAvailable: true,
        manifest: update.manifest,
      };
    }

    return {
      type: UpdateType.NONE,
      isAvailable: false,
    };
  } catch (error) {
    console.error('[OTA] Failed to check for update:', error);
    throw error;
  }
}

/**
 * Download and apply an OTA update
 *
 * @returns True if update was downloaded and applied successfully
 */
export async function downloadAndApplyOTAUpdate(): Promise<boolean> {
  try {
    const fetchResult = await fetchUpdateAsync();

    if (fetchResult.isNew) {
      // Update was downloaded successfully, reload to apply
      await reloadAsync();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[OTA] Failed to download/apply update:', error);
    throw error;
  }
}

/**
 * Perform complete OTA update flow: check → prompt (optional) → download → reload
 *
 * This is the main entry point for update functionality, used by both
 * automatic (cold boot) and manual (settings button) update checks.
 *
 * @param options - Configuration for the update flow
 */
export async function performOTAUpdateFlow(options: OTAUpdateFlowOptions = {}): Promise<void> {
  const { showPrompt = true, onStatusChange } = options;

  // Skip in development mode
  if (!isEnabled) {
    toast.info('Updates Disabled', {
      description: 'Updates are not available in development mode',
    });
    console.log('[OTA] Updates disabled');
    return;
  }

  try {
    // Step 1: Check for updates
    onStatusChange?.(UpdateStatus.CHECKING);
    const checkResult = await checkOTAUpdate();

    if (!checkResult.isAvailable) {
      onStatusChange?.(UpdateStatus.UP_TO_DATE);
      toast.success('Up to Date', {
        description: 'You have the latest version',
      });
      return;
    }

    // Step 2: Prompt user (if enabled)
    onStatusChange?.(UpdateStatus.AVAILABLE);

    if (showPrompt) {
      const shouldUpdate = await new Promise<boolean>(resolve => {
        Alert.alert(
          '有新版本可用',
          '是否要立即更新到最新版本？',
          [
            {
              text: '稍後',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: '更新',
              onPress: () => resolve(true),
            },
          ],
          { cancelable: false },
        );
      });

      if (!shouldUpdate) {
        console.log('[OTA] User declined update');
        return;
      }
    }

    // Step 3: Download update
    onStatusChange?.(UpdateStatus.DOWNLOADING);
    toast.info('Update Available', {
      description: 'Downloading new version...',
    });

    const success = await downloadAndApplyOTAUpdate();

    if (success) {
      onStatusChange?.(UpdateStatus.READY);
      toast.success('Update Ready', {
        description: 'Restarting app to apply update...',
      });
      // Note: reloadAsync() is called inside downloadAndApplyOTAUpdate
      // so we won't reach here in normal flow
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to check for updates';
    onStatusChange?.(UpdateStatus.ERROR);

    toast.error('Update Check Failed', {
      description: errorMessage,
    });

    console.error('[OTA] Update flow failed:', error);
  }
}

/**
 * Check for native app updates (App Store/Play Store)
 *
 * @future This is a placeholder for future implementation.
 * Will check backend API or third-party service to determine if a newer
 * native version is available on the app stores.
 *
 * @returns Update check result with store URL if available
 */
export async function checkNativeUpdate(): Promise<UpdateCheckResult> {
  // TODO: Implement native update checking
  // - Call backend API to get latest version from App Store/Play Store
  // - Compare with current native version (Constants.expoConfig?.version)
  // - Return App Store/Play Store URL if update needed
  //
  // Example:
  // const currentVersion = Constants.expoConfig?.version;
  // const response = await fetch('/api/check-version');
  // const { latestVersion, storeUrl } = await response.json();
  //
  // if (isVersionNewer(latestVersion, currentVersion)) {
  //   return {
  //     type: UpdateType.NATIVE,
  //     isAvailable: true,
  //     currentVersion,
  //     latestVersion,
  //     updateUrl: storeUrl
  //   };
  // }

  return {
    type: UpdateType.NONE,
    isAvailable: false,
  };
}
