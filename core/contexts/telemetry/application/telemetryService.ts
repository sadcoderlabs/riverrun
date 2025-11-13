/**
 * Telemetry Service
 *
 * Core business logic for telemetry operations.
 * Implements the TelemetryPort interface and coordinates between
 * the telemetry store and Sentry adapter.
 */

import { activeWalletStore } from '../../wallet/adapters/activeWalletStore';
import type { SentryAdapter } from '../adapters/sentryAdapter';
import { telemetryStore } from '../adapters/telemetryStore';
import type { TelemetryPort } from '../ports/telemetryPort';
import type {
  BreadcrumbData,
  ErrorContext,
  TelemetrySeverity,
  TelemetryUser,
} from '../ports/types';

/**
 * Telemetry service implementation
 */
export class TelemetryService implements TelemetryPort {
  constructor(private readonly sentryAdapter: SentryAdapter) {
    // Subscribe to wallet changes to auto-identify users
    this.setupWalletSubscription();
  }

  /**
   * Initialize telemetry
   */
  async initialize(): Promise<void> {
    const state = telemetryStore.getState();

    // Mark as initialized
    state.setInitialized(true);

    // If we have a stored userId, identify the user
    if (state.userId) {
      await this.identifyUser(state.userId);
    }
  }

  /**
   * Identify user by wallet address or custom ID
   */
  async identifyUser(userId: string, user?: Partial<TelemetryUser>): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    // Update store
    telemetryStore.getState().setUserId(userId);

    // Identify in Sentry
    this.sentryAdapter.identifyUser(userId, user);

    // Add breadcrumb for user identification
    this.addBreadcrumb({
      category: 'user',
      message: 'User identified',
      level: 'info',
      data: { userId },
    });
  }

  /**
   * Clear user identification
   */
  async clearUser(): Promise<void> {
    // Update store
    telemetryStore.getState().setUserId(undefined);

    // Clear in Sentry
    this.sentryAdapter.clearUser();

    // Add breadcrumb
    this.addBreadcrumb({
      category: 'user',
      message: 'User cleared',
      level: 'info',
    });
  }

  /**
   * Capture an error with context
   */
  async captureError(error: Error | string, context?: ErrorContext): Promise<void> {
    if (!this.isEnabled()) {
      console.error('[Telemetry] Error captured (telemetry disabled):', error);
      return;
    }

    this.sentryAdapter.captureError(error, context);
  }

  /**
   * Capture a message with severity
   */
  async captureMessage(
    message: string,
    level: TelemetrySeverity = 'info',
    context?: ErrorContext,
  ): Promise<void> {
    if (!this.isEnabled()) {
      console.log(`[Telemetry] Message captured (telemetry disabled) [${level}]:`, message);
      return;
    }

    this.sentryAdapter.captureMessage(message, level, context);
  }

  /**
   * Add a breadcrumb
   */
  addBreadcrumb(breadcrumb: BreadcrumbData): void {
    if (!this.isEnabled()) {
      return;
    }

    this.sentryAdapter.addBreadcrumb(breadcrumb);
  }

  /**
   * Set global context
   */
  setContext(key: string, value: Record<string, unknown>): void {
    if (!this.isEnabled()) {
      return;
    }

    this.sentryAdapter.setContext(key, value);
  }

  /**
   * Set global tag
   */
  setTag(key: string, value: string): void {
    if (!this.isEnabled()) {
      return;
    }

    this.sentryAdapter.setTag(key, value);
  }

  /**
   * Enable or disable telemetry
   */
  async setEnabled(enabled: boolean): Promise<void> {
    telemetryStore.getState().setEnabled(enabled);

    // Add breadcrumb
    this.addBreadcrumb({
      category: 'system',
      message: `Telemetry ${enabled ? 'enabled' : 'disabled'}`,
      level: 'info',
    });
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return telemetryStore.getState().isEnabled;
  }

  /**
   * Setup subscription to wallet changes
   * Auto-identify users when wallet connects/disconnects
   */
  private setupWalletSubscription(): void {
    activeWalletStore.subscribe((state, prevState) => {
      const currentAddress = state.wallet?.address;
      const previousAddress = prevState.wallet?.address;

      // User connected wallet
      if (currentAddress && currentAddress !== previousAddress) {
        void this.identifyUser(currentAddress, {
          traits: {
            walletSource: state.wallet?.source,
          },
        });
      }

      // User disconnected wallet
      if (!currentAddress && previousAddress) {
        void this.clearUser();
      }
    });
  }
}
