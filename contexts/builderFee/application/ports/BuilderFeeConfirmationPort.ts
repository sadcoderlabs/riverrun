/**
 * BuilderFeeConfirmationPort
 *
 * Out port for requesting user confirmation before builder fee approval.
 * This port abstracts the UI confirmation mechanism (Alert, Modal, Toast, etc.)
 *
 * Implementations should:
 * - Present clear information about builder fees
 * - Show the fee percentage and maximum fee
 * - Handle wallet-specific messaging (Reown vs Privy)
 * - Allow user to confirm or cancel
 * - Return the user's decision
 *
 * Design Pattern: Port (Hexagonal Architecture)
 * - Application layer defines the interface
 * - Presentation layer provides implementations (Adapters)
 * - Use cases depend on this port, not on concrete implementations
 */

export interface BuilderFeeConfirmationPort {
  /**
   * Request user confirmation for builder fee approval
   *
   * This method should:
   * 1. Present the user with information about builder fee
   * 2. Show the fee percentage and maximum fee
   * 3. Allow the user to confirm or cancel
   * 4. Return the user's decision
   *
   * @returns Promise<boolean> - true if user confirmed, false if cancelled
   *
   * @example
   * ```typescript
   * const confirmed = await confirmation.confirmApproval();
   * if (confirmed) {
   *   // Proceed with approval transaction
   * } else {
   *   // User cancelled
   * }
   * ```
   */
  confirmApproval(): Promise<boolean>;
}
