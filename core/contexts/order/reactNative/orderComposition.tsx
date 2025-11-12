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
 * - OrderCommandService: Command operations (place, cancel orders)
 * - useOrderSubscription: Query operations (subscriptions, real-time updates)
 *
 * The subscription hook manages order data automatically based on wallet lifecycle.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { OrderCommandService } from '../application/orderCommandService';
import type { OrderCommandPort } from '../ports/orderCommandPort';
import { AgentCompositionContext } from '../../agent/reactNative/agentComposition';
import { BuilderFeeCompositionContext } from '../../builderFee/reactNative/builderFeeComposition';
import { MarketContext } from '../../market/reactNative/marketComposition';
import { HyperliquidGateway } from '@/core/infra/hyperliquid/hyperliquidGateway';
import { useOrderSubscription } from './useOrderSubscription';

// ============================================================================
// Context Definition
// ============================================================================

interface OrderContextValue {
  orderCommandService: OrderCommandPort;
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

  // Create stable command service instance
  const orderCommandService = useMemo(() => {
    // Infrastructure: HyperliquidGateway for data access
    const hyperliquidGateway = new HyperliquidGateway();

    // Create command service (executes order operations)
    return new OrderCommandService(
      agentService,
      builderFeeService,
      marketService,
      hyperliquidGateway,
    );
  }, [agentService, builderFeeService, marketService]);

  // Manage order subscriptions automatically (replaces OrderQueryService)
  useOrderSubscription();

  const value = useMemo(
    () => ({
      orderCommandService,
    }),
    [orderCommandService],
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
