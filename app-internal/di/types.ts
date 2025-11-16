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

// Bridge UseCases
import type { GetArbitrumBalanceUseCase } from '@/contexts/bridge/application/usecases/GetArbitrumBalanceUseCase';
import type { GetWithdrawableBalanceUseCase } from '@/contexts/bridge/application/usecases/GetWithdrawableBalanceUseCase';
import type { DepositUsdcUseCase } from '@/contexts/bridge/application/usecases/DepositUsdcUseCase';
import type { WithdrawUsdcUseCase } from '@/contexts/bridge/application/usecases/WithdrawUsdcUseCase';

// Bridge Ports
import type { ArbitrumBridgePort } from '@/contexts/bridge/application/ports/ArbitrumBridgePort';
import type { HyperliquidBridgePort } from '@/contexts/bridge/application/ports/HyperliquidBridgePort';

// Agent UseCases
import type { GetOrCreateAgentWalletUseCase } from '@/contexts/agent/application/usecases/GetOrCreateAgentWalletUseCase';
import type { GetAgentStatusUseCase } from '@/contexts/agent/application/usecases/GetAgentStatusUseCase';
import type { ApproveAgentUseCase } from '@/contexts/agent/application/usecases/ApproveAgentUseCase';
import type { RevokeAgentUseCase } from '@/contexts/agent/application/usecases/RevokeAgentUseCase';
import type { TryGetAgentWalletUseCase } from '@/contexts/agent/application/usecases/TryGetAgentWalletUseCase';

// Agent Ports
import type { AgentExchangePort } from '@/contexts/agent/application/ports/AgentExchangePort';
import type { AgentStoragePort } from '@/contexts/agent/application/ports/AgentStoragePort';
import type { AgentApprovalConfirmationPort } from '@/contexts/agent/ports/agentApprovalConfirmationPort';

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

  // Bridge Context - Out Ports
  arbitrumBridgePort: ArbitrumBridgePort;
  hyperliquidBridgePort: HyperliquidBridgePort;

  // Bridge Context - UseCases
  getArbitrumBalanceUseCase: GetArbitrumBalanceUseCase;
  getWithdrawableBalanceUseCase: GetWithdrawableBalanceUseCase;
  depositUsdcUseCase: DepositUsdcUseCase;
  withdrawUsdcUseCase: WithdrawUsdcUseCase;

  // Agent Context - Out Ports
  agentExchangePort: AgentExchangePort;
  agentStoragePort: AgentStoragePort;
  agentApprovalConfirmationPort: AgentApprovalConfirmationPort;

  // Agent Context - Fine-grained UseCases
  getOrCreateAgentWalletUseCase: GetOrCreateAgentWalletUseCase;
  getAgentStatusUseCase: GetAgentStatusUseCase;
  approveAgentUseCase: ApproveAgentUseCase;
  revokeAgentUseCase: RevokeAgentUseCase;

  // Agent Context - High-level Composition UseCase
  tryGetAgentWalletUseCase: TryGetAgentWalletUseCase;
}

/**
 * Type-safe Awilix container with AppCradle
 */
export type AppContainer = AwilixContainer<AppCradle>;
