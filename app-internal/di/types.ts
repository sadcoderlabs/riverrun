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
import type { BridgePort } from '@/contexts/bridge/ports/bridgePort';
import type { MarginPort } from '@/contexts/margin/ports/marginPort';
import type { OrderCommandPort } from '@/contexts/order/ports/orderCommandPort';
import type { HyperliquidGateway } from '@/infra/hyperliquid/hyperliquidGateway';

// BuilderFee UseCases
import type { GetBuilderFeeStatusUseCase } from '@/contexts/builderFee/application/usecases/GetBuilderFeeStatusUseCase';
import type { ApproveBuilderFeeUseCase } from '@/contexts/builderFee/application/usecases/ApproveBuilderFeeUseCase';
import type { RevokeBuilderFeeUseCase } from '@/contexts/builderFee/application/usecases/RevokeBuilderFeeUseCase';

// BuilderFee Ports
import type { BuilderFeeExchangePort } from '@/contexts/builderFee/application/ports/BuilderFeeExchangePort';
import type { BuilderFeeConfirmationPort } from '@/contexts/builderFee/application/ports/BuilderFeeConfirmationPort';

// Referral UseCases
import type { GetReferralStatusUseCase } from '@/contexts/referral/application/usecases/GetReferralStatusUseCase';
import type { SetReferrerUseCase } from '@/contexts/referral/application/usecases/SetReferrerUseCase';

// Referral Ports
import type { ReferralExchangePort } from '@/contexts/referral/application/ports/ReferralExchangePort';

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
  bridgeService: BridgePort;
  marginService: MarginPort;

  // Command Services
  orderCommandService: OrderCommandPort;

  // BuilderFee Context - Out Ports
  builderFeeExchangePort: BuilderFeeExchangePort;
  builderFeeConfirmationPort: BuilderFeeConfirmationPort;

  // BuilderFee Context - UseCases
  getBuilderFeeStatusUseCase: GetBuilderFeeStatusUseCase;
  approveBuilderFeeUseCase: ApproveBuilderFeeUseCase;
  revokeBuilderFeeUseCase: RevokeBuilderFeeUseCase;

  // Referral Context - Out Ports
  referralExchangePort: ReferralExchangePort;

  // Referral Context - UseCases
  getReferralStatusUseCase: GetReferralStatusUseCase;
  setReferrerUseCase: SetReferrerUseCase;
}

/**
 * Type-safe Awilix container with AppCradle
 */
export type AppContainer = AwilixContainer<AppCradle>;
