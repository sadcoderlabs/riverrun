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
import { HyperliquidBuilderFeeAdapter } from '@/contexts/builderFee/adapters/hyperliquidBuilderFeeAdapter';
import { BuilderFeeStateAdapter } from '@/contexts/builderFee/adapters/builderFeeStateAdapter';
import { BuilderFeeApprovalAdapter } from '@/contexts/builderFee/adapters/builderFeeApprovalAdapter';

// Services
import { TelemetryService } from '@/contexts/telemetry/application/telemetryService';
import { MarketService } from '@/contexts/market/application/marketService';
import { AgentService } from '@/contexts/agent/application/agentService';
import { ReferralService } from '@/contexts/referral/application/referralService';
import { BridgeService } from '@/contexts/bridge/application/bridgeService';
import { MarginService } from '@/contexts/margin/application/marginService';
import { OrderCommandService } from '@/contexts/order/application/orderCommandService';

// BuilderFee UseCases
import { EnsureBuilderFeeApprovalUseCase } from '@/contexts/builderFee/application/usecases/EnsureBuilderFeeApprovalUseCase';
import { CheckBuilderFeeStatusUseCase } from '@/contexts/builderFee/application/usecases/CheckBuilderFeeStatusUseCase';
import { RevokeBuilderFeeUseCase } from '@/contexts/builderFee/application/usecases/RevokeBuilderFeeUseCase';

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

    // Agent Service (depends on Wallet + HyperliquidGateway + Approval Confirmation)
    agentService: asFunction(({ walletService, hyperliquidGateway }) => {
      const approvalConfirmation = new AlertAgentApprovalConfirmationAdapter(walletService);
      return new AgentService(walletService, hyperliquidGateway, approvalConfirmation);
    }).singleton(),

    // Referral Service (depends on Wallet + HyperliquidGateway)
    referralService: asFunction(({ walletService, hyperliquidGateway }) => {
      return new ReferralService(walletService, hyperliquidGateway);
    }).singleton(),

    // Bridge Service (depends on Wallet + HyperliquidGateway)
    bridgeService: asFunction(({ walletService, hyperliquidGateway }) => {
      return new BridgeService(walletService, hyperliquidGateway);
    }).singleton(),

    // Margin Service (depends on Wallet + Agent + HyperliquidGateway)
    marginService: asFunction(({ walletService, agentService, hyperliquidGateway }) => {
      return new MarginService(walletService, agentService, hyperliquidGateway);
    }).singleton(),

    // Order Command Service (depends on Agent + BuilderFee + Market + HyperliquidGateway)
    orderCommandService: asFunction(
      ({ agentService, builderFeeApprovalPort, marketService, hyperliquidGateway }) => {
        return new OrderCommandService(
          agentService,
          builderFeeApprovalPort,
          marketService,
          hyperliquidGateway,
        );
      },
    ).singleton(),
  });

  // ==========================================================================
  // BuilderFee Context - Out Ports (Adapters)
  // ==========================================================================

  container.register({
    // BuilderFeeExchangePort: Hyperliquid exchange adapter
    builderFeeExchangePort: asFunction(({ hyperliquidGateway }) => {
      return new HyperliquidBuilderFeeAdapter(hyperliquidGateway);
    }).singleton(),

    // BuilderFeeStatePort: Zustand state adapter
    builderFeeStatePort: asFunction(() => {
      return new BuilderFeeStateAdapter();
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
    // EnsureBuilderFeeApprovalUseCase: Main approval flow
    ensureBuilderFeeApprovalUseCase: asFunction(
      ({ walletService, builderFeeExchangePort, builderFeeConfirmationPort }) => {
        return new EnsureBuilderFeeApprovalUseCase(
          walletService,
          builderFeeExchangePort,
          builderFeeConfirmationPort,
        );
      },
    ).singleton(),

    // CheckBuilderFeeStatusUseCase: Query approval status
    checkBuilderFeeStatusUseCase: asFunction(({ walletService, builderFeeExchangePort }) => {
      return new CheckBuilderFeeStatusUseCase(walletService, builderFeeExchangePort);
    }).singleton(),

    // RevokeBuilderFeeUseCase: Revoke approval
    revokeBuilderFeeUseCase: asFunction(({ walletService, builderFeeExchangePort }) => {
      return new RevokeBuilderFeeUseCase(walletService, builderFeeExchangePort);
    }).singleton(),
  });

  // ==========================================================================
  // BuilderFee Context - Cross-context Adapter
  // ==========================================================================

  container.register({
    // BuilderFeeApprovalPort: Adapter for order context to use
    builderFeeApprovalPort: asFunction(({ ensureBuilderFeeApprovalUseCase }) => {
      return new BuilderFeeApprovalAdapter(ensureBuilderFeeApprovalUseCase);
    }).singleton(),
  });

  return container;
}
