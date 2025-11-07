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
  getInfoClient: () => hl.InfoClient;
  getSubscriptionClient: () => hl.SubscriptionClient;
  getSymbolConverter: () => Promise<SymbolConverter>;
}

export function useHyperliquidClient(): UseHyperliquidClientResult {
  const { getAgentExchangeClient } = useAgentExchangeClient();
  const { getMasterExchangeClient } = useMasterExchangeClient();

  return useMemo(
    () => ({
      getAgentExchangeClient,
      getMasterExchangeClient,
      getInfoClient,
      getSubscriptionClient,
      getSymbolConverter,
    }),
    [getAgentExchangeClient, getMasterExchangeClient],
  );
}
