import * as hl from '@nktkas/hyperliquid';
import { useMemo } from 'react';

import { useAgentExchangeClient } from '@/lib/riverrun/agent/useAgentExchangeClient';
import { useInfoClient } from '@/lib/hyperliquid/client/useInfoClient';
import { useMasterExchangeClient } from '@/lib/hyperliquid/client/useMasterExchangeClient';

interface UseHyperliquidClientResult {
  getAgentExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  getMasterExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  infoClient: hl.InfoClient;
}

export function useHyperliquidClient(): UseHyperliquidClientResult {
  const { getAgentExchangeClient } = useAgentExchangeClient();
  const { getMasterExchangeClient } = useMasterExchangeClient();

  // Get singleton instances from hooks
  const infoClient = useInfoClient();

  return useMemo(
    () => ({
      getAgentExchangeClient,
      getMasterExchangeClient,
      infoClient,
    }),
    [getAgentExchangeClient, getMasterExchangeClient, infoClient],
  );
}
