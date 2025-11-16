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

// Services
import { TelemetryService } from '@/contexts/telemetry/application/telemetryService';
import { MarketService } from '@/contexts/market/application/marketService';
import { AgentService } from '@/contexts/agent/application/agentService';
import { ReferralService } from '@/contexts/referral/application/referralService';
import { BridgeService } from '@/contexts/bridge/application/bridgeService';
import { MarginService } from '@/contexts/margin/application/marginService';
import { OrderCommandService } from '@/contexts/order/application/orderCommandService';

// BuilderFee UseCases
import { GetBuilderFeeStatusUseCase } from '@/contexts/builderFee/application/usecases/GetBuilderFeeStatusUseCase';
import { ApproveBuilderFeeUseCase } from '@/contexts/builderFee/application/usecases/ApproveBuilderFeeUseCase';
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

    // Order Command Service (depends on Agent + BuilderFee UseCases + Wallet + Market + HyperliquidGateway)
    orderCommandService: asFunction(
      ({
        agentService,
        getBuilderFeeStatusUseCase,
        approveBuilderFeeUseCase,
        walletService,
        marketService,
        hyperliquidGateway,
      }) => {
        return new OrderCommandService(
          agentService,
          getBuilderFeeStatusUseCase,
          approveBuilderFeeUseCase,
          walletService,
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
  });

  return container;
}
