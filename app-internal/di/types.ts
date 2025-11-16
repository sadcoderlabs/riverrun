/**
 * DI Container Types
 *
 * Defines the type-safe cradle for the Awilix DI container.
 * This provides autocomplete and type checking for all registered services.
 */

import type { AwilixContainer } from 'awilix';
import type { TelemetryPort } from '@/contexts/telemetry/ports/telemetryPort';
import type { WalletPort } from '@/contexts/wallet/ports/walletPort';
import type { MarketPort } from '@/contexts/market/ports/marketPort';
import type { AgentPort } from '@/contexts/agent/ports/agentPort';
import type { BuilderFeePort } from '@/contexts/builderFee/ports/builderFeePort';
import type { ReferralPort } from '@/contexts/referral/ports/referralPort';
import type { BridgePort } from '@/contexts/bridge/ports/bridgePort';
import type { MarginPort } from '@/contexts/margin/ports/marginPort';
import type { OrderCommandPort } from '@/contexts/order/ports/orderCommandPort';
import type { HyperliquidGateway } from '@/infra/hyperliquid/hyperliquidGateway';

/**
 * AppCradle - Type-safe container cradle
 *
 * Defines all services available in the DI container.
 * Services are resolved by name from this cradle.
 */
export interface AppCradle {
  // Infrastructure
  hyperliquidGateway: HyperliquidGateway;

  // Core Services
  walletService: WalletPort;
  telemetryService: TelemetryPort;
  marketService: MarketPort;

  // Domain Services
  agentService: AgentPort;
  builderFeeService: BuilderFeePort;
  referralService: ReferralPort;
  bridgeService: BridgePort;
  marginService: MarginPort;

  // Command Services
  orderCommandService: OrderCommandPort;
}

/**
 * Type-safe Awilix container with AppCradle
 */
export type AppContainer = AwilixContainer<AppCradle>;
