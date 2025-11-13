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
 */
export type TelemetryEventName =
  // Lifecycle
  | 'app_opened'
  | 'app_backgrounded'
  | 'app_foregrounded'
  // Wallet
  | 'wallet_connected'
  | 'wallet_disconnected'
  | 'wallet_switched'
  // Navigation
  | 'screen_viewed'
  // Trading - Order
  | 'order_form_opened'
  | 'order_submitted'
  | 'order_confirmed'
  | 'order_failed'
  | 'order_cancelled'
  // Trading - Position
  | 'position_opened'
  | 'position_closed'
  | 'position_modified'
  // Trading - Market
  | 'market_selected'
  | 'leverage_changed'
  // Agent
  | 'agent_approved'
  | 'agent_approval_failed'
  // Builder Fee
  | 'builder_fee_set'
  | 'builder_fee_failed'
  // Referral
  | 'referral_code_applied'
  | 'referral_code_failed'
  // Bridge
  | 'bridge_initiated'
  | 'bridge_completed'
  | 'bridge_failed';

/**
 * Event properties for each event type
 * Enforce correct properties per event
 */
export interface TelemetryEventProps {
  // Lifecycle
  app_opened: undefined;
  app_backgrounded: undefined;
  app_foregrounded: undefined;

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
  order_form_opened: {
    market: string;
    side: 'buy' | 'sell';
  };
  order_submitted: {
    market: string;
    side: 'buy' | 'sell';
    orderType: 'limit' | 'market';
    leverage: number;
    size: number;
    reduceOnly?: boolean;
  };
  order_confirmed: {
    market: string;
    orderId: string;
    side: 'buy' | 'sell';
  };
  order_failed: {
    market: string;
    side: 'buy' | 'sell';
    errorCode?: string;
    reason?: string;
  };
  order_cancelled: {
    market: string;
    orderId: string;
  };

  // Trading - Position
  position_opened: {
    market: string;
    side: 'long' | 'short';
    size: number;
    leverage: number;
  };
  position_closed: {
    market: string;
    side: 'long' | 'short';
    pnl?: number;
  };
  position_modified: {
    market: string;
    action: 'tp_sl_set' | 'leverage_changed' | 'margin_added';
  };

  // Trading - Market
  market_selected: {
    market: string;
    fromMarket?: string;
  };
  leverage_changed: {
    market: string;
    fromLeverage: number;
    toLeverage: number;
  };

  // Agent
  agent_approved: {
    agentAddress: string;
  };
  agent_approval_failed: {
    reason?: string;
  };

  // Builder Fee
  builder_fee_set: {
    builderAddress: string;
  };
  builder_fee_failed: {
    reason?: string;
  };

  // Referral
  referral_code_applied: {
    code: string;
  };
  referral_code_failed: {
    code?: string;
    reason?: string;
  };

  // Bridge
  bridge_initiated: {
    amount: number;
    fromChain: string;
    toChain: string;
  };
  bridge_completed: {
    amount: number;
    txHash: string;
  };
  bridge_failed: {
    amount: number;
    reason?: string;
  };
}

// ============================================================================
// Screens - Type-safe screen tracking
// ============================================================================

/**
 * All screen names in the app
 */
export type ScreenName =
  | 'Home'
  | 'Trade'
  | 'Chart'
  | 'Settings'
  | 'Deposit'
  | 'Withdraw'
  | 'AgentStatus'
  | 'BuilderFeeStatus'
  | 'ReferralStatus'
  | 'Telemetry';

/**
 * Properties for each screen
 */
export interface ScreenProps {
  Home: undefined;
  Trade: {
    market?: string;
    tab?: 'order' | 'positions' | 'orders' | 'history';
  };
  Chart: {
    market: string;
  };
  Settings: undefined;
  Deposit: {
    method?: 'bridge' | 'transfer';
  };
  Withdraw: undefined;
  AgentStatus: undefined;
  BuilderFeeStatus: undefined;
  ReferralStatus: undefined;
  Telemetry: undefined;
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

// ============================================================================
// Telemetry State
// ============================================================================

/**
 * Telemetry state stored in the store
 */
export interface TelemetryState {
  /**
   * Current user address (wallet address)
   */
  userAddress: string | undefined;

  /**
   * Whether telemetry has been initialized
   */
  isInitialized: boolean;

  /**
   * Whether telemetry is enabled
   */
  isEnabled: boolean;

  /**
   * Set the user address
   */
  setUserAddress: (address: string | undefined) => void;

  /**
   * Set initialization status
   */
  setInitialized: (initialized: boolean) => void;

  /**
   * Set enabled status
   */
  setEnabled: (enabled: boolean) => void;
}
