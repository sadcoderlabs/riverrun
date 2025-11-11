/**
 * Position Context Hook
 *
 * Provides access to the Position Service via React Context.
 */

import { useContext } from 'react';
import { PositionContext } from './positionComposition';

/**
 * Hook to access Position Context
 *
 * @throws Error if used outside PositionCompositionProvider
 */
export function usePositionContext() {
  const context = useContext(PositionContext);

  if (!context) {
    throw new Error('usePositionContext must be used within PositionCompositionProvider');
  }

  return context;
}
