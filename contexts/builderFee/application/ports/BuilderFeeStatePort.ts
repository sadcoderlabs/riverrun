/**
 * BuilderFeeStatePort
 *
 * Out port for managing builder fee state.
 * This port abstracts the state management layer, allowing the use cases
 * to update UI state without knowing implementation details (Zustand, Redux, etc.)
 *
 * Implementations should:
 * - Store current builder fee approval status
 * - Notify subscribers of status changes
 * - Provide reactive updates to UI components
 */

import type { BuilderFeeStatus } from '../../ports/types';

export interface BuilderFeeStatePort {
  /**
   * Update the builder fee approval status
   *
   * This triggers reactive updates to all UI components
   * subscribed to the builder fee state.
   *
   * @param status - The updated builder fee status
   */
  updateStatus(status: BuilderFeeStatus): void;

  /**
   * Reset state to initial values
   *
   * Used when wallet disconnects or context is cleared.
   */
  reset(): void;
}
