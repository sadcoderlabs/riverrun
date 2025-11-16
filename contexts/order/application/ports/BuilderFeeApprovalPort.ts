/**
 * BuilderFeeApprovalPort
 *
 * Out port for order context to ensure builder fee approval before placing orders.
 * This port abstracts the builder fee approval logic from the order placement flow.
 *
 * Design Pattern: Port (Hexagonal Architecture)
 * - Order context defines what it needs (this interface)
 * - BuilderFee context provides the implementation (BuilderFeeApprovalAdapter)
 * - Allows order context to depend on abstraction, not concrete implementation
 */

import type { Signer } from 'ethers';

export interface BuilderFeeApprovalPort {
  /**
   * Ensure builder fee is approved before proceeding with order placement
   *
   * This method handles the complete approval flow:
   * 1. Check if already approved
   * 2. If not approved, request user confirmation
   * 3. If confirmed, execute approval transaction
   * 4. Return approval status
   *
   * @param walletAddress - Wallet address to check approval for
   * @param signer - Signer to execute approval transaction if needed
   * @returns Promise<boolean> - true if approved, false if user cancelled or failed
   */
  ensureApproval(walletAddress: string, signer: Signer): Promise<boolean>;
}
