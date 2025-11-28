/**
 * DI Container - Awilix Setup
 *
 * Creates and configures the application-wide dependency injection container.
 * All services are registered here with their dependencies.
 *
 * Container Lifecycle:
 * - Created once per app instance
 * - All services are singletons (SCOPE.SINGLETON)
 * - WalletService is injected from React Context (can't be created in DI)
 */

import { asValue, asFunction, createContainer, InjectionMode } from 'awilix';

import type { AppContainer, AppCradle } from './types';

// Infrastructure
import { HyperliquidGateway } from '@/infra/hyperliquid/hyperliquidGateway';

// Adapters
import { SentryAdapter } from '@/contexts/telemetry/adapters/sentryAdapter';
import { SegmentAdapter } from '@/contexts/telemetry/adapters/segmentAdapter';
import { AlertAgentApprovalConfirmationAdapter } from '@/contexts/agent/adapters/alertAgentApprovalConfirmationAdapter';
import { AlertBuilderFeeApprovalConfirmationAdapter } from '@/contexts/builderFee/adapters/alertBuilderFeeApprovalConfirmationAdapter';
import { ArbitrumBridgeAdapter } from '@/contexts/bridge/adapters/arbitrumBridgeAdapter';

// Services
import { TelemetryService } from '@/contexts/telemetry/application/telemetryService';
import { MarketService } from '@/contexts/market/application/marketService';

// BuilderFee UseCases
import { GetBuilderFeeStatusUseCase } from '@/contexts/builderFee/application/usecases/GetBuilderFeeStatusUseCase';
import { ApproveBuilderFeeUseCase } from '@/contexts/builderFee/application/usecases/ApproveBuilderFeeUseCase';
import { RevokeBuilderFeeUseCase } from '@/contexts/builderFee/application/usecases/RevokeBuilderFeeUseCase';
import { EnsureBuilderFeeUseCase } from '@/contexts/builderFee/application/usecases/EnsureBuilderFeeUseCase';
import { GetUserFeesUseCase } from '@/contexts/builderFee/application/usecases/GetUserFeesUseCase';

// Referral UseCases
import { GetReferralStatusUseCase } from '@/contexts/referral/application/usecases/GetReferralStatusUseCase';
import { SetReferrerUseCase } from '@/contexts/referral/application/usecases/SetReferrerUseCase';

// Bridge UseCases
import { GetArbitrumBalanceUseCase } from '@/contexts/bridge/application/usecases/GetArbitrumBalanceUseCase';
import { GetArbitrumEthBalanceUseCase } from '@/contexts/bridge/application/usecases/GetArbitrumEthBalanceUseCase';
import { GetWithdrawableBalanceUseCase } from '@/contexts/bridge/application/usecases/GetWithdrawableBalanceUseCase';
import { DepositUsdcUseCase } from '@/contexts/bridge/application/usecases/DepositUsdcUseCase';
import { WithdrawUsdcUseCase } from '@/contexts/bridge/application/usecases/WithdrawUsdcUseCase';

// Agent UseCases
import { GetOrCreateAgentWalletUseCase } from '@/contexts/agent/application/usecases/GetOrCreateAgentWalletUseCase';
import { GetAgentStatusUseCase } from '@/contexts/agent/application/usecases/GetAgentStatusUseCase';
import { ApproveAgentUseCase } from '@/contexts/agent/application/usecases/ApproveAgentUseCase';
import { RevokeAgentUseCase } from '@/contexts/agent/application/usecases/RevokeAgentUseCase';
import { TryGetAgentWalletUseCase } from '@/contexts/agent/application/usecases/TryGetAgentWalletUseCase';

// Margin UseCases
import { SetMarginLeverageUseCase } from '@/contexts/margin/application/usecases/SetMarginLeverageUseCase';

// Order UseCases
import { PlaceOrderUseCase } from '@/contexts/order/application/usecases/PlaceOrderUseCase';
import { PlaceCloseMarketOrderUseCase } from '@/contexts/order/application/usecases/PlaceCloseMarketOrderUseCase';
import { PlaceCloseLimitOrderUseCase } from '@/contexts/order/application/usecases/PlaceCloseLimitOrderUseCase';
import { PlaceTpSlOrdersUseCase } from '@/contexts/order/application/usecases/PlaceTpSlOrdersUseCase';
import { CancelOrdersUseCase } from '@/contexts/order/application/usecases/CancelOrdersUseCase';

// Notification Adapters
import { BackendNotificationApiAdapter } from '@/contexts/notification/adapters/backendNotificationApiAdapter';

// Notification UseCases
import { RegisterDeviceUseCase } from '@/contexts/notification/application/usecases/RegisterDeviceUseCase';
import { UnregisterDeviceUseCase } from '@/contexts/notification/application/usecases/UnregisterDeviceUseCase';

// Agent Adapters
import { AgentPkStore } from '@/contexts/agent/adapters/agentPkStore';

// Ports (for interface injection)
import type { WalletPort } from '@/contexts/wallet/ports/walletPort';

/**
 * Container creation options
 */
export interface CreateContainerOptions {
  /**
   * WalletService from React Context
   * (cannot be created in DI due to hook dependencies)
   */
  walletService: WalletPort;
}

/**
 * Create the application DI container
 *
 * This function sets up the entire dependency graph for the application.
 * Services are registered using factory functions for explicit control.
 *
 * Dependency Resolution Strategy:
 * - PROXY injection mode: Works with minified/bundled code
 * - asFunction: Factory functions with explicit dependencies (safest approach)
 * - asValue: Pre-created instances (walletService from React Context)
 * - SINGLETON scope: All services are singletons (created once)
 *
 * @param options - Container options (walletService from React Context)
 * @returns Configured AppContainer
 */
export function createAppContainer(options: CreateContainerOptions): AppContainer {
  const { walletService } = options;

  // Create Awilix container with PROXY injection mode (default, works with minified code)
  const container = createContainer<AppCradle>({
    injectionMode: InjectionMode.PROXY,
  });

  // ==========================================================================
  // External Dependencies (from React Context)
  // ==========================================================================

  container.register({
    // WalletService: Injected from React Context (created with hooks)
    walletService: asValue(walletService),
  });

  // ==========================================================================
  // Infrastructure Layer
  // ==========================================================================

  container.register({
    // HyperliquidGateway: Unified data access layer for Hyperliquid API
    hyperliquidGateway: asFunction(() => new HyperliquidGateway()).singleton(),
  });

  // ==========================================================================
  // Domain Services (Core Business Logic)
  // ==========================================================================

  container.register({
    // Telemetry Service (no dependencies on other domain services)
    telemetryService: asFunction(() => {
      const sentryAdapter = new SentryAdapter();
      const segmentAdapter = new SegmentAdapter();
      return new TelemetryService(sentryAdapter, segmentAdapter);
    }).singleton(),

    // Market Service (depends on HyperliquidGateway)
    marketService: asFunction(({ hyperliquidGateway }) => {
      return new MarketService(hyperliquidGateway);
    }).singleton(),

    // Agent Service removed - replaced with UseCases pattern
    // Margin Service removed - replaced with UseCases pattern (WebSocket subscription moved to React layer)
    // Order Command Service removed - replaced with UseCases pattern
  });

  // ==========================================================================
  // BuilderFee Context - Out Ports (Adapters)
  // ==========================================================================

  container.register({
    // BuilderFeeExchangePort: Implemented by HyperliquidGateway directly
    builderFeeExchangePort: asFunction(({ hyperliquidGateway }) => {
      return hyperliquidGateway;
    }).singleton(),

    // BuilderFeeConfirmationPort: React Native Alert adapter
    builderFeeConfirmationPort: asFunction(({ walletService }) => {
      return new AlertBuilderFeeApprovalConfirmationAdapter(walletService);
    }).singleton(),
  });

  // ==========================================================================
  // BuilderFee Context - UseCases
  // ==========================================================================

  container.register({
    // GetBuilderFeeStatusUseCase: Query approval status
    getBuilderFeeStatusUseCase: asFunction(({ builderFeeExchangePort }) => {
      return new GetBuilderFeeStatusUseCase(builderFeeExchangePort);
    }).singleton(),

    // ApproveBuilderFeeUseCase: Execute approval
    approveBuilderFeeUseCase: asFunction(
      ({ builderFeeExchangePort, builderFeeConfirmationPort }) => {
        return new ApproveBuilderFeeUseCase(builderFeeExchangePort, builderFeeConfirmationPort);
      },
    ).singleton(),

    // RevokeBuilderFeeUseCase: Revoke approval
    revokeBuilderFeeUseCase: asFunction(({ builderFeeExchangePort }) => {
      return new RevokeBuilderFeeUseCase(builderFeeExchangePort);
    }).singleton(),

    // EnsureBuilderFeeUseCase: Composition UseCase - ensure approval with automatic flow
    ensureBuilderFeeUseCase: asFunction(
      ({ getBuilderFeeStatusUseCase, approveBuilderFeeUseCase }) => {
        return new EnsureBuilderFeeUseCase(getBuilderFeeStatusUseCase, approveBuilderFeeUseCase);
      },
    ).singleton(),

    // GetUserFeesUseCase: Query user fee rates with discounts
    getUserFeesUseCase: asFunction(({ builderFeeExchangePort }) => {
      return new GetUserFeesUseCase(builderFeeExchangePort);
    }).singleton(),
  });

  // ==========================================================================
  // Referral Context - Out Ports (Adapters)
  // ==========================================================================

  container.register({
    // ReferralExchangePort: Implemented by HyperliquidGateway directly
    referralExchangePort: asFunction(({ hyperliquidGateway }) => {
      return hyperliquidGateway;
    }).singleton(),
  });

  // ==========================================================================
  // Referral Context - UseCases
  // ==========================================================================

  container.register({
    // GetReferralStatusUseCase: Query referral status
    getReferralStatusUseCase: asFunction(({ referralExchangePort }) => {
      return new GetReferralStatusUseCase(referralExchangePort);
    }).singleton(),

    // SetReferrerUseCase: Set referrer code
    setReferrerUseCase: asFunction(({ referralExchangePort }) => {
      return new SetReferrerUseCase(referralExchangePort);
    }).singleton(),
  });

  // ==========================================================================
  // Bridge Context - Out Ports
  // ==========================================================================

  container.register({
    // ArbitrumBridgePort: Implemented by ArbitrumBridgeAdapter
    arbitrumBridgePort: asFunction(({ telemetryService }) => {
      return new ArbitrumBridgeAdapter(telemetryService);
    }).singleton(),

    // HyperliquidBridgePort: Implemented by HyperliquidGateway directly
    hyperliquidBridgePort: asFunction(({ hyperliquidGateway }) => {
      return hyperliquidGateway;
    }).singleton(),
  });

  // ==========================================================================
  // Bridge Context - UseCases
  // ==========================================================================

  container.register({
    // GetArbitrumBalanceUseCase: Query USDC balance on Arbitrum
    getArbitrumBalanceUseCase: asFunction(({ arbitrumBridgePort }) => {
      return new GetArbitrumBalanceUseCase(arbitrumBridgePort);
    }).singleton(),

    // GetArbitrumEthBalanceUseCase: Query ETH balance on Arbitrum
    getArbitrumEthBalanceUseCase: asFunction(({ arbitrumBridgePort }) => {
      return new GetArbitrumEthBalanceUseCase(arbitrumBridgePort);
    }).singleton(),

    // GetWithdrawableBalanceUseCase: Query withdrawable USDC on Hyperliquid
    getWithdrawableBalanceUseCase: asFunction(({ hyperliquidBridgePort }) => {
      return new GetWithdrawableBalanceUseCase(hyperliquidBridgePort);
    }).singleton(),

    // DepositUsdcUseCase: Deposit USDC from Arbitrum to Hyperliquid
    depositUsdcUseCase: asFunction(({ arbitrumBridgePort }) => {
      return new DepositUsdcUseCase(arbitrumBridgePort);
    }).singleton(),

    // WithdrawUsdcUseCase: Withdraw USDC from Hyperliquid to Arbitrum
    withdrawUsdcUseCase: asFunction(({ hyperliquidBridgePort }) => {
      return new WithdrawUsdcUseCase(hyperliquidBridgePort);
    }).singleton(),
  });

  // ==========================================================================
  // Agent Context - Out Ports
  // ==========================================================================

  container.register({
    // AgentExchangePort: Implemented by HyperliquidGateway directly
    agentExchangePort: asFunction(({ hyperliquidGateway }) => {
      return hyperliquidGateway;
    }).singleton(),

    // AgentStoragePort: Implemented by AgentPkStore
    agentStoragePort: asFunction(() => {
      return new AgentPkStore();
    }).singleton(),

    // AgentApprovalConfirmationPort: React Native Alert adapter
    agentApprovalConfirmationPort: asFunction(({ walletService }) => {
      return new AlertAgentApprovalConfirmationAdapter(walletService);
    }).singleton(),
  });

  // ==========================================================================
  // Agent Context - UseCases (Fine-grained)
  // ==========================================================================

  container.register({
    // GetOrCreateAgentWalletUseCase: Get or create agent wallet from storage
    getOrCreateAgentWalletUseCase: asFunction(({ agentStoragePort }) => {
      return new GetOrCreateAgentWalletUseCase(agentStoragePort);
    }).singleton(),

    // GetAgentStatusUseCase: Query complete agent status
    getAgentStatusUseCase: asFunction(({ agentStoragePort, agentExchangePort }) => {
      return new GetAgentStatusUseCase(agentStoragePort, agentExchangePort);
    }).singleton(),

    // ApproveAgentUseCase: Approve agent on blockchain
    approveAgentUseCase: asFunction(({ agentExchangePort, agentApprovalConfirmationPort }) => {
      return new ApproveAgentUseCase(agentExchangePort, agentApprovalConfirmationPort);
    }).singleton(),

    // RevokeAgentUseCase: Revoke agent from blockchain
    revokeAgentUseCase: asFunction(({ agentExchangePort, agentStoragePort }) => {
      return new RevokeAgentUseCase(agentExchangePort, agentStoragePort);
    }).singleton(),
  });

  // ==========================================================================
  // Agent Context - High-level Composition UseCase
  // ==========================================================================

  container.register({
    // TryGetAgentWalletUseCase: High-level UseCase for cross-context usage
    // Composes fine-grained UseCases to provide one-stop agent wallet retrieval
    tryGetAgentWalletUseCase: asFunction(
      ({
        walletService,
        getOrCreateAgentWalletUseCase,
        approveAgentUseCase,
        getAgentStatusUseCase,
      }) => {
        return new TryGetAgentWalletUseCase(
          walletService,
          getOrCreateAgentWalletUseCase,
          approveAgentUseCase,
          getAgentStatusUseCase,
        );
      },
    ).singleton(),
  });

  // ==========================================================================
  // Margin Context - Out Ports
  // ==========================================================================

  container.register({
    // MarginExchangePort: Implemented by HyperliquidGateway directly
    marginExchangePort: asFunction(({ hyperliquidGateway }) => {
      return hyperliquidGateway;
    }).singleton(),
  });

  // ==========================================================================
  // Margin Context - UseCases
  // ==========================================================================

  container.register({
    // SetMarginLeverageUseCase: Update margin mode and leverage
    setMarginLeverageUseCase: asFunction(({ marginExchangePort }) => {
      return new SetMarginLeverageUseCase(marginExchangePort);
    }).singleton(),
  });

  // ==========================================================================
  // Order Context - Out Ports
  // ==========================================================================

  container.register({
    // OrderExchangePort: Implemented by HyperliquidGateway directly
    orderExchangePort: asFunction(({ hyperliquidGateway }) => {
      return hyperliquidGateway;
    }).singleton(),
  });

  // ==========================================================================
  // Order Context - UseCases
  // ==========================================================================

  container.register({
    // PlaceOrderUseCase: Unified order placement (Market/Limit with optional TP/SL)
    placeOrderUseCase: asFunction(
      ({
        orderExchangePort,
        tryGetAgentWalletUseCase,
        ensureBuilderFeeUseCase,
        marketService,
        walletService,
        telemetryService,
      }) => {
        return new PlaceOrderUseCase(
          orderExchangePort,
          tryGetAgentWalletUseCase,
          ensureBuilderFeeUseCase,
          marketService,
          walletService,
          telemetryService,
        );
      },
    ).singleton(),

    // PlaceCloseMarketOrderUseCase: Close position with market order
    placeCloseMarketOrderUseCase: asFunction(
      ({
        orderExchangePort,
        tryGetAgentWalletUseCase,
        ensureBuilderFeeUseCase,
        marketService,
        walletService,
      }) => {
        return new PlaceCloseMarketOrderUseCase(
          orderExchangePort,
          tryGetAgentWalletUseCase,
          ensureBuilderFeeUseCase,
          marketService,
          walletService,
        );
      },
    ).singleton(),

    // PlaceCloseLimitOrderUseCase: Close position with limit order
    placeCloseLimitOrderUseCase: asFunction(
      ({
        orderExchangePort,
        tryGetAgentWalletUseCase,
        ensureBuilderFeeUseCase,
        marketService,
        walletService,
      }) => {
        return new PlaceCloseLimitOrderUseCase(
          orderExchangePort,
          tryGetAgentWalletUseCase,
          ensureBuilderFeeUseCase,
          marketService,
          walletService,
        );
      },
    ).singleton(),

    // PlaceTpSlOrdersUseCase: Place TP/SL orders on existing position
    placeTpSlOrdersUseCase: asFunction(
      ({
        orderExchangePort,
        tryGetAgentWalletUseCase,
        ensureBuilderFeeUseCase,
        marketService,
        walletService,
      }) => {
        return new PlaceTpSlOrdersUseCase(
          orderExchangePort,
          tryGetAgentWalletUseCase,
          ensureBuilderFeeUseCase,
          marketService,
          walletService,
        );
      },
    ).singleton(),

    // CancelOrdersUseCase: Batch cancel orders (no BuilderFee required)
    cancelOrdersUseCase: asFunction(
      ({ orderExchangePort, tryGetAgentWalletUseCase, marketService }) => {
        return new CancelOrdersUseCase(orderExchangePort, tryGetAgentWalletUseCase, marketService);
      },
    ).singleton(),
  });

  // ==========================================================================
  // Notification Context - Out Ports
  // ==========================================================================

  container.register({
    // NotificationApiPort: Implemented by BackendNotificationApiAdapter
    notificationApiPort: asFunction(() => {
      return new BackendNotificationApiAdapter();
    }).singleton(),
  });

  // ==========================================================================
  // Notification Context - UseCases
  // ==========================================================================

  container.register({
    // RegisterDeviceUseCase: Register device for push notifications
    registerDeviceUseCase: asFunction(({ notificationApiPort }) => {
      return new RegisterDeviceUseCase(notificationApiPort);
    }).singleton(),

    // UnregisterDeviceUseCase: Unregister device from push notifications
    unregisterDeviceUseCase: asFunction(({ notificationApiPort }) => {
      return new UnregisterDeviceUseCase(notificationApiPort);
    }).singleton(),
  });

  return container;
}
