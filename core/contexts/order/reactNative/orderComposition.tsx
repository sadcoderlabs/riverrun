/**
 * Order Composition Provider
 *
 * Sets up the dependency graph for the Order context using CQRS pattern:
 *
 * Dependencies:
 * - AgentPort: Get agent exchange client for order operations
 * - BuilderFeePort: Ensure builder fee approval
 * - MarketPort: Get market metadata (assetId, szDecimals)
 * - HyperliquidGateway: Subscribe to order updates and fetch order data
 *
 * Domain Layer:
 * - OrderCommandService: Command operations (place, cancel orders)
 * - OrderQueryService: Query operations (subscriptions, real-time updates)
 *
 * Both services work autonomously to provide complete order functionality.
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { OrderCommandService } from '../application/orderCommandService';
import { OrderQueryService } from '../application/orderQueryService';
import type { OrderCommandPort } from '../ports/orderCommandPort';
import type { OrderQueryPort } from '../ports/orderQueryPort';
import { AgentCompositionContext } from '../../agent/reactNative/agentComposition';
import { BuilderFeeCompositionContext } from '../../builderFee/reactNative/builderFeeComposition';
import { MarketContext } from '../../market/reactNative/marketComposition';
import { HyperliquidGateway } from '@/core/infra/hyperliquid/hyperliquidGateway';

// ============================================================================
// Context Definition
// ============================================================================

interface OrderContextValue {
  orderCommandService: OrderCommandPort;
  orderQueryService: OrderQueryPort;
}

const OrderContext = createContext<OrderContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface OrderCompositionProviderProps {
  children: ReactNode;
}

export function OrderCompositionProvider({ children }: OrderCompositionProviderProps) {
  // Get required dependencies from other contexts (dependency injection)
  const agentContext = useContext(AgentCompositionContext);
  const builderFeeContext = useContext(BuilderFeeCompositionContext);
  const marketContext = useContext(MarketContext);

  // Validate dependencies
  if (!agentContext) {
    throw new Error('OrderCompositionProvider must be used within AgentCompositionProvider');
  }
  if (!builderFeeContext) {
    throw new Error('OrderCompositionProvider must be used within BuilderFeeCompositionProvider');
  }
  if (!marketContext) {
    throw new Error('OrderCompositionProvider must be used within MarketCompositionProvider');
  }

  const { agentService } = agentContext;
  const { builderFeeService } = builderFeeContext;
  const { marketService } = marketContext;

  // Create stable service instances (CQRS pattern)
  const { orderCommandService, orderQueryService } = useMemo(() => {
    // Infrastructure: HyperliquidGateway for data access
    const hyperliquidGateway = new HyperliquidGateway();

    // Create query service (manages real-time data subscriptions)
    const queryService = new OrderQueryService(hyperliquidGateway);

    // Create command service (executes order operations)
    const commandService = new OrderCommandService(agentService, builderFeeService, marketService);

    return {
      orderCommandService: commandService,
      orderQueryService: queryService,
    };
  }, [agentService, builderFeeService, marketService]);

  // Manage query service lifecycle (subscriptions)
  useEffect(() => {
    // Start query service (begins monitoring wallet changes and subscriptions)
    orderQueryService.start();

    return () => {
      // Stop query service (cleanup subscriptions)
      orderQueryService.stop();
    };
  }, [orderQueryService]);

  const value = useMemo(
    () => ({
      orderCommandService,
      orderQueryService,
    }),
    [orderCommandService, orderQueryService],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

// ============================================================================
// Context Hook
// ============================================================================

/**
 * Hook to access the Order context
 *
 * @throws Error if used outside OrderCompositionProvider
 */
export function useOrderContext(): OrderContextValue {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrderContext must be used within OrderCompositionProvider');
  }
  return context;
}
