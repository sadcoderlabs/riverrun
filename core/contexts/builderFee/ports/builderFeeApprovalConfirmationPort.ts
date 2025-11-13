/**
 * Builder Fee Approval Confirmation Port
 *
 * Defines the contract for confirming builder fee approval with the user.
 * This is a domain-level interface that abstracts away UI implementation details.
 *
 * Design Pattern: Port (Hexagonal Architecture)
 * - Domain layer defines the interface
 * - Presentation layer provides implementations (Adapters)
 * - Service layer depends on this port, not on concrete implementations
 */

export interface BuilderFeeApprovalConfirmationPort {
  /**
   * Request user confirmation for builder fee approval
   *
   * This method should:
   * 1. Present the user with information about builder fee
   * 2. Show the fee percentage and maximum fee
   * 3. Allow the user to confirm or cancel
   * 4. Return the user's decision
   *
   * Implementation notes:
   * - Should be non-blocking (async)
   * - Should handle wallet-specific messaging (Reown vs Privy)
   * - Should provide clear information about fees
   *
   * @returns Promise<boolean> - true if user confirmed, false if cancelled
   *
   * @example
   * ```typescript
   * const confirmed = await approvalConfirmation.confirmApproval();
   * if (confirmed) {
   *   // Proceed with approval transaction
   * } else {
   *   // User cancelled
   * }
   * ```
   */
  confirmApproval(): Promise<boolean>;
}
