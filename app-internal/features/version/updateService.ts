// Import from Updates submodule to ensure proper type resolution
import {
  isEnabled,
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
} from 'expo-updates/build/Updates';
import type { Manifest } from 'expo-updates/build/Updates.types';
import Constants from 'expo-constants';
import { Alert, Linking, Platform } from 'react-native';
import { toast } from 'sonner-native';
import { isVersionNewer, meetsMinimumVersion } from './versionCompare';

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
  // For native updates
  currentVersion?: string;
  latestVersion?: string;
  minVersion?: string;
  updateUrl?: string; // App Store/Play Store URL
  needsUpdate?: boolean; // Below minimum version
}

/**
 * Version configuration from remote server
 */
export interface VersionConfig {
  ios: {
    latestVersion: string;
    minVersion: string;
    storeUrl: string;
  };
  android: {
    latestVersion: string;
    minVersion: string;
    storeUrl: string;
  };
}

/**
 * Options for native update flow
 */
export interface NativeUpdateFlowOptions {
  /**
   * Whether to show toast notifications
   */
  showToast: boolean;
  /**
   * Callback for status changes during update check
   */
  onStatusChange?: (status: UpdateStatus) => void;
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
   * Whether to show toast notifications during update process
   */
  showToast: boolean;
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
export async function performOTAUpdateFlow(options: OTAUpdateFlowOptions): Promise<void> {
  const { showPrompt = true, showToast, onStatusChange } = options;

  // Skip in development mode
  if (!isEnabled) {
    if (showToast) {
      toast.info('Updates Disabled', {
        description: 'Updates are not available in development mode',
      });
    }
    console.log('[OTA] Updates disabled');
    return;
  }

  try {
    // Step 1: Check for updates
    onStatusChange?.(UpdateStatus.CHECKING);
    const checkResult = await checkOTAUpdate();

    if (!checkResult.isAvailable) {
      onStatusChange?.(UpdateStatus.UP_TO_DATE);
      if (showToast) {
        toast.success('Up to Date', {
          description: 'You have the latest version',
        });
      }
      return;
    }

    // Step 2: Prompt user (if enabled)
    onStatusChange?.(UpdateStatus.AVAILABLE);

    if (showPrompt) {
      const shouldUpdate = await new Promise<boolean>(resolve => {
        Alert.alert(
          'New Version Available',
          'Would you like to update to the latest version now?',
          [
            {
              text: 'Later',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Update',
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
    if (showToast) {
      toast.info('Update Available', {
        description: 'Downloading new version...',
      });
    }

    const success = await downloadAndApplyOTAUpdate();

    if (success) {
      onStatusChange?.(UpdateStatus.READY);
      if (showToast) {
        toast.success('Update Ready', {
          description: 'Restarting app to apply update...',
        });
      }
      // Note: reloadAsync() is called inside downloadAndApplyOTAUpdate
      // so we won't reach here in normal flow
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to check for updates';
    onStatusChange?.(UpdateStatus.ERROR);

    if (showToast) {
      toast.error('Update Check Failed', {
        description: errorMessage,
      });
    }

    console.error('[OTA] Update flow failed:', error);
  }
}

/**
 * Get version config URL from environment or use default
 */
function getVersionConfigUrl(): string | undefined {
  // Check for environment variable first
  const envUrl = process.env.EXPO_PUBLIC_VERSION_CONFIG_URL;
  if (envUrl) {
    return envUrl;
  }

  // No default URL - must be configured
  return undefined;
}

/**
 * Fetch version configuration from remote server
 *
 * @returns Version configuration object
 * @throws Error if fetch fails or URL is not configured
 */
async function fetchVersionConfig(): Promise<VersionConfig> {
  const url = getVersionConfigUrl();

  if (!url) {
    throw new Error('VERSION_CONFIG_URL not configured. Set EXPO_PUBLIC_VERSION_CONFIG_URL.');
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch version config: ${response.status} ${response.statusText}`);
  }

  const config: VersionConfig = await response.json();
  return config;
}

/**
 * Check for native app updates (App Store/Play Store)
 *
 * Fetches version configuration from remote server and compares with
 * current app version to determine if an update is available or required.
 *
 * @returns Update check result with store URL if available
 */
export async function checkNativeUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = Constants.expoConfig?.version;

  if (!currentVersion) {
    console.warn('[Native] Unable to determine current app version');
    return {
      type: UpdateType.NONE,
      isAvailable: false,
    };
  }

  try {
    // Fetch version configuration from remote server
    const config = await fetchVersionConfig();

    // Get platform-specific configuration
    const platformConfig = Platform.OS === 'ios' ? config.ios : config.android;
    const { latestVersion, minVersion, storeUrl } = platformConfig;

    // Check if current version meets minimum requirement
    const needsUpdate = !meetsMinimumVersion(currentVersion, minVersion);

    // Check if there's a newer version available
    const hasNewerVersion = isVersionNewer(currentVersion, latestVersion);

    if (needsUpdate || hasNewerVersion) {
      return {
        type: UpdateType.NATIVE,
        isAvailable: true,
        currentVersion,
        latestVersion,
        minVersion,
        updateUrl: storeUrl,
        needsUpdate, // true if below minimum version
      };
    }

    return {
      type: UpdateType.NONE,
      isAvailable: false,
      currentVersion,
      latestVersion,
      minVersion,
    };
  } catch (error) {
    console.error('[Native] Failed to check for native update:', error);
    // Don't block app launch if version check fails
    return {
      type: UpdateType.NONE,
      isAvailable: false,
      currentVersion,
    };
  }
}

/**
 * Perform native update flow: check → prompt (non-blocking) → open store
 *
 * This provides a non-blocking update prompt that allows users to continue
 * using the app even if they decline the update.
 *
 * @param options - Configuration for the update flow
 */
export async function performNativeUpdateFlow(options: NativeUpdateFlowOptions): Promise<void> {
  const { showToast, onStatusChange } = options;

  try {
    // Step 1: Check for native updates
    onStatusChange?.(UpdateStatus.CHECKING);
    const checkResult = await checkNativeUpdate();

    if (!checkResult.isAvailable) {
      onStatusChange?.(UpdateStatus.UP_TO_DATE);
      // Don't show toast for up-to-date native version (to avoid noise)
      console.log('[Native] App is up to date');
      return;
    }

    // Step 2: Show non-blocking prompt
    onStatusChange?.(UpdateStatus.AVAILABLE);

    const { needsUpdate, latestVersion, updateUrl } = checkResult;

    // Determine prompt message based on update urgency
    const title = needsUpdate ? 'Update Required' : 'Update Available';
    const message = needsUpdate
      ? `A new version (${latestVersion}) is available. Please update for the best experience.`
      : `Version ${latestVersion} is now available. Would you like to update?`;

    const shouldUpdate = await new Promise<boolean>(resolve => {
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Update Now',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true },
      );
    });

    if (!shouldUpdate) {
      console.log('[Native] User declined update');
      return;
    }

    // Step 3: Open app store
    if (updateUrl) {
      const canOpen = await Linking.canOpenURL(updateUrl);
      if (canOpen) {
        await Linking.openURL(updateUrl);
        if (showToast) {
          toast.info('Opening App Store', {
            description: 'Please update the app',
          });
        }
      } else {
        if (showToast) {
          toast.error('Cannot Open Store', {
            description: 'Please update manually from the App Store',
          });
        }
      }
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to check for updates';
    onStatusChange?.(UpdateStatus.ERROR);

    if (showToast) {
      toast.error('Update Check Failed', {
        description: errorMessage,
      });
    }

    console.error('[Native] Update flow failed:', error);
  }
}
