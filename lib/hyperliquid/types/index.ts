// Type re-exports for backward compatibility
// Types have been moved to their respective domain directories:
// - Order types: @/lib/riverrun/order/orders
// - Fill types: @/lib/riverrun/history/fills

export type {
  Order,
  OrderType,
  OrderSide,
  OrderStatus,
  TimeInForce,
  BaseOrder,
  TriggerOrder,
  RegularOrder,
  OrderMetrics,
  ApiOrderResponse,
} from '@/lib/riverrun/order/orders';

export type {
  Fill,
  FillSide,
  FillDirection,
  FillLiquidation,
  UserFillsResponse,
  WsFillUpdate,
} from '@/lib/riverrun/history/fills';
