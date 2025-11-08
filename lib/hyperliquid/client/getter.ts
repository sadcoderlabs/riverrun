import * as hl from '@nktkas/hyperliquid';
import type { Signer } from 'ethers';

// Singleton instances - shared across all usages
let transport: hl.HttpTransport | undefined;
let infoClient: hl.InfoClient | undefined;
let wsTransport: hl.WebSocketTransport | undefined;
let subscriptionClient: hl.SubscriptionClient | undefined;

// ExchangeClient cache - keyed by wallet address
interface ExchangeClientCache {
  address: string;
  wallet: Signer;
  client: hl.ExchangeClient;
}
let masterExchangeClientCache: ExchangeClientCache | undefined;
let agentExchangeClientCache: ExchangeClientCache | undefined;

export function getTransport(): hl.HttpTransport {
  if (!transport) {
    transport = new hl.HttpTransport();
  }
  return transport;
}

export function getInfoClient(): hl.InfoClient {
  if (!infoClient) {
    infoClient = new hl.InfoClient({ transport: getTransport() });
  }
  return infoClient;
}

export function getSubscriptionClient(): hl.SubscriptionClient {
  if (!subscriptionClient || !wsTransport) {
    wsTransport = new hl.WebSocketTransport();
    subscriptionClient = new hl.SubscriptionClient({ transport: wsTransport });
  }
  return subscriptionClient;
}

/**
 * Get or create a cached ExchangeClient for the master wallet.
 * Only creates a new instance if wallet address changes.
 *
 * @param address - The wallet address
 * @param wallet - The Signer instance for the wallet
 * @returns ExchangeClient instance
 */
export function getMasterExchangeClient(address: string, wallet: Signer): hl.ExchangeClient {
  // Return cached client if wallet hasn't changed
  if (masterExchangeClientCache && masterExchangeClientCache.address === address) {
    return masterExchangeClientCache.client;
  }

  // Create new client and cache it
  const client = new hl.ExchangeClient({
    wallet,
    transport: getTransport(),
  });

  masterExchangeClientCache = { address, wallet, client };
  return client;
}

/**
 * Get or create a cached ExchangeClient for an agent wallet.
 * Only creates a new instance if wallet address changes.
 *
 * @param address - The wallet address
 * @param wallet - The Signer instance for the agent wallet
 * @returns ExchangeClient instance
 */
export function getAgentExchangeClient(address: string, wallet: Signer): hl.ExchangeClient {
  // Return cached client if wallet hasn't changed
  if (agentExchangeClientCache && agentExchangeClientCache.address === address) {
    return agentExchangeClientCache.client;
  }

  // Create new client and cache it
  const client = new hl.ExchangeClient({
    wallet,
    transport: getTransport(),
  });

  agentExchangeClientCache = { address, wallet, client };
  return client;
}

/**
 * Clear all cached ExchangeClient instances.
 * Call this when user disconnects wallet or switches accounts.
 */
export function clearExchangeClientCache(): void {
  masterExchangeClientCache = undefined;
  agentExchangeClientCache = undefined;
}
