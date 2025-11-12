import * as hl from '@nktkas/hyperliquid';
import type { Signer } from 'ethers';

// Singleton instances - shared across all usages
let transport: hl.HttpTransport | undefined;
let infoClient: hl.InfoClient | undefined;
let wsTransport: hl.WebSocketTransport | undefined;
let subscriptionClient: hl.SubscriptionClient | undefined;

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
 * Create an ExchangeClient for the master wallet.
 *
 * @param wallet - The Signer instance for the wallet
 * @returns ExchangeClient instance
 */
export function getMasterExchangeClient(wallet: Signer): hl.ExchangeClient {
  const client = new hl.ExchangeClient({
    wallet,
    transport: getTransport(),
  });
  return client;
}

/**
 * Create an ExchangeClient for an agent wallet.
 *
 * @param wallet - The Signer instance for the agent wallet
 * @returns ExchangeClient instance
 */
export function getAgentExchangeClient(wallet: Signer): hl.ExchangeClient {
  const client = new hl.ExchangeClient({
    wallet,
    transport: getTransport(),
  });
  return client;
}
