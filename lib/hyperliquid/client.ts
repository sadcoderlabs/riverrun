import * as hl from '@nktkas/hyperliquid';
import { SymbolConverter } from '@nktkas/hyperliquid/utils';

// Singleton instances - shared across all usages
let transport: hl.HttpTransport | undefined;
let infoClient: hl.InfoClient | undefined;
let wsTransport: hl.WebSocketTransport | undefined;
let subscriptionClient: hl.SubscriptionClient | undefined;
let symbolConverter: SymbolConverter | undefined;

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

export async function getSymbolConverter(): Promise<SymbolConverter> {
  if (!symbolConverter) {
    symbolConverter = await SymbolConverter.create({ transport: getTransport() });
  }
  return symbolConverter;
}
