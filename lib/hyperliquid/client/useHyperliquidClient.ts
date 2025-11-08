import * as hl from '@nktkas/hyperliquid';
import { useMemo } from 'react';

import { useAgentExchangeClient } from '@/lib/hyperliquid/agent/hooks/useAgentExchangeClient';
import { useInfoClient } from '@/lib/hyperliquid/client/useInfoClient';
import { useSubscriptionClient } from '@/lib/hyperliquid/client/useSubscriptionClient';
import { useMasterExchangeClient } from '@/lib/hyperliquid/client/useMasterExchangeClient';

interface UseHyperliquidClientResult {
  getAgentExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  getMasterExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  infoClient: hl.InfoClient;
  subscriptionClient: hl.SubscriptionClient;
}

export function useHyperliquidClient(): UseHyperliquidClientResult {
  const { getAgentExchangeClient } = useAgentExchangeClient();
  const { getMasterExchangeClient } = useMasterExchangeClient();

  // Get singleton instances from hooks
  const infoClient = useInfoClient();
  const subscriptionClient = useSubscriptionClient();

  return useMemo(
    () => ({
      getAgentExchangeClient,
      getMasterExchangeClient,
      infoClient,
      subscriptionClient,
    }),
    [getAgentExchangeClient, getMasterExchangeClient, infoClient, subscriptionClient],
  );
}
