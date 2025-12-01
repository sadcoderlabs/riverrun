/**
 * Device API Client
 *
 * Wrapper functions for device registration/unregistration endpoints.
 * Follows the pattern established in infra/hyperliquid/client/infoClient.ts.
 *
 * Usage:
 * ```typescript
 * import { registerDevice, unregisterDevice } from '@/infra/backend/client/deviceClient';
 *
 * await registerDevice({
 *   walletAddress: '0x...',
 *   deviceToken: 'ExponentPushToken[...]',
 *   platform: 'ios',
 * });
 * ```
 */

import { getBaseUrl } from './getter';

// ============================================================================
// Types
// ============================================================================

export interface RegisterDeviceParams {
  walletAddress: string;
  deviceToken: string;
  platform: 'ios' | 'android';
}

export interface UnregisterDeviceParams {
  walletAddress: string;
  deviceToken: string;
}

export interface DeviceResponse {
  success: boolean;
}

export interface DeviceInfo {
  deviceToken: string;
  platform: 'ios' | 'android';
  lastActiveAt: number;
  enabled: boolean;
}

export interface NotificationStatusResponse {
  enabled: boolean;
  devices: DeviceInfo[];
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Register a device for push notifications
 *
 * @param params - Device registration parameters
 * @returns Success response from backend
 * @throws Error if registration fails
 *
 * @example
 * ```typescript
 * const result = await registerDevice({
 *   walletAddress: '0x...',
 *   deviceToken: 'ExponentPushToken[abc123]',
 *   platform: 'ios',
 * });
 * ```
 */
export async function registerDevice(params: RegisterDeviceParams): Promise<DeviceResponse> {
  const response = await fetch(`${getBaseUrl()}/devices/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Device registration failed: ${error.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Unregister a device from push notifications
 *
 * @param params - Device unregistration parameters
 * @returns Success response from backend
 * @throws Error if unregistration fails
 *
 * @example
 * ```typescript
 * const result = await unregisterDevice({
 *   walletAddress: '0x...',
 *   deviceToken: 'ExponentPushToken[abc123]',
 * });
 * ```
 */
export async function unregisterDevice(params: UnregisterDeviceParams): Promise<DeviceResponse> {
  const response = await fetch(`${getBaseUrl()}/devices/unregister`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Device unregistration failed: ${error.error || response.statusText}`);
  }

  return response.json();
}

/**
 * Get notification status for a wallet
 *
 * @param walletAddress - The wallet address to check status for
 * @returns Notification status including enabled flag and device list
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * const status = await getNotificationStatus('0x...');
 * console.log(status.enabled); // true/false
 * console.log(status.devices); // list of registered devices
 * ```
 */
export async function getNotificationStatus(
  walletAddress: string,
): Promise<NotificationStatusResponse> {
  const response = await fetch(
    `${getBaseUrl()}/devices/status?walletAddress=${encodeURIComponent(walletAddress)}`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Get notification status failed: ${error.error || response.statusText}`);
  }

  return response.json();
}
