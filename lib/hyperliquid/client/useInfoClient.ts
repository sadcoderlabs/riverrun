import * as hl from '@nktkas/hyperliquid';
import { useMemo } from 'react';

import { getInfoClient } from '@/lib/hyperliquid/client/getter';

/**
 * Hook for accessing Hyperliquid InfoClient
 *
 * Returns a singleton InfoClient instance for querying read-only data
 * from the Hyperliquid API.
 *
 * @returns InfoClient instance
 *
 * @example
 * ```tsx
 * const infoClient = useInfoClient();
 * const meta = await infoClient.getMeta();
 * ```
 */
export function useInfoClient(): hl.InfoClient {
  return useMemo(() => getInfoClient(), []);
}
