/**
 * Backend Infrastructure Module
 *
 * Provides low-level HTTP client functions for the riverrun-backend API.
 * Follows the pattern established in infra/hyperliquid/.
 *
 * Usage:
 * ```typescript
 * import { registerDevice, unregisterDevice } from '@/infra/backend';
 *
 * await registerDevice({ ... });
 * ```
 */

export * from './client/deviceClient';
