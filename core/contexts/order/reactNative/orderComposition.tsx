/**
 * Order Composition Provider
 *
 * Sets up the dependency graph for the Order context:
 *
 * Dependencies:
 * - AgentPort: Get agent exchange client for order operations
 * - BuilderFeePort: Ensure builder fee approval
 * - MarketPort: Get market metadata (assetId, szDecimals)
 * - HyperliquidGateway: Subscribe to order updates and fetch order data
 *
 * Domain Layer:
 * - OrderService: Core business logic for order operations and subscription management
 *
 * OrderService automatically monitors active wallet changes and manages subscriptions.
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { OrderService } from '../application/orderService';
import type { OrderPort } from '../ports/orderPort';
import { AgentCompositionContext } from '../../agent/reactNative/agentComposition';
import { BuilderFeeCompositionContext } from '../../builderFee/reactNative/builderFeeComposition';
import { MarketContext } from '../../market/reactNative/marketComposition';
import { HyperliquidGateway } from '@/core/infra/hyperliquid/hyperliquidGateway';

// ============================================================================
// Context Definition
// ============================================================================

interface OrderContextValue {
  orderService: OrderPort;
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

  // Create stable OrderService instance
  const orderService = useMemo(() => {
    // Infrastructure: HyperliquidGateway for data access
    const hyperliquidGateway = new HyperliquidGateway();

    // Domain: OrderService with injected dependencies
    return new OrderService(agentService, builderFeeService, marketService, hyperliquidGateway);
  }, [agentService, builderFeeService, marketService]);

  // Manage service lifecycle
  useEffect(() => {
    // Start service (begins monitoring wallet changes)
    orderService.start();

    return () => {
      // Stop service (cleanup subscriptions)
      orderService.stop();
    };
  }, [orderService]);

  const value = useMemo(
    () => ({
      orderService,
    }),
    [orderService],
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
