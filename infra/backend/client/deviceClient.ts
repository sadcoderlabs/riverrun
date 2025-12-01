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
