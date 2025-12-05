/**
 * useEnableDexAbstraction - Enable HIP-3 DEX abstraction for the account
 *
 * Provides a function to enable DEX abstraction when viewing HIP-3 assets,
 * allowing the API to return abstracted balance from main perps account.
 *
 * This is a one-time operation per account per session - once enabled,
 * all HIP-3 assets will show the correct abstracted balance.
 */

import { useContainer } from '@/app-internal/di';
import { useWallet } from '@/app-internal/features/wallet/hooks/useWallet';
import { useCallback, useState } from 'react';

interface UseEnableDexAbstractionResult {
  /** Whether DEX abstraction is currently being enabled */
  isEnabling: boolean;
  /** Function to enable DEX abstraction (no-op if already enabled) */
  enable: () => Promise<void>;
}

// Track enabled wallets across all hook instances (per session)
const enabledWallets = new Set<string>();

/**
 * Hook to enable HIP-3 DEX abstraction
 *
 * @returns Object containing isEnabling state and enable function
 *
 * @example
 * ```typescript
 * const { isEnabling, enable } = useEnableDexAbstraction();
 *
 * useEffect(() => {
 *   if (isHip3Asset) {
 *     enable();
 *   }
 * }, [isHip3Asset, enable]);
 * ```
 */
export function useEnableDexAbstraction(): UseEnableDexAbstractionResult {
  const { wallet } = useWallet();
  const tryGetAgentWallet = useContainer(c => c.tryGetAgentWalletUseCase);
  const orderExchange = useContainer(c => c.orderExchangePort);

  const [isEnabling, setIsEnabling] = useState(false);

  const enable = useCallback(async () => {
    // Skip if no wallet or already enabled for this wallet
    if (!wallet?.address || enabledWallets.has(wallet.address)) {
      return;
    }

    setIsEnabling(true);
    try {
      const { agentWallet } = await tryGetAgentWallet.execute();
      if (agentWallet) {
        await orderExchange.enableDexAbstraction(agentWallet.signer);
        enabledWallets.add(wallet.address);
      }
    } catch (error) {
      // Silent fail - user can still trade, just might see 0 balance initially
      console.warn('[useEnableDexAbstraction] Failed to enable:', error);
    } finally {
      setIsEnabling(false);
    }
  }, [wallet?.address, tryGetAgentWallet, orderExchange]);

  return { isEnabling, enable };
}
