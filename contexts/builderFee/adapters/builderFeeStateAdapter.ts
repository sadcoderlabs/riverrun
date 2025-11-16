/**
 * BuilderFeeStateAdapter
 *
 * Adapter that implements BuilderFeeStatePort using Zustand store.
 * This adapter encapsulates the state management implementation details.
 *
 * Design Pattern: Adapter (Hexagonal Architecture)
 * - Implements the domain port interface
 * - Adapts the Zustand store to the application layer's needs
 * - Allows use cases to update state without knowing about Zustand
 */

import type { BuilderFeeStatePort } from '../application/ports/BuilderFeeStatePort';
import type { BuilderFeeStatus } from '../ports/types';
import { builderFeeStateStore } from './builderFeeStateStore';

export class BuilderFeeStateAdapter implements BuilderFeeStatePort {
  updateStatus(status: BuilderFeeStatus): void {
    builderFeeStateStore.getState().updateStatus(status);
  }

  reset(): void {
    builderFeeStateStore.getState().reset();
  }
}
