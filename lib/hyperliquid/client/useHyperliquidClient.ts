import * as hl from '@nktkas/hyperliquid';
import { SymbolConverter } from '@nktkas/hyperliquid/utils';
import { useMemo } from 'react';

import { useAgentExchangeClient } from '@/lib/hyperliquid/agent/hooks/useAgentExchangeClient';
import {
  getInfoClient,
  getSubscriptionClient,
  getSymbolConverter,
} from '@/lib/hyperliquid/client/getter';
import { useMasterExchangeClient } from '@/lib/hyperliquid/client/useMasterExchangeClient';

interface UseHyperliquidClientResult {
  getAgentExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  getMasterExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  infoClient: hl.InfoClient;
  subscriptionClient: hl.SubscriptionClient;
  getSymbolConverter: () => Promise<SymbolConverter>;
}

export function useHyperliquidClient(): UseHyperliquidClientResult {
  const { getAgentExchangeClient } = useAgentExchangeClient();
  const { getMasterExchangeClient } = useMasterExchangeClient();

  // Get singleton instances directly
  const infoClient = useMemo(() => getInfoClient(), []);
  const subscriptionClient = useMemo(() => getSubscriptionClient(), []);

  return useMemo(
    () => ({
      getAgentExchangeClient,
      getMasterExchangeClient,
      infoClient,
      subscriptionClient,
      getSymbolConverter,
    }),
    [getAgentExchangeClient, getMasterExchangeClient, infoClient, subscriptionClient],
  );
}
