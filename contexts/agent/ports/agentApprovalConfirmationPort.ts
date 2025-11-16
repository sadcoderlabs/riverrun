/**
 * Agent Approval Confirmation Port
 *
 * Defines the contract for confirming agent approval with the user.
 * This is a domain-level interface that abstracts away UI implementation details.
 *
 * The implementation is provided by the presentation layer (e.g., Alert dialogs).
 */
export interface AgentApprovalConfirmationPort {
  /**
   * Request user confirmation for agent approval
   *
   * This method should:
   * 1. Present the user with information about agent approval
   * 2. Allow the user to confirm or cancel
   * 3. Return the user's decision
   *
   * The implementation should be wallet-aware (e.g., show different messages
   * for Reown vs Privy wallets), but the domain layer doesn't need to know
   * these details.
   *
   * @returns Promise<boolean> - true if user confirmed, false if cancelled
   */
  confirmApproval(): Promise<boolean>;
}
