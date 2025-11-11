/**
 * Provider Composer Utility
 *
 * Dynamically composes multiple React providers into a single component.
 * This approach is more flexible but slightly more complex than a static composition.
 *
 * @example
 * ```tsx
 * const AppProviders = composeProviders([
 *   WalletCompositionProvider,
 *   AgentCompositionProvider,
 *   BuilderFeeCompositionProvider,
 * ]);
 *
 * <AppProviders>
 *   <YourApp />
 * </AppProviders>
 * ```
 */

import React from 'react';

type Provider = React.ComponentType<{ children: React.ReactNode }>;

/**
 * Compose multiple providers into a single component
 *
 * Providers are composed from left to right (first provider wraps everything)
 *
 * @param providers - Array of provider components
 * @returns A composed provider component
 */
export function composeProviders(providers: Provider[]): Provider {
  return ({ children }: { children: React.ReactNode }) => {
    return providers.reduceRight(
      (acc, Provider) => <Provider>{acc}</Provider>,
      children as React.ReactElement,
    );
  };
}

/**
 * Alternative: Create a single provider component with explicit configuration
 *
 * @example
 * ```tsx
 * const AppProviders = createComposedProvider({
 *   providers: [
 *     WalletCompositionProvider,
 *     AgentCompositionProvider,
 *     BuilderFeeCompositionProvider,
 *   ],
 *   displayName: 'AppProviders',
 * });
 * ```
 */
export function createComposedProvider(config: {
  providers: Provider[];
  displayName?: string;
}): Provider {
  const ComposedProvider = composeProviders(config.providers);
  if (config.displayName) {
    ComposedProvider.displayName = config.displayName;
  }
  return ComposedProvider;
}
