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
   * Revoke builder fee approval by setting max fee to 0%
   *
   * This is mainly for development/testing purposes.
   * After revocation, the user will need to approve again for trading.
   *
   * @returns true if revocation succeeded, false otherwise
   */
  revokeBuilderFee(): Promise<boolean>;

  /**
   * Ensure that builder fee is approved before proceeding
   *
   * This method checks if approval exists with sufficient fee rate.
   * If not, it will NOT automatically prompt - that's the responsibility
   * of the presentation layer (React hook).
   *
   * @returns true if already approved with sufficient fee, false if approval needed
   */
  isApprovalSufficient(): Promise<boolean>;
}
