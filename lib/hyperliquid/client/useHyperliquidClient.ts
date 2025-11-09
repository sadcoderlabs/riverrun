import * as hl from '@nktkas/hyperliquid';
import { useMemo } from 'react';

import { useAgentExchangeClient } from '@/lib/riverrun/agent/useAgentExchangeClient';
import { useMasterExchangeClient } from '@/lib/hyperliquid/client/useMasterExchangeClient';
import { getInfoClient } from '@/lib/hyperliquid/client/getter';

interface UseHyperliquidClientResult {
  getAgentExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  getMasterExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  infoClient: hl.InfoClient;
}

export function useHyperliquidClient(): UseHyperliquidClientResult {
  const { getAgentExchangeClient } = useAgentExchangeClient();
  const { getMasterExchangeClient } = useMasterExchangeClient();

  // Get singleton instance
  const infoClient = useMemo(() => getInfoClient(), []);

  return useMemo(
    () => ({
      getAgentExchangeClient,
      getMasterExchangeClient,
      infoClient,
    }),
    [getAgentExchangeClient, getMasterExchangeClient, infoClient],
  );
}
