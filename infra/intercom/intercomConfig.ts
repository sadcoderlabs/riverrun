/**
 * Intercom Configuration
 *
 * Manual initialization approach - Intercom is initialized lazily when first needed.
 * This prevents showing in-app messages during onboarding and delays initialization
 * until the user explicitly requests support.
 */

import Intercom from '@intercom/intercom-react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { appVariant } from '@/config/environment';

/**
 * Track initialization state to ensure we only initialize once
 */
let isInitialized = false;

/**
 * Get Intercom plugin configuration from app.json
 */
function getIntercomConfig(): { apiKey: string; appId: string } | undefined {
  const plugins = Constants.expoConfig?.plugins;
  if (!plugins || !Array.isArray(plugins)) {
    return undefined;
  }

  // Find Intercom plugin configuration
  const intercomPlugin = plugins.find(
    plugin => Array.isArray(plugin) && plugin[0] === '@intercom/intercom-react-native',
  ) as [string, { appId: string; iosApiKey: string; androidApiKey: string }] | undefined;

  if (!intercomPlugin || !intercomPlugin[1]) {
    return undefined;
  }

  const config = intercomPlugin[1];
  const appId = config.appId;

  // Use platform-specific API key
  const apiKey = Platform.select({
    ios: config.iosApiKey,
    android: config.androidApiKey,
  });

  if (!apiKey || !appId) {
    return undefined;
  }

  return { apiKey, appId };
}

/**
 * Initialize Intercom (manual initialization)
 *
 * This is called lazily when the user first opens the support messenger.
 * Manual initialization is useful when you want to delay initialization
 * until after user authentication or when you need to prevent in-app
 * messages during onboarding.
 */
export async function ensureIntercomInitialized(): Promise<boolean> {
  // Already initialized, skip
  if (isInitialized) {
    return true;
  }

  const config = getIntercomConfig();

  if (!config) {
    console.warn('[Intercom] Missing plugin configuration, Intercom cannot be initialized');
    return false;
  }

  try {
    // Initialize Intercom with platform-specific API key and app ID
    await Intercom.initialize(config.apiKey, config.appId);

    isInitialized = true;
    console.log(`[Intercom] Initialized in ${appVariant} environment`);
    return true;
  } catch (error) {
    console.error('[Intercom] Failed to initialize:', error);
    return false;
  }
}

/**
 * Check if Intercom is initialized
 */
export function isIntercomInitialized(): boolean {
  return isInitialized;
}

/**
 * Open Intercom messenger
 * Shows the Intercom messenger interface to the user
 * Automatically initializes Intercom if not already initialized
 */
export async function openIntercomMessenger(): Promise<void> {
  try {
    // Ensure Intercom is initialized before opening
    const initialized = await ensureIntercomInitialized();
    if (!initialized) {
      throw new Error('Failed to initialize Intercom');
    }

    await Intercom.present();
  } catch (error) {
    console.error('[Intercom] Failed to open messenger:', error);
    throw error;
  }
}

/**
 * Login user with user attributes in Intercom
 * Associates the current session with a user ID (typically wallet address)
 * This should be called after user authentication
 *
 * Note: We logout first to handle cases where:
 * 1. App restarts but Intercom session persists
 * 2. Previous login was not properly cleaned up
 * This prevents "Error in loginUserWithUserAttributes" errors
 */
export async function loginIntercomUser(userId: string): Promise<void> {
  try {
    // Ensure Intercom is initialized before logging in user
    const initialized = await ensureIntercomInitialized();
    if (!initialized) {
      console.warn('[Intercom] Cannot login user - initialization failed');
      return;
    }

    // Logout first to clear any existing session
    // This prevents errors when the app restarts with a persisted Intercom session
    try {
      await Intercom.logout();
    } catch {
      // Ignore logout errors - user might not be logged in
    }

    await Intercom.loginUserWithUserAttributes({ userId });
    console.log('[Intercom] User logged in:', userId);
  } catch (error) {
    console.error('[Intercom] Failed to login user:', error);
    throw error;
  }
}

/**
 * Logout from Intercom
 * Clears the current user session
 * Note: Only call this for identified users - unregistering an unidentified
 * user will result in orphan records that cannot be merged in future
 */
export async function logoutIntercom(): Promise<void> {
  try {
    // Only logout if Intercom is initialized
    if (!isInitialized) {
      return;
    }

    await Intercom.logout();
    console.log('[Intercom] User logged out');
  } catch (error) {
    console.error('[Intercom] Failed to logout:', error);
    throw error;
  }
}
