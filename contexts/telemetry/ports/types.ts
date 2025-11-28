/**
 * Telemetry Domain Types
 *
 * Type-safe telemetry events and screens to prevent event sprawl.
 * All event names and properties are strictly typed.
 */

// ============================================================================
// User Identification
// ============================================================================

/**
 * User identification for telemetry
 */
export interface TelemetryUser {
  /**
   * Wallet address (primary identifier)
   */
  address: string;

  /**
   * Wallet source/provider
   */
  walletSource?: 'privy' | 'reown';
}

// ============================================================================
// Events - Type-safe event tracking
// ============================================================================

/**
 * All possible telemetry event names
 * Add new events here to maintain type safety
 *
 * Note: App lifecycle events (opened/backgrounded/foregrounded) are automatically
 * tracked by Segment SDK and don't need to be manually defined here.
 */
export type TelemetryEventName =
  // Wallet
  | 'wallet_connected'
  | 'wallet_disconnected'
  | 'wallet_switched'
  // Navigation
  | 'screen_viewed'
  // Trading - Order
  | 'order_placed'
  | 'order_failed'
  | 'order_cancelled'
  | 'close_order_placed'
  | 'tpsl_order_placed'
  // Trading - Market
  | 'market_selected'
  | 'market_favorited'
  | 'leverage_changed'
  // Agent
  | 'agent_approved'
  | 'agent_approval_failed'
  | 'agent_revoked'
  // Builder Fee
  | 'builder_fee_approved'
  | 'builder_fee_failed'
  | 'builder_fee_revoked'
  // Referral
  | 'referral_code_applied'
  | 'referral_code_failed'
  // Deposit
  | 'deposit_initiated'
  | 'deposit_completed'
  | 'deposit_failed'
  // Withdraw
  | 'withdraw_initiated'
  | 'withdraw_completed'
  | 'withdraw_failed'
  // Push Notifications
  | 'push_notification_registered'
  // Login
  | 'login_alternative_requested';

/**
 * Event properties for each event type
 * Enforce correct properties per event
 */
export interface TelemetryEventProps {
  // Wallet
  wallet_connected: {
    walletSource: 'privy' | 'reown';
    address: string;
  };
  wallet_disconnected: {
    walletSource: 'privy' | 'reown';
  };
  wallet_switched: {
    fromAddress: string;
    toAddress: string;
  };

  // Navigation
  screen_viewed: {
    screenName: string;
    params?: Record<string, unknown>;
  };

  // Trading - Order
  order_placed: {
    market: string;
    side: 'long' | 'short';
    orderType: 'market' | 'limit';
    size: number;
    leverage: number;
    price?: number;
    reduceOnly: boolean;
    hasTpSl: boolean;
  };
  order_failed: {
    market: string;
    side: 'long' | 'short';
    orderType: 'market' | 'limit';
    errorCode?: string;
    reason?: string;
  };
  order_cancelled: {
    market: string;
    orderId: number;
    isBatch: boolean;
  };
  close_order_placed: {
    market: string;
    side: 'long' | 'short';
    closeType: 'market' | 'limit';
    size: number;
    price?: number;
  };
  tpsl_order_placed: {
    market: string;
    side: 'long' | 'short';
    hasTp: boolean;
    hasSl: boolean;
    tpTriggerPrice?: number;
    slTriggerPrice?: number;
  };

  // Trading - Market
  market_selected: {
    market: string;
    fromMarket?: string;
  };
  market_favorited: {
    market: string;
    isFavorite: boolean;
  };
  leverage_changed: {
    market: string;
    fromLeverage: number;
    toLeverage: number;
    marginMode: 'cross' | 'isolated';
  };

  // Agent
  agent_approved: {
    agentAddress: string;
    isAutomatic: boolean;
  };
  agent_approval_failed: {
    reason?: string;
  };
  agent_revoked: {
    agentName: string;
  };

  // Builder Fee
  builder_fee_approved: {
    builderAddress: string;
  };
  builder_fee_failed: {
    reason?: string;
  };
  builder_fee_revoked: Record<string, never>;

  // Referral
  referral_code_applied: {
    code: string;
  };
  referral_code_failed: {
    code?: string;
    reason?: string;
  };

  // Deposit
  deposit_initiated: {
    amount: number;
  };
  deposit_completed: {
    amount: number;
    txHash: string;
  };
  deposit_failed: {
    amount: number;
    reason?: string;
  };

  // Withdraw
  withdraw_initiated: {
    amount: number;
    destinationAddress: string;
  };
  withdraw_completed: {
    amount: number;
  };
  withdraw_failed: {
    amount: number;
    reason?: string;
  };

  // Push Notifications
  push_notification_registered: {
    platform: 'ios' | 'android';
  };

  // Login
  login_alternative_requested: Record<string, never>;
}

// ============================================================================
// Screens - Type-safe screen tracking
// ============================================================================

/**
 * All screen names in the app
 * Matches actual routes in app/ directory
 */
export type ScreenName =
  | 'Home'
  | 'Trade'
  | 'Chart'
  | 'Settings'
  | 'DepositCheckpoint'
  | 'DepositBridge'
  | 'Withdraw'
  | 'AgentStatus'
  | 'BuilderFeeStatus'
  | 'ReferralStatus'
  | 'Login';

/**
 * Properties for each screen
 */
export interface ScreenProps {
  Home: undefined;
  Trade: {
    market?: string;
    tab?: 'positions' | 'orders' | 'history';
  };
  Chart: {
    market: string;
  };
  Settings: undefined;
  DepositCheckpoint: undefined;
  DepositBridge: undefined;
  Withdraw: undefined;
  AgentStatus: undefined;
  BuilderFeeStatus: undefined;
  ReferralStatus: undefined;
  Login: undefined;
}

// ============================================================================
// Error Tracking
// ============================================================================

/**
 * Error context for capturing errors
 */
export interface TelemetryErrorContext {
  /**
   * Component where error occurred
   */
  component?: string;

  /**
   * User action that triggered the error
   */
  action?: string;

  /**
   * Additional structured data
   */
  extra?: Record<string, unknown>;

  /**
   * Tags for categorization
   */
  tags?: Record<string, string>;
}

// ============================================================================
// Performance Spans
// ============================================================================

/**
 * Span names for performance tracking
 */
export type SpanName =
  | 'order_submission'
  | 'market_data_fetch'
  | 'wallet_connection'
  | 'agent_approval'
  | 'bridge_transaction';

/**
 * Context for performance spans
 */
export interface SpanContext {
  /**
   * Additional data for the span
   */
  data?: Record<string, unknown>;

  /**
   * Tags for the span
   */
  tags?: Record<string, string>;
}
