import * as hl from '@nktkas/hyperliquid';
import { useMemo } from 'react';

import { useAgentExchangeClient } from '@/lib/riverrun/agent/useAgentExchangeClient';
import { useMasterExchangeClient } from '@/lib/hyperliquid/client/useMasterExchangeClient';

interface UseHyperliquidClientResult {
  getAgentExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  getMasterExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
}

export function useHyperliquidClient(): UseHyperliquidClientResult {
  const { getAgentExchangeClient } = useAgentExchangeClient();
  const { getMasterExchangeClient } = useMasterExchangeClient();

  return useMemo(
    () => ({
      getAgentExchangeClient,
      getMasterExchangeClient,
    }),
    [getAgentExchangeClient, getMasterExchangeClient],
  );
}
