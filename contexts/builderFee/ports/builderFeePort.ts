/**
 * Builder Fee Port - Business Logic Interface
 *
 * This port defines the business operations for builder fee management.
 * It abstracts the core business logic from implementation details.
 */

import type { BuilderFeeStatus } from './types';

/**
 * Builder Fee Port Interface
 *
 * Provides operations for managing builder fee approval on Hyperliquid.
 */
export interface BuilderFeePort {
  /**
   * Check builder fee approval status for the current wallet
   *
   * @returns Builder fee status containing max approved fee and approval state
   */
  checkApprovalStatus(): Promise<BuilderFeeStatus>;

  /**
   * Approve builder fee for the configured builder
   *
   * This will request the user to approve a maximum builder fee.
   * The actual fee charged will be lower than the approved maximum.
   *
   * @returns true if approval succeeded, false otherwise
   */
  approveBuilderFee(): Promise<boolean>;

  /**
   * Ensure builder fee is approved before proceeding
   *
   * If not already approved, this will request approval from the user.
   * Used in trading flow to guarantee approval before placing orders.
   *
   * @returns true if approved (or already approved), false if user cancels or fails
   */
  ensureApproval(): Promise<boolean>;

  /**
   * Revoke builder fee approval by setting max fee to 0%
   *
   * This is mainly for development/testing purposes.
   * After revocation, the user will need to approve again for trading.
   *
   * @returns true if revocation succeeded, false otherwise
   */
  revokeBuilderFee(): Promise<boolean>;
}
