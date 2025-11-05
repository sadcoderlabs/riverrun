import { createContext, useContext, ReactNode } from 'react';
import { useWebData2, type UseWebData2Result } from '@/lib/hyperliquid/hooks/useWebData2';

/**
 * Context for sharing WebData2 across components
 *
 * This prevents re-fetching and re-subscribing to webData2 when switching markets,
 * since webData2 is account-level data that doesn't depend on the selected coin.
 */
const WebData2Context = createContext<UseWebData2Result | undefined>(undefined);

interface WebData2ProviderProps {
  children: ReactNode;
}

/**
 * Provider component that subscribes to webData2 once at the app level
 */
export function WebData2Provider({ children }: WebData2ProviderProps) {
  const webData2Result = useWebData2();

  return <WebData2Context.Provider value={webData2Result}>{children}</WebData2Context.Provider>;
}

/**
 * Hook to access webData2 from context
 *
 * This replaces direct usage of useWebData2() in components,
 * ensuring data is shared and not re-fetched on every market switch.
 *
 * @throws Error if used outside WebData2Provider
 */
export function useWebData2Context(): UseWebData2Result {
  const context = useContext(WebData2Context);
  if (context === undefined) {
    throw new Error('useWebData2Context must be used within a WebData2Provider');
  }
  return context;
}
